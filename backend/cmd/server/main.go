package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"

	"github.com/yourorg/erp-crm-backend/internal/db"
	"github.com/yourorg/erp-crm-backend/internal/handlers"
	"github.com/yourorg/erp-crm-backend/internal/middleware"
	"github.com/yourorg/erp-crm-backend/internal/services"
)

func main() {
	_ = godotenv.Load()

	database, err := db.Connect()
	if err != nil {
		log.Fatalf("DB connect: %v", err)
	}
	defer database.Close()

	if err := db.RunMigrations(database); err != nil {
		log.Fatalf("Migrations: %v", err)
	}

	mps := services.NewMetalPriceService(database)
	c := cron.New()
	_, _ = c.AddFunc("@every 6h", func() { mps.FetchAndStore() })
	c.Start()
	defer c.Stop()
	go mps.FetchAndStore()

	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	if len(allowedOrigins) == 0 || allowedOrigins[0] == "" {
		allowedOrigins = []string{"http://localhost:3000"}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Disposition"},
		AllowCredentials: true,
	}))

	authH     := handlers.NewAuthHandler(database)
	stockH    := handlers.NewStockHandler(database)
	dashH     := handlers.NewDashboardHandler(database)
	invoiceH  := handlers.NewInvoiceHandler(database)
	mfgH      := handlers.NewManufacturingHandler(database)
	consH     := handlers.NewConsignmentHandler(database)
	userH     := handlers.NewUserHandler(database)
	roleH     := handlers.NewRoleHandler(database)
	purchaseH := handlers.NewPurchaseHandler(database)
	labelH    := handlers.NewLabelHandler(database)

	api := r.Group("/api/v1")
	api.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	api.POST("/auth/login", authH.Login)
	api.POST("/auth/refresh", authH.Refresh)

	auth := api.Group("/")
	auth.Use(middleware.JWTAuth())

	auth.GET("/dashboard/overview", dashH.GetOverview)
	auth.GET("/dashboard/metal-prices", dashH.GetMetalPrices)
	auth.GET("/dashboard/assets-in-hand", dashH.GetAssetsInHand)

	auth.GET("/stock", stockH.List)
	auth.POST("/stock", stockH.Create)
	auth.GET("/stock/export", stockH.Export)
	auth.POST("/stock/bulk-upload", stockH.BulkUpload)
	auth.GET("/stock/categories/:category", stockH.ListByCategory)
	auth.GET("/stock/:id", stockH.Get)
	auth.PUT("/stock/:id", stockH.Update)
	auth.DELETE("/stock/:id", stockH.Delete)
	auth.PATCH("/stock/:id/status", stockH.UpdateStatus)

	auth.GET("/invoices", invoiceH.List)
	auth.POST("/invoices", invoiceH.Create)
	auth.GET("/invoices/:id", invoiceH.Get)
	auth.PUT("/invoices/:id", invoiceH.Update)
	auth.PATCH("/invoices/:id/pay", invoiceH.MarkPaid)
	auth.GET("/invoices/:id/pdf", invoiceH.GeneratePDF)

	auth.GET("/manufacturing/jobs", mfgH.ListJobs)
	auth.POST("/manufacturing/jobs", mfgH.CreateJob)
	auth.PUT("/manufacturing/jobs/:id", mfgH.UpdateJob)

	auth.GET("/consignment", consH.List)
	auth.POST("/consignment/out", consH.SendOut)
	auth.POST("/consignment/return", consH.Return)

	admin := auth.Group("/")
	admin.Use(middleware.RequireRole("admin"))
	admin.GET("/users", userH.List)
	admin.POST("/users", userH.Create)
	admin.PUT("/users/:id", userH.Update)
	admin.DELETE("/users/:id", userH.Delete)
	admin.GET("/roles", roleH.List)
	admin.POST("/roles", roleH.Create)
	admin.PUT("/roles/:id", roleH.Update)

	auth.GET("/purchase", purchaseH.List)
	auth.POST("/purchase", purchaseH.Create)

	auth.GET("/labels", labelH.List)
	auth.POST("/labels/print", labelH.Print)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("CaratFlow API listening on :%s", port)
	if err := r.Run(fmt.Sprintf(":%s", port)); err != nil {
		log.Fatalf("Server: %v", err)
	}
}
