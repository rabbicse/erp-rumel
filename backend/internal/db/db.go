package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func Connect() (*sql.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_PORT"),
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
		)
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("ping failed: %w", err)
	}
	return db, nil
}

func RunMigrations(db *sql.DB) error {
	migrations := []string{
		createRolesTable,
		createUsersTable,
		createStockItemsTable,
		createInvoicesTable,
		createInvoiceItemsTable,
		createManufacturingJobsTable,
		createConsignmentsTable,
		createMetalPricesTable,
		createPurchaseInvoicesTable,
		createLabelsTable,
		createAuditLogTable,
		insertDefaultRoles,
		seedAdminUser,
	}
	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration error: %w\nSQL: %s", err, m[:min(len(m), 80)])
		}
	}
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

const createRolesTable = `
CREATE TABLE IF NOT EXISTS roles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(50) UNIQUE NOT NULL,
	description TEXT DEFAULT '',
	permissions JSONB NOT NULL DEFAULT '[]',
	created_at TIMESTAMPTZ DEFAULT NOW()
);`

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	role_id UUID REFERENCES roles(id),
	is_active BOOLEAN DEFAULT true,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const createStockItemsTable = `
CREATE TABLE IF NOT EXISTS stock_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	sku VARCHAR(50) UNIQUE NOT NULL,
	product_name VARCHAR(255) NOT NULL,
	category VARCHAR(50) NOT NULL,
	stock_type VARCHAR(10) NOT NULL DEFAULT 'BD' CHECK (stock_type IN ('BD','CR','CC')),
	carat_weight DECIMAL(10,3),
	metal_purity VARCHAR(50),
	purchase_date DATE,
	cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
	retail_price DECIMAL(12,2),
	sold_price DECIMAL(12,2),
	status VARCHAR(30) NOT NULL DEFAULT 'active'
		CHECK (status IN ('active','consignment_out','in_repair','sold_out','inactive','quality_check')),
	customer_name VARCHAR(255),
	supplier_name VARCHAR(255),
	description TEXT,
	hallmark VARCHAR(100),
	stone_quality VARCHAR(100),
	serial_number VARCHAR(100),
	model_number VARCHAR(100),
	image_url TEXT,
	workshop_notes TEXT,
	created_by UUID REFERENCES users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_status ON stock_items(status);
CREATE INDEX IF NOT EXISTS idx_stock_category ON stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock_items(sku);`

const createInvoicesTable = `
CREATE TABLE IF NOT EXISTS invoices (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	invoice_number VARCHAR(20) UNIQUE NOT NULL,
	order_type VARCHAR(30) NOT NULL DEFAULT 'trade_order',
	customer_name VARCHAR(255) NOT NULL DEFAULT '',
	customer_email VARCHAR(255) NOT NULL DEFAULT '',
	customer_phone VARCHAR(50) NOT NULL DEFAULT '',
	total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
	discount DECIMAL(12,2) DEFAULT 0,
	due_amount DECIMAL(12,2) DEFAULT 0,
	status VARCHAR(20) NOT NULL DEFAULT 'due' CHECK (status IN ('due','paid','partial','cancelled')),
	due_date DATE,
	notes TEXT NOT NULL DEFAULT '',
	created_by UUID REFERENCES users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const createInvoiceItemsTable = `
CREATE TABLE IF NOT EXISTS invoice_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
	sku VARCHAR(50) NOT NULL DEFAULT '',
	description VARCHAR(255) NOT NULL DEFAULT '',
	quantity INTEGER NOT NULL DEFAULT 1,
	unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
	line_total DECIMAL(12,2) NOT NULL DEFAULT 0
);`

const createManufacturingJobsTable = `
CREATE TABLE IF NOT EXISTS manufacturing_jobs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	job_name VARCHAR(255) NOT NULL,
	sku VARCHAR(50),
	customer_name VARCHAR(255),
	customer_phone VARCHAR(50),
	description TEXT,
	due_date DATE,
	cost_estimate DECIMAL(12,2) DEFAULT 0,
	deposit_paid DECIMAL(12,2) DEFAULT 0,
	status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
	created_by UUID REFERENCES users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const createConsignmentsTable = `
CREATE TABLE IF NOT EXISTS consignments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	sku VARCHAR(50) NOT NULL,
	consignee_name VARCHAR(255) NOT NULL,
	consignee_contact VARCHAR(100),
	consignment_value DECIMAL(12,2) DEFAULT 0,
	sent_out_date DATE NOT NULL DEFAULT CURRENT_DATE,
	expected_return_date DATE,
	returned_date DATE,
	status VARCHAR(20) DEFAULT 'out' CHECK (status IN ('out','returned','sold')),
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const createMetalPricesTable = `
CREATE TABLE IF NOT EXISTS metal_prices (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	metal VARCHAR(50) NOT NULL,
	purity VARCHAR(20),
	price_per_gram DECIMAL(12,4) NOT NULL,
	currency VARCHAR(10) DEFAULT 'GBP',
	fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metal_prices_fetched ON metal_prices(fetched_at DESC);`

const createPurchaseInvoicesTable = `
CREATE TABLE IF NOT EXISTS purchase_invoices (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	invoice_number VARCHAR(30),
	supplier_name VARCHAR(255) NOT NULL,
	supplier_contact VARCHAR(255),
	total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
	paid_amount DECIMAL(12,2) DEFAULT 0,
	status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
	purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
	notes TEXT,
	created_by UUID REFERENCES users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const createAuditLogTable = `
CREATE TABLE IF NOT EXISTS audit_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID REFERENCES users(id),
	action VARCHAR(100) NOT NULL,
	entity_type VARCHAR(50),
	entity_id UUID,
	changes JSONB,
	ip_address VARCHAR(45),
	created_at TIMESTAMPTZ DEFAULT NOW()
);`

const insertDefaultRoles = `
INSERT INTO roles (name, description, permissions) VALUES
	('admin',   'Full system access',               '["all"]'),
	('manager', 'Manage stock, invoices and staff',  '["view_stock","manage_stock","view_invoices","manage_invoices","view_manufacturing","manage_manufacturing","view_consignment","manage_consignment","view_reports","bulk_upload","export_data","print_labels"]'),
	('staff',   'Day-to-day stock and sales',        '["view_stock","manage_stock","view_invoices","view_manufacturing","view_consignment","print_labels"]'),
	('viewer',  'Read-only access',                  '["view_stock","view_invoices","view_manufacturing","view_consignment"]')
ON CONFLICT (name) DO NOTHING;`

// bcrypt hash of "admin123" (cost 10)
const seedAdminUser = `
INSERT INTO users (name, email, password_hash, role_id)
SELECT
	'Admin',
	'admin@caratflow.com',
	'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lAsi',
	id
FROM roles WHERE name = 'admin'
LIMIT 1
ON CONFLICT (email) DO NOTHING;`

const createLabelsTable = `
CREATE TABLE IF NOT EXISTS labels (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	stock_item_id UUID UNIQUE REFERENCES stock_items(id) ON DELETE CASCADE,
	printed_at TIMESTAMPTZ,
	print_count INTEGER DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW()
);`
