# CaratFlow — Jewellery ERP · CRM

A full-stack ERP and CRM system for jewellery businesses. Manage stock, invoices, manufacturing jobs, consignments, and team members from one place.

---

## Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | Vercel (free) |
| Backend | Go 1.22, Fiber v2 | Railway (free tier) |
| Database | PostgreSQL | Supabase (free 500 MB) |
| Storage | Supabase Storage | Supabase (free 1 GB) |
| Auth | JWT (access 24 h + refresh 7 d) | — |
| Metal prices | metals-api.com (cron every 6 h) | — |

---

## Project Structure

```
erp-crm/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── db/db.go                # DB connection + migrations
│   │   ├── models/models.go        # All Go structs
│   │   ├── middleware/auth.go      # JWT + RBAC middleware
│   │   ├── handlers/               # Route handlers
│   │   │   ├── auth.go
│   │   │   ├── stock.go
│   │   │   ├── invoices.go
│   │   │   ├── dashboard.go
│   │   │   └── handlers.go         # Manufacturing, Consignment, Users, Roles, Labels
│   │   └── services/
│   │       └── metal_prices.go     # Metal price fetcher + cron
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── (auth)/login/           # Login page
    │   └── (dashboard)/
    │       ├── dashboard/          # Overview + metal prices
    │       ├── stock/              # List, add, detail, bulk-upload
    │       ├── invoices/           # List + create
    │       ├── manufacturing/      # Jobs
    │       ├── consignment/        # Out + returns
    │       ├── purchase/           # Supplier invoices
    │       ├── labels/             # Print queue
    │       ├── categories/[cat]/   # Per-category stock grid
    │       ├── users/              # User management
    │       └── roles/              # Role + permission management
    ├── components/layout/Sidebar.tsx
    ├── hooks/useAuth.tsx
    ├── lib/
    │   ├── api.ts                  # All API calls
    │   └── utils.ts                # Helpers (formatCurrency, etc.)
    ├── types/index.ts
    └── .env.example
```

---

## Quick Start (local dev)

### Prerequisites
- Go 1.22+
- Node.js 20+
- A [Supabase](https://supabase.com) project (free)

### 1. Clone

```bash
git clone https://github.com/yourorg/erp-crm.git
cd erp-crm
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, etc.

go mod tidy
go run ./cmd/server
# → Server running on http://localhost:8080
# → Migrations run automatically on first start
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080

npm install
npm run dev
# → App running on http://localhost:3000
```

### 4. First login

On first run, a default admin user is seeded:
```
Email:    admin@caratflow.com
Password: changeme123
```
Change the password immediately in **Users → Edit**.

---

## Deployment

### Backend → Railway

1. Push the `backend/` directory to a GitHub repo
2. Create a new Railway project → "Deploy from GitHub"
3. Railway auto-detects the `Dockerfile`
4. Add environment variables in Railway dashboard (copy from `.env.example`)
5. Set `DATABASE_URL` to your Supabase connection string

### Frontend → Vercel

1. Push the `frontend/` directory to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL (e.g. `https://your-app.railway.app`)
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## API Overview

All routes are prefixed `/api/v1/`. Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/login` | Login → access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/dashboard/overview` | Stats, metal prices, recent invoices |
| GET | `/dashboard/assets-in-hand` | Live metal value calculation |
| GET/POST | `/stock` | List / create stock items |
| GET/PUT/DELETE | `/stock/:id` | Get / update / delete |
| PATCH | `/stock/:id/status` | Update status only |
| POST | `/stock/bulk-upload` | CSV bulk import |
| GET | `/stock/export` | Export as CSV |
| GET/POST | `/invoices` | List / create invoices |
| PATCH | `/invoices/:id/pay` | Mark paid |
| GET/POST | `/manufacturing/jobs` | List / create jobs |
| GET/POST | `/consignment` | List / create out |
| POST | `/consignment/return` | Mark returned |
| GET/POST | `/users` | Admin: list / create |
| GET/POST | `/roles` | Admin: list / create |
| GET/POST | `/purchase` | Purchase invoices |
| GET/POST | `/labels` | Label queue |

---

## Database Schema (key tables)

- **stock_items** — SKU, category, stock_type (BD/CR/CC), carat_weight, metal_purity, cost/retail/sold prices, status (active/consignment/repair/review/sold/inactive)
- **invoices** — order_type (trade_order/pre_owned/bespoke), customer, line items, discount, status (due/paid/partial/cancelled)
- **manufacturing_jobs** — job_name, customer, due_date, cost_estimate, deposit, status
- **consignments** — sku, consignee, sent/returned dates, value
- **metal_prices** — historical gold/silver/platinum/palladium prices (fetched every 6h)
- **users + roles** — RBAC; default roles: admin, manager, staff, viewer

---

## Features

- 🔐 JWT auth with refresh tokens + role-based access control
- 📦 Full stock CRUD with auto-SKU generation (CF-YYYYMMDD-NNNN)
- 📋 Sales invoices with PDF generation
- 🔨 Manufacturing / bespoke job tracking
- 🔄 Consignment out & return workflow
- 💰 Live metal price calculator (gold 9k–24k, platinum, palladium, silver)
- 📈 Dashboard with assets-in-hand valuation
- 📤 CSV bulk upload + export
- 🏷️ Label print queue (Dymo / Zebra compatible)
- 🛒 Purchase invoice tracking
- 👥 User & role management with granular permissions
- 📂 Per-category stock views (rings, diamonds, gemstones, watches, mounts)

---

## Environment Variables Reference

### Backend

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default 8080) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `METALS_API_KEY` | metals-api.com API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## License

MIT
