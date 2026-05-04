package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/erp-crm-backend/internal/models"
)

type DashboardHandler struct{ db *sql.DB }

func NewDashboardHandler(db *sql.DB) *DashboardHandler { return &DashboardHandler{db: db} }

func (h *DashboardHandler) GetOverview(c *gin.Context) {
	overview := models.DashboardOverview{}

	// Stock counts by status
	rows, _ := h.db.Query(`SELECT status, COUNT(*) FROM stock_items GROUP BY status`)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err == nil {
				switch status {
				case "active":      overview.ActiveCount = count
				case "consignment": overview.ConsignmentCount = count
				case "repair":      overview.RepairCount = count
				case "review":      overview.ReviewCount = count
				case "sold":        overview.SoldCount = count
				case "inactive":    overview.InactiveCount = count
				}
			}
		}
	}

	// Total stock value
	_ = h.db.QueryRow(`SELECT COALESCE(SUM(cost_price),0) FROM stock_items WHERE status != 'sold'`).
		Scan(&overview.TotalStockValue)

	// Recent invoices
	invRows, _ := h.db.Query(`SELECT id, invoice_number, customer_name, total_amount, status, created_at
		FROM invoices ORDER BY created_at DESC LIMIT 5`)
	if invRows != nil {
		defer invRows.Close()
		for invRows.Next() {
			var inv models.Invoice
			if err := invRows.Scan(&inv.ID, &inv.InvoiceNumber, &inv.CustomerName, &inv.TotalAmount, &inv.Status, &inv.CreatedAt); err == nil {
				overview.RecentInvoices = append(overview.RecentInvoices, inv)
			}
		}
	}

	// Latest metal prices
	priceRows, _ := h.db.Query(`SELECT DISTINCT ON (metal, purity) metal, purity, price_per_gram, fetched_at
		FROM metal_prices ORDER BY metal, purity, fetched_at DESC`)
	if priceRows != nil {
		defer priceRows.Close()
		for priceRows.Next() {
			var mp models.MetalPrice
			if err := priceRows.Scan(&mp.Metal, &mp.Purity, &mp.PricePerGram, &mp.FetchedAt); err == nil {
				overview.MetalPrices = append(overview.MetalPrices, mp)
			}
		}
	}

	c.JSON(http.StatusOK, overview)
}

func (h *DashboardHandler) GetMetalPrices(c *gin.Context) {
	rows, err := h.db.Query(`SELECT DISTINCT ON (metal, purity) metal, purity, price_per_gram, fetched_at
		FROM metal_prices ORDER BY metal, purity, fetched_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	prices := []models.MetalPrice{}
	for rows.Next() {
		var mp models.MetalPrice
		if err := rows.Scan(&mp.Metal, &mp.Purity, &mp.PricePerGram, &mp.FetchedAt); err == nil {
			prices = append(prices, mp)
		}
	}
	c.JSON(http.StatusOK, prices)
}

func (h *DashboardHandler) GetAssetsInHand(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT s.metal_purity, SUM(s.carat_weight) as total_weight,
			COUNT(*) as item_count,
			mp.price_per_gram
		FROM stock_items s
		LEFT JOIN LATERAL (
			SELECT price_per_gram FROM metal_prices
			WHERE purity = s.metal_purity
			ORDER BY fetched_at DESC LIMIT 1
		) mp ON true
		WHERE s.status NOT IN ('sold','inactive') AND s.metal_purity IS NOT NULL AND s.carat_weight > 0
		GROUP BY s.metal_purity, mp.price_per_gram
		ORDER BY s.metal_purity`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	assets := []models.AssetsByMetal{}
	for rows.Next() {
		var a models.AssetsByMetal
		var pricePerGram *float64
		if err := rows.Scan(&a.Purity, &a.TotalWeight, &a.ItemCount, &pricePerGram); err == nil {
			if pricePerGram != nil {
				a.PricePerGram = *pricePerGram
				a.TotalValue = a.TotalWeight * a.PricePerGram
			}
			assets = append(assets, a)
		}
	}
	c.JSON(http.StatusOK, assets)
}
