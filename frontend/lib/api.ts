// lib/api.ts - Centralized API client

import axios, { AxiosError, AxiosInstance } from 'axios'
import {
  StockItem, StockListResponse, StockListParams,
  Invoice, InvoiceItem, CreateInvoiceForm,
  ManufacturingJob, Consignment, MetalPrice,
  DashboardOverview, AssetsByMetal,
  User, Role, AuthResponse,
  CreateStockForm, PaginatedResponse,
} from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/api/v1'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('erp_token')
    : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('erp_refresh_token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        localStorage.setItem('erp_token', data.token)
        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('erp_token')
        localStorage.removeItem('erp_refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),

  refresh: (refreshToken: string) =>
    api.post<{ token: string }>('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data),
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export const dashboardApi = {
  getOverview: () =>
    api.get<DashboardOverview>('/dashboard/overview').then(r => r.data),

  getMetalPrices: () =>
    api.get<MetalPrice[]>('/dashboard/metal-prices').then(r => r.data),

  getAssetsInHand: () =>
    api.get<AssetsByMetal[]>('/dashboard/assets-in-hand').then(r => r.data),
}

// ─── Stock ────────────────────────────────────────────────────────────────

export const stockApi = {
  list: (params?: StockListParams) =>
    api.get<StockListResponse>('/stock', { params }).then(r => r.data),

  get: (id: string) =>
    api.get<StockItem>(`/stock/${id}`).then(r => r.data),

  create: (data: CreateStockForm) =>
    api.post<{ id: string; sku: string }>('/stock', data).then(r => r.data),

  update: (id: string, data: Partial<CreateStockForm>) =>
    api.put(`/stock/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/stock/${id}`).then(r => r.data),

  updateStatus: (id: string, status: string, soldPrice?: number) =>
    api.patch(`/stock/${id}/status`, { status, sold_price: soldPrice }).then(r => r.data),

  // Categories
  listByCategory: (category: string, params?: StockListParams) =>
    api.get<StockListResponse>(`/stock/categories/${category}`, { params }).then(r => r.data),

  // Bulk operations
  bulkUpload: (file: File, stockType?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (stockType) form.append('stock_type', stockType)
    return api.post<{ imported: number; errors: string[] }>('/stock/bulk-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  exportCSV: () =>
    api.get('/stock/export', { responseType: 'blob' }).then(r => r.data),
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export const invoiceApi = {
  list: (params?: {
    page?: number; limit?: number; search?: string;
    status?: string; customer?: string; from_date?: string; to_date?: string
  }) => api.get<{ items: Invoice[]; total: number; total_pages: number }>('/invoices', { params }).then(r => r.data),

  get: (id: string) =>
    api.get<Invoice>(`/invoices/${id}`).then(r => r.data),

  create: (data: CreateInvoiceForm) =>
    api.post<{ id: string; invoice_number: string }>('/invoices', data).then(r => r.data),

  update: (id: string, data: Partial<CreateInvoiceForm>) =>
    api.put(`/invoices/${id}`, data).then(r => r.data),

  markPaid: (id: string) =>
    api.patch(`/invoices/${id}/pay`).then(r => r.data),
}

// ─── Manufacturing ────────────────────────────────────────────────────────

export const manufacturingApi = {
  list: (params?: { search?: string; status?: string }) =>
    api.get<ManufacturingJob[]>('/manufacturing/jobs', { params }).then(r => r.data),

  create: (data: Partial<ManufacturingJob>) =>
    api.post<ManufacturingJob>('/manufacturing/jobs', data).then(r => r.data),

  update: (id: string, data: Partial<ManufacturingJob>) =>
    api.put(`/manufacturing/jobs/${id}`, data).then(r => r.data),
}

// ─── Consignment ──────────────────────────────────────────────────────────

export const consignmentApi = {
  list: (params?: { status?: string; search?: string }) =>
    api.get<Consignment[]>('/consignment', { params }).then(r => r.data),

  createOut: (data: Partial<Consignment>) =>
    api.post('/consignment/out', data).then(r => r.data),

  return: (sku: string) =>
    api.post('/consignment/return', { sku }).then(r => r.data),
}

// ─── Users & Roles ────────────────────────────────────────────────────────

export const userApi = {
  list: (params?: { search?: string }) => api.get<User[]>('/users', { params }).then(r => r.data),
  create: (data: { name: string; email: string; password: string; role_id: string }) =>
    api.post<{ id: string }>('/users', data).then(r => r.data),
  update: (id: string, data: Partial<User & { password?: string }>) =>
    api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/users/${id}`).then(r => r.data),
}

export const roleApi = {
  list: () => api.get<Role[]>('/roles').then(r => r.data),
  create: (data: Partial<Role>) =>
    api.post<{ id: string }>('/roles', data).then(r => r.data),
  update: (id: string, data: Partial<Role>) =>
    api.put(`/roles/${id}`, data).then(r => r.data),
}

// ─── Purchase ─────────────────────────────────────────────────────────────

export const purchaseApi = {
  list: (params?: { search?: string }) => api.get('/purchase', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/purchase', data).then(r => r.data),
}

// ─── Labels ───────────────────────────────────────────────────────────────

export const labelApi = {
  list: (params?: { search?: string }) =>
    api.get('/labels', { params }).then(r => r.data),
  print: (skus: string[]) =>
    api.post('/labels/print', { skus }).then(r => r.data),
}

export default api
