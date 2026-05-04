package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/yourorg/erp-crm-backend/internal/middleware"
	"github.com/yourorg/erp-crm-backend/internal/models"
)

// ── Manufacturing ────────────────────────────────────────────────────────────

type ManufacturingHandler struct{ db *sql.DB }

func NewManufacturingHandler(db *sql.DB) *ManufacturingHandler {
	return &ManufacturingHandler{db: db}
}

func (h *ManufacturingHandler) ListJobs(c *gin.Context) {
	search := c.Query("search")
	status := c.Query("status")

	where := "1=1"
	args := []interface{}{}
	idx := 1

	if search != "" {
		where += fmt.Sprintf(" AND (job_name ILIKE $%d OR customer_name ILIKE $%d OR sku ILIKE $%d)", idx, idx+1, idx+2)
		like := "%" + search + "%"
		args = append(args, like, like, like)
		idx += 3
	}
	if status != "" {
		where += fmt.Sprintf(" AND status=$%d", idx)
		args = append(args, status)
	}

	rows, err := h.db.Query(fmt.Sprintf(`SELECT id, job_name, sku, customer_name, customer_phone,
		description, due_date, cost_estimate, deposit_paid, status, created_at
		FROM manufacturing_jobs WHERE %s ORDER BY created_at DESC`, where), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	jobs := []models.ManufacturingJob{}
	for rows.Next() {
		var j models.ManufacturingJob
		if err := rows.Scan(&j.ID, &j.JobName, &j.SKU, &j.CustomerName, &j.CustomerPhone,
			&j.Description, &j.DueDate, &j.CostEstimate, &j.DepositPaid, &j.Status, &j.CreatedAt); err == nil {
			jobs = append(jobs, j)
		}
	}
	c.JSON(http.StatusOK, jobs)
}

func (h *ManufacturingHandler) CreateJob(c *gin.Context) {
	var req models.ManufacturingJob
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	var id string
	err := h.db.QueryRow(`INSERT INTO manufacturing_jobs
		(job_name, sku, customer_name, customer_phone, description, due_date,
		cost_estimate, deposit_paid, status, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9) RETURNING id`,
		req.JobName, req.SKU, req.CustomerName, req.CustomerPhone, req.Description,
		req.DueDate, req.CostEstimate, req.DepositPaid, userID).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *ManufacturingHandler) UpdateJob(c *gin.Context) {
	id := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if status, ok := req["status"].(string); ok {
		_, err := h.db.Exec(`UPDATE manufacturing_jobs SET status=$1, updated_at=NOW() WHERE id=$2`, status, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ── Consignment ──────────────────────────────────────────────────────────────

type ConsignmentHandler struct{ db *sql.DB }

func NewConsignmentHandler(db *sql.DB) *ConsignmentHandler {
	return &ConsignmentHandler{db: db}
}

func (h *ConsignmentHandler) List(c *gin.Context) {
	where := "1=1"
	args := []interface{}{}
	idx := 1

	if s := c.Query("status"); s != "" {
		where += fmt.Sprintf(" AND status=$%d", idx)
		args = append(args, s); idx++
	}
	if s := c.Query("search"); s != "" {
		where += fmt.Sprintf(" AND (sku ILIKE $%d OR consignee_name ILIKE $%d)", idx, idx+1)
		like := "%" + s + "%"
		args = append(args, like, like)
	}

	rows, err := h.db.Query(fmt.Sprintf(`SELECT id, sku, consignee_name, consignee_contact,
		consignment_value, sent_out_date, expected_return_date, returned_date, notes, status, created_at
		FROM consignments WHERE %s ORDER BY created_at DESC`, where), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := []models.Consignment{}
	for rows.Next() {
		var con models.Consignment
		if err := rows.Scan(&con.ID, &con.SKU, &con.ConsigneeName, &con.ConsigneeContact,
			&con.ConsignmentValue, &con.SentOutDate, &con.ExpectedReturnDate,
			&con.ReturnedDate, &con.Notes, &con.Status, &con.CreatedAt); err == nil {
			items = append(items, con)
		}
	}
	c.JSON(http.StatusOK, items)
}

func (h *ConsignmentHandler) SendOut(c *gin.Context) {
	var req models.Consignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, _ := h.db.Begin()
	var id string
	err := tx.QueryRow(`INSERT INTO consignments
		(sku, consignee_name, consignee_contact, consignment_value, sent_out_date,
		expected_return_date, notes, status)
		VALUES ($1,$2,$3,$4,NOW(),$5,$6,'out') RETURNING id`,
		req.SKU, req.ConsigneeName, req.ConsigneeContact, req.ConsignmentValue,
		req.ExpectedReturnDate, req.Notes).Scan(&id)
	if err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, _ = tx.Exec(`UPDATE stock_items SET status='consignment', updated_at=NOW() WHERE sku=$1`, req.SKU)
	_ = tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *ConsignmentHandler) Return(c *gin.Context) {
	var req struct{ SKU string `json:"sku"` }
	if err := c.ShouldBindJSON(&req); err != nil || req.SKU == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sku required"})
		return
	}
	tx, _ := h.db.Begin()
	_, err := tx.Exec(`UPDATE consignments SET status='returned', returned_date=NOW(), updated_at=NOW()
		WHERE sku=$1 AND status='out'`, req.SKU)
	if err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, _ = tx.Exec(`UPDATE stock_items SET status='active', updated_at=NOW() WHERE sku=$1`, req.SKU)
	_ = tx.Commit()
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ── Users ────────────────────────────────────────────────────────────────────

type UserHandler struct{ db *sql.DB }

func NewUserHandler(db *sql.DB) *UserHandler { return &UserHandler{db: db} }

func (h *UserHandler) List(c *gin.Context) {
	search := c.Query("search")
	where := "1=1"
	args := []interface{}{}
	if search != "" {
		where = "name ILIKE $1 OR email ILIKE $1"
		args = append(args, "%"+search+"%")
	}
	rows, err := h.db.Query(fmt.Sprintf(`SELECT id, name, email, role_id, is_active, created_at
		FROM users WHERE %s ORDER BY name`, where), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.RoleID, &u.IsActive, &u.CreatedAt); err == nil {
			users = append(users, u)
		}
	}
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) Create(c *gin.Context) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		RoleID   string `json:"role_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, email, password, role_id required"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "hash error"})
		return
	}
	var id string
	err = h.db.QueryRow(`INSERT INTO users (name, email, password_hash, role_id) VALUES ($1,$2,$3,$4) RETURNING id`,
		req.Name, req.Email, string(hash), req.RoleID).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		RoleID   string `json:"role_id"`
		IsActive *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		_, _ = h.db.Exec(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, string(hash), id)
	}
	_, err := h.db.Exec(`UPDATE users SET
		name=COALESCE(NULLIF($1,''), name),
		email=COALESCE(NULLIF($2,''), email),
		role_id=COALESCE(NULLIF($3,''), role_id),
		updated_at=NOW() WHERE id=$4`,
		req.Name, req.Email, req.RoleID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	_, err := h.db.Exec("DELETE FROM users WHERE id=$1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── Roles ────────────────────────────────────────────────────────────────────

type RoleHandler struct{ db *sql.DB }

func NewRoleHandler(db *sql.DB) *RoleHandler { return &RoleHandler{db: db} }

func (h *RoleHandler) List(c *gin.Context) {
	rows, err := h.db.Query(`SELECT id, name, description, permissions FROM roles ORDER BY name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	roles := []models.Role{}
	for rows.Next() {
		var r models.Role
		var permsJSON []byte
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &permsJSON); err == nil {
			r.Permissions = models.ParsePermissions(permsJSON)
			roles = append(roles, r)
		}
	}
	c.JSON(http.StatusOK, roles)
}

func (h *RoleHandler) Create(c *gin.Context) {
	var req models.Role
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name required"})
		return
	}
	perms, _ := models.MarshalPermissions(req.Permissions)
	var id string
	err := h.db.QueryRow(`INSERT INTO roles (name, description, permissions) VALUES ($1,$2,$3) RETURNING id`,
		req.Name, req.Description, perms).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "role already exists"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *RoleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.Role
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	perms, _ := models.MarshalPermissions(req.Permissions)
	_, err := h.db.Exec(`UPDATE roles SET
		name=COALESCE(NULLIF($1,''), name),
		description=COALESCE(NULLIF($2,''), description),
		permissions=COALESCE($3, permissions) WHERE id=$4`,
		req.Name, req.Description, perms, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ── Purchase ─────────────────────────────────────────────────────────────────

type PurchaseHandler struct{ db *sql.DB }

func NewPurchaseHandler(db *sql.DB) *PurchaseHandler { return &PurchaseHandler{db: db} }

func (h *PurchaseHandler) List(c *gin.Context) {
	search := c.Query("search")
	where := "1=1"
	args := []interface{}{}
	if search != "" {
		where = "(supplier_name ILIKE $1 OR invoice_number ILIKE $1)"
		args = append(args, "%"+search+"%")
	}
	rows, err := h.db.Query(fmt.Sprintf(`SELECT id, invoice_number, supplier_name, supplier_contact,
		total_amount, purchase_date, notes FROM purchase_invoices WHERE %s ORDER BY purchase_date DESC`, where), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := []gin.H{}
	for rows.Next() {
		var id, invNum, supp, contact, date, notes string
		var amount float64
		if err := rows.Scan(&id, &invNum, &supp, &contact, &amount, &date, &notes); err == nil {
			items = append(items, gin.H{
				"id": id, "invoice_number": invNum, "supplier_name": supp,
				"supplier_contact": contact, "total_amount": amount,
				"purchase_date": date, "notes": notes,
			})
		}
	}
	c.JSON(http.StatusOK, items)
}

func (h *PurchaseHandler) Create(c *gin.Context) {
	var req struct {
		SupplierName    string  `json:"supplier_name"`
		SupplierContact string  `json:"supplier_contact"`
		InvoiceNumber   string  `json:"invoice_number"`
		TotalAmount     float64 `json:"total_amount"`
		PurchaseDate    string  `json:"purchase_date"`
		Notes           string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.SupplierName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "supplier_name required"})
		return
	}
	userID := middleware.GetUserID(c)
	var id string
	err := h.db.QueryRow(`INSERT INTO purchase_invoices
		(invoice_number, supplier_name, supplier_contact, total_amount, purchase_date, notes, created_by)
		VALUES ($1,$2,$3,$4,COALESCE(NULLIF($5,'')::date, NOW()::date),$6,$7) RETURNING id`,
		req.InvoiceNumber, req.SupplierName, req.SupplierContact, req.TotalAmount,
		req.PurchaseDate, req.Notes, userID).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// ── Labels ───────────────────────────────────────────────────────────────────

type LabelHandler struct{ db *sql.DB }

func NewLabelHandler(db *sql.DB) *LabelHandler { return &LabelHandler{db: db} }

func (h *LabelHandler) List(c *gin.Context) {
	search := c.Query("search")
	where := "1=1"
	args := []interface{}{}
	if search != "" {
		where = "(s.sku ILIKE $1 OR s.product_name ILIKE $1)"
		args = append(args, "%"+search+"%")
	}
	rows, err := h.db.Query(fmt.Sprintf(`SELECT s.id, s.sku, s.product_name, s.metal_purity,
		s.carat_weight, s.retail_price,
		COALESCE(l.printed_at::text,'') as printed_at,
		COALESCE(l.print_count,0) as print_count
		FROM stock_items s
		LEFT JOIN labels l ON l.stock_item_id = s.id
		WHERE %s ORDER BY l.printed_at DESC NULLS LAST`, where), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := []gin.H{}
	for rows.Next() {
		var id, sku, name, purity, printedAt string
		var weight, retail float64
		var printCount int
		if err := rows.Scan(&id, &sku, &name, &purity, &weight, &retail, &printedAt, &printCount); err == nil {
			items = append(items, gin.H{
				"id": id, "sku": sku, "product_name": name, "metal_purity": purity,
				"carat_weight": weight, "retail_price": retail,
				"printed_at": printedAt, "print_count": printCount,
			})
		}
	}
	c.JSON(http.StatusOK, items)
}

func (h *LabelHandler) Print(c *gin.Context) {
	var req struct{ SKUs []string `json:"skus"` }
	if err := c.ShouldBindJSON(&req); err != nil || len(req.SKUs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "skus required"})
		return
	}
	for _, sku := range req.SKUs {
		_, _ = h.db.Exec(`INSERT INTO labels (stock_item_id, printed_at, print_count)
			SELECT id, NOW(), 1 FROM stock_items WHERE sku=$1
			ON CONFLICT (stock_item_id) DO UPDATE SET printed_at=NOW(), print_count=labels.print_count+1`, sku)
	}
	c.JSON(http.StatusOK, gin.H{"queued": len(req.SKUs)})
}
