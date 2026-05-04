package handlers

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourorg/erp-crm-backend/internal/middleware"
	"github.com/yourorg/erp-crm-backend/internal/models"
)

type StockHandler struct{ db *sql.DB }

func NewStockHandler(db *sql.DB) *StockHandler { return &StockHandler{db: db} }

func (h *StockHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 20 }
	offset := (page - 1) * pageSize

	where := []string{"1=1"}
	args := []interface{}{}
	idx := 1

	if s := c.Query("search"); s != "" {
		where = append(where, fmt.Sprintf("(sku ILIKE $%d OR product_name ILIKE $%d OR customer_name ILIKE $%d)", idx, idx+1, idx+2))
		like := "%" + s + "%"
		args = append(args, like, like, like)
		idx += 3
	}
	if s := c.Query("status"); s != "" {
		where = append(where, fmt.Sprintf("status = $%d", idx))
		args = append(args, s)
		idx++
	}
	if s := c.Query("category"); s != "" {
		where = append(where, fmt.Sprintf("category = $%d", idx))
		args = append(args, s)
		idx++
	}
	if s := c.Query("stock_type"); s != "" {
		where = append(where, fmt.Sprintf("stock_type = $%d", idx))
		args = append(args, s)
		idx++
	}
	if f := c.Query("from_date"); f != "" {
		where = append(where, fmt.Sprintf("created_at >= $%d", idx))
		args = append(args, f)
		idx++
	}
	if t := c.Query("to_date"); t != "" {
		where = append(where, fmt.Sprintf("created_at <= $%d", idx))
		args = append(args, t)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	var total int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	_ = h.db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM stock_items WHERE %s", whereClause), countArgs...).Scan(&total)

	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	if sortDir != "asc" { sortDir = "desc" }
	allowedSorts := map[string]bool{"created_at": true, "sku": true, "product_name": true, "cost_price": true, "retail_price": true}
	if !allowedSorts[sortBy] { sortBy = "created_at" }

	args = append(args, pageSize, offset)
	query := fmt.Sprintf(`SELECT id, sku, product_name, category, stock_type, metal_purity,
		carat_weight, cost_price, retail_price, sold_price, status, customer_name,
		customer_phone, customer_email, supplier_name, image_url, description,
		created_at, updated_at
		FROM stock_items WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		whereClause, sortBy, sortDir, idx, idx+1)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := []models.StockItem{}
	for rows.Next() {
		var s models.StockItem
		if err := rows.Scan(&s.ID, &s.SKU, &s.ProductName, &s.Category, &s.StockType,
			&s.MetalPurity, &s.CaratWeight, &s.CostPrice, &s.RetailPrice, &s.SoldPrice,
			&s.Status, &s.CustomerName, &s.CustomerPhone, &s.CustomerEmail,
			&s.SupplierName, &s.ImageURL, &s.Description, &s.CreatedAt, &s.UpdatedAt); err == nil {
			items = append(items, s)
		}
	}

	totalPages := (total + pageSize - 1) / pageSize
	c.JSON(http.StatusOK, gin.H{
		"items": items, "total": total,
		"page": page, "page_size": pageSize, "total_pages": totalPages,
	})
}

func (h *StockHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var s models.StockItem
	err := h.db.QueryRow(`SELECT id, sku, product_name, category, stock_type, metal_purity,
		carat_weight, cost_price, retail_price, sold_price, status, customer_name,
		customer_phone, customer_email, supplier_name, image_url, description,
		created_at, updated_at FROM stock_items WHERE id = $1`, id).Scan(
		&s.ID, &s.SKU, &s.ProductName, &s.Category, &s.StockType, &s.MetalPurity,
		&s.CaratWeight, &s.CostPrice, &s.RetailPrice, &s.SoldPrice, &s.Status,
		&s.CustomerName, &s.CustomerPhone, &s.CustomerEmail, &s.SupplierName,
		&s.ImageURL, &s.Description, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *StockHandler) Create(c *gin.Context) {
	var req models.CreateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sku := generateSKU()
	userID := middleware.GetUserID(c)

	var id string
	err := h.db.QueryRow(`INSERT INTO stock_items
		(sku, product_name, category, stock_type, metal_purity, carat_weight,
		cost_price, retail_price, status, customer_name, customer_phone,
		customer_email, supplier_name, description, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12,$13,$14)
		RETURNING id`,
		sku, req.ProductName, req.Category, req.StockType, req.MetalPurity,
		req.CaratWeight, req.CostPrice, req.RetailPrice, req.CustomerName,
		req.CustomerPhone, req.CustomerEmail, req.SupplierName, req.Description, userID,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "sku": sku})
}

func (h *StockHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.db.Exec(`UPDATE stock_items SET
		product_name=COALESCE(NULLIF($1,''), product_name),
		category=COALESCE(NULLIF($2,''), category),
		metal_purity=COALESCE(NULLIF($3,''), metal_purity),
		carat_weight=COALESCE(NULLIF($4::text,'')::numeric, carat_weight),
		cost_price=COALESCE(NULLIF($5::text,'')::numeric, cost_price),
		retail_price=COALESCE(NULLIF($6::text,'')::numeric, retail_price),
		sold_price=COALESCE(NULLIF($7::text,'')::numeric, sold_price),
		customer_name=COALESCE(NULLIF($8,''), customer_name),
		description=COALESCE(NULLIF($9,''), description),
		updated_at=NOW()
		WHERE id=$10`,
		req.ProductName, req.Category, req.MetalPurity,
		fmt.Sprintf("%v", req.CaratWeight), fmt.Sprintf("%v", req.CostPrice),
		fmt.Sprintf("%v", req.RetailPrice), fmt.Sprintf("%v", req.SoldPrice),
		req.CustomerName, req.Description, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *StockHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	_, err := h.db.Exec("DELETE FROM stock_items WHERE id=$1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StockHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status    string  `json:"status"`
		SoldPrice float64 `json:"sold_price"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status required"})
		return
	}
	_, err := h.db.Exec(`UPDATE stock_items SET status=$1, sold_price=NULLIF($2,0), updated_at=NOW() WHERE id=$3`,
		req.Status, req.SoldPrice, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *StockHandler) ListByCategory(c *gin.Context) {
	c.Set("category", c.Param("category"))
	h.List(c)
}

func (h *StockHandler) BulkUpload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot read file"})
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid CSV"})
		return
	}
	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV has no data rows"})
		return
	}

	headers := map[string]int{}
	for i, h := range records[0] {
		headers[strings.ToLower(strings.TrimSpace(h))] = i
	}

	userID := middleware.GetUserID(c)
	imported := 0
	errs := []string{}

	for i, row := range records[1:] {
		get := func(key string) string {
			idx, ok := headers[key]
			if !ok || idx >= len(row) { return "" }
			return strings.TrimSpace(row[idx])
		}
		name := get("product_name")
		if name == "" {
			errs = append(errs, fmt.Sprintf("row %d: product_name required", i+2))
			continue
		}
		cost, _ := strconv.ParseFloat(get("cost_price"), 64)
		retail, _ := strconv.ParseFloat(get("retail_price"), 64)
		weight, _ := strconv.ParseFloat(get("carat_weight"), 64)
		sku := generateSKU()
		_, err := h.db.Exec(`INSERT INTO stock_items
			(sku, product_name, category, stock_type, metal_purity, carat_weight,
			cost_price, retail_price, status, supplier_name, description, created_by)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11)`,
			sku, name, get("category"), get("stock_type"), get("metal_purity"),
			weight, cost, retail, get("supplier_name"), get("description"), userID)
		if err != nil {
			errs = append(errs, fmt.Sprintf("row %d: %v", i+2, err))
		} else {
			imported++
		}
	}
	c.JSON(http.StatusOK, gin.H{"imported": imported, "errors": errs})
}

func (h *StockHandler) Export(c *gin.Context) {
	rows, err := h.db.Query(`SELECT sku, product_name, category, stock_type, metal_purity,
		carat_weight, cost_price, retail_price, sold_price, status, customer_name,
		supplier_name, created_at FROM stock_items ORDER BY created_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=stock-export.csv")

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"SKU", "Product Name", "Category", "Stock Type", "Metal Purity",
		"Carat Weight", "Cost Price", "Retail Price", "Sold Price", "Status",
		"Customer Name", "Supplier Name", "Created At"})

	for rows.Next() {
		var sku, name, cat, stype, purity, status, cust, supp, createdAt string
		var weight, cost, retail float64
		var sold *float64
		if err := rows.Scan(&sku, &name, &cat, &stype, &purity, &weight, &cost, &retail, &sold, &status, &cust, &supp, &createdAt); err == nil {
			soldStr := ""
			if sold != nil { soldStr = fmt.Sprintf("%.2f", *sold) }
			_ = w.Write([]string{sku, name, cat, stype, purity,
				fmt.Sprintf("%.2f", weight), fmt.Sprintf("%.2f", cost),
				fmt.Sprintf("%.2f", retail), soldStr, status, cust, supp, createdAt})
		}
	}
	w.Flush()
}

func generateSKU() string {
	now := time.Now()
	id := uuid.New().String()[:4]
	return fmt.Sprintf("CF-%s-%s", now.Format("20060102"), strings.ToUpper(id))
}
