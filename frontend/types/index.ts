// types/index.ts - Central type definitions

export type StockStatus = 'active' | 'consignment' | 'repair' | 'review' | 'sold' | 'inactive'

export type StockType = 'BD' | 'CR' | 'CC'

export type StockCategory =
  | 'ring'
  | 'bracelet'
  | 'necklace'
  | 'earrings'
  | 'chain'
  | 'brooch'
  | 'watch'
  | 'loose_diamond'
  | 'gemstone'
  | 'mount'
  | 'scrap'
  | 'other'

export interface StockItem {
  id: string
  sku: string
  product_name: string
  category: StockCategory
  stock_type: StockType
  carat_weight?: number
  metal_purity?: string
  purchase_date?: string
  cost_price: number
  retail_price?: number
  sold_price?: number
  status: StockStatus
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  supplier_name?: string
  description?: string
  hallmark?: string
  stone_quality?: string
  serial_number?: string
  model_number?: string
  image_url?: string
  workshop_notes?: string
  profit_loss?: number
  created_at: string
  updated_at: string
}

export interface StockListResponse {
  items: StockItem[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface StockListParams {
  search?: string
  category?: string
  status?: string
  stock_type?: string
  from_date?: string
  to_date?: string
  page?: number
  page_size?: number
  limit?: number
  sort_by?: string
  sort_dir?: 'ASC' | 'DESC'
}

// Invoice types
export type InvoiceStatus = 'due' | 'paid' | 'partial' | 'cancelled'
export type OrderType = 'trade_order' | 'pre_owned' | 'bespoke'

export interface InvoiceItem {
  id: string
  invoice_id: string
  stock_item_id?: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: string
  invoice_number: string
  order_type: OrderType
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  total_amount: number
  discount_amount: number
  due_amount: number
  status: InvoiceStatus
  invoice_date: string
  delivery_date?: string
  notes?: string
  mfg_sku?: string
  items?: InvoiceItem[]
  created_at: string
  updated_at: string
}

// Manufacturing types
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface ManufacturingJob {
  id: string
  job_name: string
  sku?: string
  customer_name?: string
  customer_phone?: string
  description?: string
  due_date?: string
  cost_estimate?: number
  deposit_paid?: number
  status: string
  created_at: string
  updated_at?: string
}

// Consignment types
export interface Consignment {
  id: string
  sku?: string
  consignee_name: string
  consignee_contact?: string
  consignment_value?: number
  sent_out_date?: string
  expected_return_date?: string
  returned_date?: string
  notes?: string
  status: string
  created_at: string
}

// Metal prices
export interface MetalPrice {
  id: string
  metal: string
  purity?: string
  price_per_gram: number
  currency: string
  fetched_at: string
}

// Dashboard
export interface DashboardOverview {
  active_count: number
  consignment_count: number
  repair_count: number
  review_count: number
  sold_count: number
  inactive_count: number
  total_stock_value: number
  metal_prices: MetalPrice[]
  recent_invoices: Invoice[]
}

export interface AssetsByMetal {
  metal_purity: string
  total_grams: number
  purchased_value: number
  current_value: number
}

// User & Auth types
export interface User {
  id: string
  name: string
  email: string
  role_id?: string
  role_name?: string
  is_active: boolean
  created_at: string
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  created_at?: string
}

export interface AuthResponse {
  token: string
  refresh_token: string
  user: User
}

// Form types
export interface CreateStockForm {
  product_name: string
  category: string
  stock_type: string
  carat_weight?: number
  metal_purity?: string
  purchase_date?: string
  cost_price: number
  retail_price?: number
  customer_name?: string
  supplier_name?: string
  description?: string
  hallmark?: string
  stone_quality?: string
  serial_number?: string
  model_number?: string
}

export interface CreateInvoiceForm {
  order_type: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  discount: number
  delivery_date?: string
  notes?: string
  items: {
    stock_item_id?: string
    description: string
    quantity: number
    unit_price: number
  }[]
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// API error
export interface APIError {
  error: string
  code?: number
}
