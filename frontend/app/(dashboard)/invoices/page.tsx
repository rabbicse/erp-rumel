'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceApi } from '@/lib/api'
import { Invoice, InvoiceStatus } from '@/types'
import Link from 'next/link'
import { Search, Plus, RotateCcw, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  due:       'bg-red-50 text-red-600',
  paid:      'bg-green-50 text-green-700',
  partial:   'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  due:       'Due',
  paid:      'Full Paid',
  partial:   'Partial',
  cancelled: 'Cancelled',
}

const ORDER_TYPES: Record<string, string> = {
  trade_order: 'Trade Order',
  pre_owned:   'PreOwned Order',
  bespoke:     'Bespoke Order',
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { page, search, status, fromDate, toDate }],
    queryFn: () => invoiceApi.list({ page, limit: 20, search, status, from_date: fromDate, to_date: toDate }),
  })

  const markPaid = useMutation({
    mutationFn: invoiceApi.markPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice marked as paid')
    },
  })

  const invoices = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/invoices/new" className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Create New Invoice
          </Link>
          <button className="btn-secondary flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Export Data to Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Invoices Listing</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Type here to search invoices</label>
            <input
              className="input text-sm"
              placeholder="Search in Invoice No, MFG, SKU"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setPage(1)}
            />
          </div>
          <div>
            <label className="label">From Estimated Delivery</label>
            <input type="date" className="input text-sm" onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="label">To Estimated Delivery</label>
            <input type="date" className="input text-sm" onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">All Customer / Suppliers</label>
            <select className="input text-sm" onChange={e => setStatus(e.target.value)}>
              <option value="">All Customer / Suppliers</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(1)} className="btn-primary flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          <button onClick={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setPage(1) }}
            className="btn-secondary flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">All Invoices Listing</h3>
            <p className="text-xs text-gray-400">All Stock Listing</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Total Number of Invoices: <span className="font-semibold">{total}</span></span>
            <button className="btn-secondary text-xs py-1">Print Invoice</button>
            <button className="btn-secondary text-xs py-1">Hot Merchant Invoice</button>
            <button className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">Select All</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th w-8"><input type="checkbox" className="rounded" /></th>
                <th className="th">Inv No</th>
                <th className="th">MFG Sku</th>
                <th className="th">Order Type</th>
                <th className="th">Inv Date</th>
                <th className="th">Delivery Date</th>
                <th className="th">Customer</th>
                <th className="th">Amount</th>
                <th className="th">Discount</th>
                <th className="th">Due Amount</th>
                <th className="th">Status</th>
                <th className="th">Return</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 13 }).map((_, j) => (
                      <td key={j} className="td">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={13} className="td text-center py-12 text-gray-400">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="tr-hover">
                    <td className="td"><input type="checkbox" className="rounded" /></td>
                    <td className="td">
                      <span className="font-semibold text-purple-600">{inv.invoice_number}</span>
                    </td>
                    <td className="td text-xs text-gray-500">{inv.mfg_sku ?? 'Not Available (MFG)'}</td>
                    <td className="td text-xs">{ORDER_TYPES[inv.order_type] ?? inv.order_type}</td>
                    <td className="td text-xs text-gray-500">{inv.invoice_date}</td>
                    <td className="td text-xs text-gray-500">{inv.delivery_date ?? '-'}</td>
                    <td className="td text-xs">{inv.customer_name ?? '-'}</td>
                    <td className="td">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">
                        £{inv.total_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="td text-xs">{inv.discount_amount > 0 ? inv.discount_amount : 0}</td>
                    <td className="td">
                      {inv.due_amount > 0 ? (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-semibold">
                          £{inv.due_amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">FULL PAID</span>
                      )}
                    </td>
                    <td className="td">
                      <span className={`badge ${STATUS_STYLES[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="td text-xs text-gray-400">-</td>
                    <td className="td">
                      <div className="flex items-center gap-1">
                        <Link href={`/invoices/${inv.id}`}
                          className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">
                          View
                        </Link>
                        {inv.status === 'due' && (
                          <button
                            onClick={() => markPaid.mutate(inv.id)}
                            className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total} invoices
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
