package services

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/robfig/cron/v3"
)

type MetalPriceService struct {
	db *sql.DB
}

func NewMetalPriceService(db *sql.DB) *MetalPriceService {
	return &MetalPriceService{db: db}
}

func (s *MetalPriceService) StartCron() {
	c := cron.New()
	// Run every 6 hours
	c.AddFunc("0 */6 * * *", func() {
		if err := s.FetchAndStore(); err != nil {
			log.Printf("Metal price fetch error: %v", err)
		}
	})
	// Also run on startup
	go func() {
		time.Sleep(2 * time.Second)
		if err := s.FetchAndStore(); err != nil {
			log.Printf("Initial metal price fetch error: %v", err)
		}
	}()
	c.Start()
}

// FetchAndStore fetches metal prices from a free API and stores them
// Uses metals-api.com or goldapi.io (free tier)
func (s *MetalPriceService) FetchAndStore() error {
	apiKey := os.Getenv("METALS_API_KEY")
	if apiKey == "" {
		// Use hardcoded fallback for development
		return s.storeFallbackPrices()
	}

	url := "https://metals-api.com/api/latest?access_key=" + apiKey + "&base=GBP&symbols=XAU,XPT,XPD,XAG"
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return s.storeFallbackPrices()
	}
	defer resp.Body.Close()

	var result struct {
		Rates map[string]float64 `json:"rates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return s.storeFallbackPrices()
	}

	// Convert troy oz to grams (1 troy oz = 31.1035g)
	troyOzToGram := 31.1035

	metals := []struct {
		Symbol string
		Name   string
		Purity string
	}{
		{"XAU", "24k Gold", "999"},
		{"XPT", "999 Platinum", "999"},
		{"XPD", "999 Palladium", "999"},
		{"XAG", "999 Silver", "999"},
	}

	for _, m := range metals {
		if rate, ok := result.Rates[m.Symbol]; ok && rate > 0 {
			// API gives GBP per XAU (reciprocal of XAU/GBP)
			pricePerGram := (1.0 / rate) * troyOzToGram
			s.storePrice(m.Name, m.Purity, pricePerGram, "GBP")
		}
	}

	return nil
}

func (s *MetalPriceService) storeFallbackPrices() error {
	// Approximate GBP prices as of May 2026
	prices := []struct {
		Metal   string
		Purity  string
		PriceGm float64
	}{
		{"24k Gold", "999", 109.27},
		{"999 Platinum", "999", 46.81},
		{"999 Palladium", "999", 36.18},
		{"999 Silver", "999", 1.78},
		// Derived gold purities
		{"9k Gold", "375", 40.97},
		{"10k Gold", "417", 45.57},
		{"12k Gold", "500", 54.64},
		{"14k Gold", "585", 63.92},
		{"18k Gold", "750", 81.95},
		{"22k Gold", "916", 100.12},
	}
	for _, p := range prices {
		if err := s.storePrice(p.Metal, p.Purity, p.PriceGm, "GBP"); err != nil {
			return err
		}
	}
	return nil
}

func (s *MetalPriceService) storePrice(metal, purity string, pricePerGram float64, currency string) error {
	_, err := s.db.Exec(`
		INSERT INTO metal_prices (metal, purity, price_per_gram, currency)
		VALUES ($1, $2, $3, $4)
	`, metal, purity, pricePerGram, currency)
	return err
}
