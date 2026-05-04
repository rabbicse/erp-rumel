package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourorg/erp-crm-backend/internal/middleware"
	"github.com/yourorg/erp-crm-backend/internal/models"
)

type InvoiceHandler struct{ db *sql.DB }

func NewInvoiceHandler(db *sql.DB) *InvoiceHandler { return &InvoiceHandler{db: db} }

func (h *InvoiceHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 { page = 1 }
	if limit < 1 { limit = 20 }
	offset := (page - 1) * limit

	where := "1=1"
	args := []interface{}{}
	idx := 1

	if s := c.Query("status"); s != "" {
		where += fmt.Sprintf(" AND status=$%d", idx)
		args = append(args, s); idx++
	}
	if s := c.Query("search"); s != "" {
		where += fmt.Sprintf(" AND (invoice_number ILIKE $%d OR customer_name ILIKE $%d)", idx, idx+1)
		like := "%" + s + "%"
		args = append(args, like, like); idx += 2
	}

	var total int
	_ = h.db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM invoices WHERE %s", where), args...).Scan(&total)

	args = append(args, limit, offset)
	rows, err := h.db.Query(fmt.Sprintf(`SELECT id, invoice_number, customer_name, customer_email,
		order_type, total_amount, discount, due_amount, status, due_date, created_at
		FROM invoices WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, idx, idx+1), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	invoices := []models.Invoice{}
	for rows.Next() {
		var inv models.Invoice
		if err := rows.Scan(&inv.ID, &inv.InvoiceNumber, &inv.CustomerName, &inv.CustomerEmail,
			&inv.OrderType, &inv.TotalAmount, &inv.Discount, &inv.DueAmount,
			&inv.Status, &inv.DueDate, &inv.CreatedAt); err == nil {
			invoices = append(invoices, inv)
		}
	}
	c.JSON(http.StatusOK, gin.H{"items": invoices, "total": total, "page": page})
}

func (h *InvoiceHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var inv models.Invoice
	err := h.db.QueryRow(`SELECT id, invoice_number, customer_name, customer_email, customer_phone,
		order_type, total_amount, discount, due_amount, status, due_date, notes, created_at
		FROM invoices WHERE id=$1`, id).Scan(
		&inv.ID, &inv.InvoiceNumber, &inv.CustomerName, &inv.CustomerEmail, &inv.CustomerPhone,
		&inv.OrderType, &inv.TotalAmount, &inv.Discount, &inv.DueAmount, &inv.Status,
		&inv.DueDate, &inv.Notes, &inv.CreatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Line items
	itemRows, _ := h.db.Query(`SELECT id, sku, description, quantity, unit_price, line_total
		FROM invoice_items WHERE invoice_id=$1`, id)
	if itemRows != nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var item models.InvoiceItem
			if err := itemRows.Scan(&item.ID, &item.SKU, &item.Description, &item.Quantity, &item.UnitPrice, &item.LineTotal); err == nil {
				inv.Items = append(inv.Items, item)
			}
		}
	}
	c.JSON(http.StatusOK, inv)
}

func (h *InvoiceHandler) Create(c *gin.Context) {
	var req models.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	invNum := fmt.Sprintf("INV-%s-%s", models.DateStamp(), uuid.New().String()[:4])

	subtotal := 0.0
	for _, item := range req.Items {
		subtotal += float64(item.Quantity) * item.UnitPrice
	}
	total := subtotal - req.Discount
	if total < 0 { total = 0 }

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var invID string
	err = tx.QueryRow(`INSERT INTO invoices
		(invoice_number, customer_name, customer_email, customer_phone, order_type,
		total_amount, discount, due_amount, status, due_date, notes, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'due',$9,$10,$11) RETURNING id`,
		invNum, req.CustomerName, req.CustomerEmail, req.CustomerPhone, req.OrderType,
		total, req.Discount, total, req.DueDate, req.Notes, userID,
	).Scan(&invID)
	if err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, item := range req.Items {
		lineTotal := float64(item.Quantity) * item.UnitPrice
		_, err = tx.Exec(`INSERT INTO invoice_items (invoice_id, sku, description, quantity, unit_price, line_total)
			VALUES ($1,$2,$3,$4,$5,$6)`,
			invID, item.SKU, item.Description, item.Quantity, item.UnitPrice, lineTotal)
		if err != nil {
			_ = tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// Mark stock item as sold if SKU provided
		if item.SKU != "" {
			_, _ = tx.Exec(`UPDATE stock_items SET status='sold', sold_price=$1, updated_at=NOW() WHERE sku=$2`,
				item.UnitPrice, item.SKU)
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": invID, "invoice_number": invNum})
}

func (h *InvoiceHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.db.Exec(`UPDATE invoices SET notes=COALESCE($1,notes), due_date=COALESCE($2::date,due_date), updated_at=NOW() WHERE id=$3`,
		req["notes"], req["due_date"], id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *InvoiceHandler) MarkPaid(c *gin.Context) {
	id := c.Param("id")
	_, err := h.db.Exec(`UPDATE invoices SET status='paid', due_amount=0, updated_at=NOW() WHERE id=$1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *InvoiceHandler) GeneratePDF(c *gin.Context) {
	// TODO: integrate with a PDF library (e.g. go-pdf/fpdf)
	c.JSON(http.StatusNotImplemented, gin.H{"error": "PDF generation not yet implemented"})
}
