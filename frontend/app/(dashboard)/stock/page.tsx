"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { stockApi } from "@/lib/api"
import {
  Plus, Download, Search, RotateCcw, ChevronDown,
  Loader2, Pencil, FileText, Tag, Wrench,
  ArrowLeftRight, Trash2, X, CheckSquare
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { StockItem } from "@/types"

const STATUS_BADGE: Record<string, string> = {
  active: "badge badge-active",
  consignment: "badge badge-consignment-out",
  repair: "badge badge-repair",
  review: "badge badge-review",
  sold: "badge badge-sold",
  inactive: "badge badge-inactive",
}

const STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE", consignment: "CONSIGNMENT OUT",
  repair: "REPAIR", review: "REVIEW", sold: "SOLD", inactive: "INACTIVE",
}

function RowMenu({ item, onClose, onView }: { item: StockItem; onClose: () => void; onView: () => void }) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: () => stockApi.delete(item.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock"] }); toast.success("Deleted"); onClose() },
  })
  return (
    <div className="absolute right-full top-0 mr-1 z-50 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 text-sm">
      <button onClick={() => { onView(); onClose() }} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700"><Pencil size={13} className="text-gray-400" /> Edit</button>
      <Link href={"/invoices/new?sku=" + item.sku} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700"><FileText size={13} className="text-gray-400" /> Create Invoice</Link>
      <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700"><Tag size={13} className="text-gray-400" /> Print Tag</button>
      <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700"><Wrench size={13} className="text-gray-400" /> Workshop Tag</button>
      <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700"><ArrowLeftRight size={13} className="text-gray-400" /> Move To BD</button>
      <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700"><RotateCcw size={13} className="text-gray-400" /> Item Status Journey</button>
      <button onClick={() => del.mutate()} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-50 text-red-600"><Trash2 size={13} /> Delete Item</button>
    </div>
  )
}

function QuickViewModal({ item, onClose }: { item: StockItem; onClose: () => void }) {
  const [tab, setTab] = useState("center")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className={STATUS_BADGE[item.status] ?? "badge badge-active"}>{STATUS_LABEL[item.status] ?? item.status}</span>
            <div>
              <h2 className="font-bold text-gray-900">{item.product_name || "Unnamed"}</h2>
              <p className="text-xs text-gray-400">SKU: {item.sku} • {item.metal_purity} • {item.carat_weight}gm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={"/invoices/new?sku=" + item.sku} className="btn-secondary text-xs"><FileText size={13} /> Create Invoice</Link>
            <Link href={"/stock/" + item.id} className="btn-primary text-xs"><Pencil size={13} /> Edit Item</Link>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={16} /></button>
          </div>
        </div>
        <div className="p-5 grid grid-cols-5 gap-5">
          <div className="col-span-2">
            <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center border border-gray-100 overflow-hidden">
              {item.image_url
                ? <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                : <span className="text-5xl">&#x1F48D;</span>
              }
            </div>
          </div>
          <div className="col-span-3 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "Main Price", v: "£" + (item.retail_price?.toFixed(0) ?? "0"), sub: "Target selling price", cls: "text-brand-700" },
                { l: "Cost Price", v: "£" + (item.cost_price?.toFixed(2) ?? "0.00"), sub: "Booked cost in system", cls: "text-gray-800" },
                { l: "Retail Price (RRP)", v: "£" + (item.retail_price?.toFixed(0) ?? "0"), sub: "Online retail label", cls: "text-gray-800" },
              ].map(f => (
                <div key={f.l} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">{f.l}</p>
                  <p className={"text-xl font-bold mt-1 " + f.cls}>{f.v}</p>
                  <p className="text-[10px] text-gray-400">{f.sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { l: "Purchase Date", v: item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : "—", cls: "text-brand-600" },
                { l: "Metal Type", v: item.metal_purity ?? "—", cls: "text-brand-600" },
                { l: "Metal Purity", v: item.metal_purity ?? "—", cls: "text-brand-600" },
                { l: "Total Carat Weight", v: item.carat_weight ? item.carat_weight + "g" : "—", cls: "" },
                { l: "Buying From", v: item.customer_name ?? item.supplier_name ?? "—", cls: "text-brand-600" },
                { l: "Paid By", v: "—", cls: "" },
              ].map(f => (
                <div key={f.l}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{f.l}</p>
                  <p className={"text-sm font-medium mt-0.5 " + (f.cls || "text-gray-700")}>{f.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5">
          <div className="flex gap-2 border-b border-gray-100">
            {[["center","&#x1F48E; Center Stone Details"],["side","&#x1F537; Side Stone Details"],["sold","&#x1F3F7;&#xFE0F; Sold Details"]].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={"px-4 py-2 text-xs font-medium rounded-t-lg border transition-colors " + (tab === t ? "border-brand-200 bg-brand-50 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700")}
                dangerouslySetInnerHTML={{ __html: l }} />
            ))}
          </div>
          <table className="w-full text-xs py-4 mt-4 mb-2">
            <thead>
              <tr className="border-b border-gray-100">
                {["Stone Type","Stone Carat Weight","Stone Colour","Stone Clarity","Stone Certificate","Stone Certificate ID"].map(h => (
                  <th key={h} className="text-left text-gray-400 font-semibold pb-2 uppercase tracking-wider pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody><tr><td colSpan={6} className="py-4 text-gray-400 text-center">—</td></tr></tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>SKU: <strong className="text-gray-600">{item.sku}</strong></span>
            <span>Purchase: <strong className="text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : "—"}</strong></span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["Print Tag","Workshop Tag","Move To BD","Item Status Journey"].map(l => (
              <button key={l} className="btn-secondary text-xs">{l}</button>
            ))}
            <button className="btn text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">Delete</button>
            <button onClick={onClose} className="btn-secondary text-xs">✕ Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StockPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [barcodeSearch, setBarcodeSearch] = useState("")
  const [stockType, setStockType] = useState("")
  const [status, setStatus] = useState("")
  const [category, setCategory] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [quickView, setQuickView] = useState<StockItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["stock", page, search, stockType, status, category, fromDate, toDate],
    queryFn: () => stockApi.list({ page, page_size: 20, search, stock_type: stockType, status, category, from_date: fromDate, to_date: toDate }),
  })

  const items: StockItem[] = data?.items ?? []
  const total: number = data?.total ?? 0
  const totalPages: number = data?.total_pages ?? 1

  const BULK = ["Print Tag","Workshop Tag","In Repair","Activate","Deactivate","Consignment Out","Sold Out","Quality Check","Create Invoice"]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">ALL STOCKS MANAGER</h1>
        <p className="page-subtitle">iStock Admin Panel</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-700 tracking-wide">STOCKS LISTING</h2>
          <div className="flex items-center gap-2">
            <Link href="/stock/add" className="btn-primary text-xs"><Plus size={13} /> Add New</Link>
            <button className="btn-secondary text-xs"><Download size={13} /> Export Data to Excel</button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
          <div>
            <p className="label">Scan here for any product to search:</p>
            <input type="text" placeholder="Note : Above filter you can Search only via Barcode Scanner" value={barcodeSearch} onChange={e => setBarcodeSearch(e.target.value)} className="input" />
          </div>
          <div>
            <p className="label">From Date</p>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" />
          </div>
          <div>
            <p className="label">To Date</p>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2 items-end">
            <button onClick={() => setPage(1)} className="btn-primary text-xs"><Search size={13} /> Search</button>
            <button onClick={() => { setSearch(""); setStockType(""); setStatus(""); setCategory(""); setFromDate(""); setToDate("") }} className="btn-secondary text-xs"><RotateCcw size={13} /> Reset</button>
            <button className="btn-secondary text-xs">Most Recent</button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
          <div>
            <p className="label">Type here for any product to search:</p>
            <input type="text" placeholder="Search In Name, SKU, Carat Weight, Model Number, Serial Number and Description" value={search} onChange={e => setSearch(e.target.value)} className="input" />
          </div>
          <div>
            <p className="label">Stock Type</p>
            <select value={stockType} onChange={e => setStockType(e.target.value)} className="input">
              <option value="">All Stock</option>
              <option value="BD">BD (Bank)</option>
              <option value="CR">CR (Cash)</option>
              <option value="CC">CC (Crypto)</option>
            </select>
          </div>
          <div>
            <p className="label">Status</p>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="consignment">Consignment Out</option>
              <option value="repair">In Repair</option>
              <option value="review">In Review</option>
              <option value="sold">Sold</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <p className="label">Category</p>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              <option value="">All Category</option>
              <option value="rings">Rings</option>
              <option value="diamonds">Diamonds</option>
              <option value="gemstones">Gemstones</option>
              <option value="mounts">Mounts</option>
              <option value="watches">Watches</option>
            </select>
          </div>
        </div>
        <div className="text-xs">
          <button className="text-brand-600 hover:underline font-medium">More Filters</button>
          <span className="text-gray-400 ml-2">Stone quality, hallmark, invoice method &amp; more</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-gray-700">ALL STOCK</h2>
            <p className="text-xs text-gray-400">iStock All Stock Listing</p>
          </div>
          <p className="text-xs text-gray-500">Total Number of Items: <strong>{total}</strong></p>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
          {BULK.map(a => (
            <button key={a} className="px-3 py-1.5 rounded-full bg-brand-700 hover:bg-brand-800 text-white text-xs font-medium">{a}</button>
          ))}
          <button onClick={() => selected.size === items.length ? setSelected(new Set()) : setSelected(new Set(items.map(i => i.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 ml-auto">
            <CheckSquare size={13} /> Select All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-8"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={() => selected.size === items.length ? setSelected(new Set()) : setSelected(new Set(items.map(i => i.id)))} className="rounded" /></th>
                <th>Status</th><th>SKU</th><th>Product Name</th><th>Purchase Date</th>
                <th>Carat Weight</th><th>Category</th><th>Customer</th>
                <th>Cost Price</th><th>Retail Price</th><th>Sold Price</th>
                <th>Calculation of profit</th><th>Image</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={14} className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></td></tr>
              ) : !items.length ? (
                <tr><td colSpan={14} className="text-center py-16 text-gray-400">No stock items found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td><input type="checkbox" checked={selected.has(item.id)} onChange={() => { const s = new Set(selected); s.has(item.id) ? s.delete(item.id) : s.add(item.id); setSelected(s) }} className="rounded" /></td>
                  <td><span className={STATUS_BADGE[item.status] ?? "badge badge-active"}>{STATUS_LABEL[item.status] ?? item.status}</span></td>
                  <td><span className="font-mono text-xs text-gray-600">{item.sku}</span></td>
                  <td className="max-w-36"><p className="truncate text-gray-800 font-medium text-xs">{item.product_name}</p></td>
                  <td className="text-gray-500 text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="text-gray-600 text-xs">{item.carat_weight ? item.carat_weight + "g" : "—"}</td>
                  <td className="text-gray-600 text-xs capitalize">{item.category || "—"}</td>
                  <td className="text-gray-600 text-xs">{item.customer_name || "CUSTOMER"}</td>
                  <td className="text-xs font-medium">£ {item.cost_price?.toFixed(2) ?? "0.00"}</td>
                  <td className="text-xs font-medium">£ {item.retail_price?.toFixed(0) ?? "0"}</td>
                  <td className="text-gray-400 text-xs">—</td>
                  <td className="text-gray-400 text-xs">—</td>
                  <td>
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                      : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">&#x1F48D;</div>
                    }
                  </td>
                  <td className="relative">
                    <div className="relative inline-block">
                      <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                        View <ChevronDown size={11} />
                      </button>
                      {openMenu === item.id && <RowMenu item={item} onClose={() => setOpenMenu(null)} onView={() => setQuickView(item)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="btn-secondary text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {quickView && <QuickViewModal item={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
