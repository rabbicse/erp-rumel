package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

// NullString wraps sql.NullString for JSON marshaling
type NullString struct {
	sql.NullString
}

func (ns NullString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	return []byte(`"` + ns.String + `"`), nil
}

// ─────────────────────────────────────────────
// User & Role
// ─────────────────────────────────────────────

type Role struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Permissions []string  `json:"permissions"`
	CreatedAt   time.Time `json:"created_at"`
}

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	RoleID       string    `json:"role_id"`
	RoleName     string    `json:"role_name,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CreateUserRequest struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	RoleID   string `json:"role_id" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}

// ─────────────────────────────────────────────
// Stock Item
// ─────────────────────────────────────────────

type StockItem struct {
	ID            string    `json:"id"`
	SKU           string    `json:"sku"`
	ProductName   string    `json:"product_name"`
	Category      string    `json:"category"`
	StockType     string    `json:"stock_type"`
	CaratWeight   *float64  `json:"carat_weight"`
	MetalPurity   *string   `json:"metal_purity"`
	PurchaseDate  *string   `json:"purchase_date"`
	CostPrice     float64   `json:"cost_price"`
	RetailPrice   *float64  `json:"retail_price"`
	SoldPrice     *float64  `json:"sold_price"`
	Status        string    `json:"status"`
	CustomerName  *string   `json:"customer_name"`
	CustomerPhone *string   `json:"customer_phone"`
	CustomerEmail *string   `json:"customer_email"`
	SupplierName  *string   `json:"supplier_name"`
	Description   *string   `json:"description"`
	Hallmark      *string   `json:"hallmark"`
	StoneQuality  *string   `json:"stone_quality"`
	SerialNumber  *string   `json:"serial_number"`
	ModelNumber   *string   `json:"model_number"`
	ImageURL      *string   `json:"image_url"`
	WorkshopNotes *string   `json:"workshop_notes"`
	CreatedBy     *string   `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	ProfitLoss    *float64  `json:"profit_loss,omitempty"`
}

type CreateStockRequest struct {
	ProductName  string   `json:"product_name"`
	Category     string   `json:"category"`
	StockType    string   `json:"stock_type"`
	CaratWeight  *float64 `json:"carat_weight"`
	MetalPurity  *string  `json:"metal_purity"`
	PurchaseDate *string  `json:"purchase_date"`
	CostPrice    float64  `json:"cost_price"`
	RetailPrice  *float64 `json:"retail_price"`
	CustomerName *string  `json:"customer_name"`
	CustomerPhone *string `json:"customer_phone"`
	CustomerEmail *string `json:"customer_email"`
	SupplierName *string  `json:"supplier_name"`
	Description  *string  `json:"description"`
	Hallmark     *string  `json:"hallmark"`
	StoneQuality *string  `json:"stone_quality"`
	SerialNumber *string  `json:"serial_number"`
	ModelNumber  *string  `json:"model_number"`
}

type UpdateStockRequest struct {
	ProductName   string   `json:"product_name"`
	Category      string   `json:"category"`
	MetalPurity   string   `json:"metal_purity"`
	CaratWeight   float64  `json:"carat_weight"`
	CostPrice     float64  `json:"cost_price"`
	RetailPrice   float64  `json:"retail_price"`
	SoldPrice     float64  `json:"sold_price"`
	CustomerName  string   `json:"customer_name"`
	CustomerPhone string   `json:"customer_phone"`
	CustomerEmail string   `json:"customer_email"`
	SupplierName  string   `json:"supplier_name"`
	Description   string   `json:"description"`
}

type StockListParams struct {
	Search      string `query:"search"`
	Category    string `query:"category"`
	Status      string `query:"status"`
	StockType   string `query:"stock_type"`
	FromDate    string `query:"from_date"`
	ToDate      string `query:"to_date"`
	Hallmark    string `query:"hallmark"`
	StoneQuality string `query:"stone_quality"`
	Page        int    `query:"page"`
	Limit       int    `query:"limit"`
	SortBy      string `query:"sort_by"`
	SortDir     string `query:"sort_dir"`
}

type StockListResponse struct {
	Items      []StockItem `json:"items"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

// ─────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────

type Invoice struct {
	ID            string        `json:"id"`
	InvoiceNumber string        `json:"invoice_number"`
	OrderType     string        `json:"order_type"`
	CustomerName  string        `json:"customer_name"`
	CustomerEmail string        `json:"customer_email"`
	CustomerPhone string        `json:"customer_phone"`
	TotalAmount   float64       `json:"total_amount"`
	Discount      float64       `json:"discount"`
	DueAmount     float64       `json:"due_amount"`
	Status        string        `json:"status"`
	DueDate       string        `json:"due_date"`
	Notes         string        `json:"notes"`
	Items         []InvoiceItem `json:"items,omitempty"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type InvoiceItem struct {
	ID          string  `json:"id"`
	InvoiceID   string  `json:"invoice_id"`
	SKU         string  `json:"sku"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	LineTotal   float64 `json:"line_total"`
}

type CreateInvoiceRequest struct {
	OrderType     string               `json:"order_type"`
	CustomerName  string               `json:"customer_name"`
	CustomerEmail string               `json:"customer_email"`
	CustomerPhone string               `json:"customer_phone"`
	Discount      float64              `json:"discount"`
	DueDate       string               `json:"due_date"`
	Notes         string               `json:"notes"`
	Items         []CreateInvoiceItem  `json:"items"`
}

type CreateInvoiceItem struct {
	SKU         string  `json:"sku"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
}

// ─────────────────────────────────────────────
// Manufacturing
// ─────────────────────────────────────────────

type ManufacturingJob struct {
	ID             string    `json:"id"`
	JobName        string    `json:"job_name"`
	SKU            string    `json:"sku"`
	CustomerName   string    `json:"customer_name"`
	CustomerPhone  string    `json:"customer_phone"`
	Description    string    `json:"description"`
	DueDate        string    `json:"due_date"`
	CostEstimate   float64   `json:"cost_estimate"`
	DepositPaid    float64   `json:"deposit_paid"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ─────────────────────────────────────────────
// Consignment
// ─────────────────────────────────────────────

type Consignment struct {
	ID                 string    `json:"id"`
	SKU                string    `json:"sku"`
	ConsigneeName      string    `json:"consignee_name"`
	ConsigneeContact   string    `json:"consignee_contact"`
	ConsignmentValue   float64   `json:"consignment_value"`
	SentOutDate        string    `json:"sent_out_date"`
	ExpectedReturnDate string    `json:"expected_return_date"`
	ReturnedDate       string    `json:"returned_date"`
	Notes              string    `json:"notes"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
}

// ─────────────────────────────────────────────
// Metal Prices
// ─────────────────────────────────────────────

type MetalPrice struct {
	ID           string    `json:"id"`
	Metal        string    `json:"metal"`
	Purity       *string   `json:"purity"`
	PricePerGram float64   `json:"price_per_gram"`
	Currency     string    `json:"currency"`
	FetchedAt    time.Time `json:"fetched_at"`
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

type DashboardOverview struct {
	ActiveCount      int          `json:"active_count"`
	ConsignmentCount int          `json:"consignment_count"`
	RepairCount      int          `json:"repair_count"`
	ReviewCount      int          `json:"review_count"`
	SoldCount        int          `json:"sold_count"`
	InactiveCount    int          `json:"inactive_count"`
	TotalStockValue  float64      `json:"total_stock_value"`
	MetalPrices      []MetalPrice `json:"metal_prices"`
	RecentInvoices   []Invoice    `json:"recent_invoices"`
}

type AssetsByMetal struct {
	Purity       string  `json:"purity"`
	TotalWeight  float64 `json:"total_weight"`
	ItemCount    int     `json:"item_count"`
	PricePerGram float64 `json:"price_per_gram"`
	TotalValue   float64 `json:"total_value"`
}

// ─────────────────────────────────────────────
// Pagination helpers
// ─────────────────────────────────────────────

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

// ─────────────────────────────────────────────
// Utility helpers used by handlers
// ─────────────────────────────────────────────

func DateStamp() string {
	return time.Now().Format("20060102")
}

func ParsePermissions(data []byte) []string {
	if data == nil {
		return []string{}
	}
	var perms []string
	_ = json.Unmarshal(data, &perms)
	return perms
}

func MarshalPermissions(perms []string) ([]byte, error) {
	if perms == nil {
		perms = []string{}
	}
	return json.Marshal(perms)
}
