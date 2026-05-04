"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api"
import { useState } from "react"
import { Camera, QrCode } from "lucide-react"
import Link from "next/link"

const METAL_PURITIES = [
  { label: "9K Gold",       key: "9k",        multiplier: 0.375 },
  { label: "10K Gold",      key: "10k",       multiplier: 0.417 },
  { label: "12K Gold",      key: "12k",       multiplier: 0.500 },
  { label: "14K Gold",      key: "14k",       multiplier: 0.585 },
  { label: "18K Gold",      key: "18k",       multiplier: 0.750 },
  { label: "22K Gold",      key: "22k",       multiplier: 0.916 },
  { label: "24K Gold",      key: "24k",       multiplier: 1.000 },
  { label: "999 Platinum",  key: "platinum",  multiplier: 1.000 },
  { label: "999 Palladium", key: "palladium", multiplier: 1.000 },
  { label: "999 Silver",    key: "silver",    multiplier: 1.000 },
]

const FALLBACK: Record<string,number> = { "24k": 108.32, platinum: 46.45, palladium: 35.24, silver: 1.75 }

const MAIN_METALS = [
  { label: "24K Gold",      purity: "24k" },
  { label: "999 Platinum",  purity: "platinum" },
  { label: "999 Palladium", purity: "palladium" },
  { label: "999 Silver",    purity: "silver" },
]

export default function DashboardPage() {
  const [barcodeSearch, setBarcodeSearch] = useState("")
  const [skuSearch, setSkuSearch] = useState("")
  const [calcWeight, setCalcWeight] = useState<Record<string,string>>({})
  const [pct, setPct] = useState(100)

  const { data: overview } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: metalPrices } = useQuery({
    queryKey: ["metal-prices"],
    queryFn: dashboardApi.getMetalPrices,
  })

  const priceMap: Record<string,number> = { ...FALLBACK }
  if (metalPrices) {
    (metalPrices as {purity:string;price_per_gram:number}[]).forEach(mp => { priceMap[mp.purity] = mp.price_per_gram })
  }

  const today = new Intl.DateTimeFormat("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric" }).format(new Date())

  const stats = [
    { label:"ACTIVE STOCK ITEMS",    count: overview?.active_count ?? 0,      color:"text-brand-700", desc:"Click To View All Items Currently Available For Sale.", href:"/stock?status=active" },
    { label:"ITEMS ON CONSIGNMENT",  count: overview?.consignment_count ?? 0,  color:"text-amber-500", desc:"Click To View All Items Currently Out On Customer Or Dealer Consignment.", href:"/stock?status=consignment" },
    { label:"ITEMS IN REPAIR",       count: overview?.repair_count ?? 0,       color:"text-blue-600",  desc:"Click To See All Stock Currently With The Workshop For Repair Or Adjustment.", href:"/stock?status=repair" },
    { label:"STOCK IN REVIEW",       count: overview?.review_count ?? 0,       color:"text-brand-700", desc:"Click To View Items Awaiting Approval, Checks Or Final Review.", href:"/stock?status=review" },
    { label:"SOLD-OUT ITEMS",        count: overview?.sold_count ?? 0,         color:"text-amber-500", desc:"Click To Review Items That Have Been Fully Sold And Removed From Stock.", href:"/stock?status=sold" },
    { label:"INACTIVE STOCK ITEMS",  count: overview?.inactive_count ?? 0,     color:"text-brand-700", desc:"Click To See Items That Are Hidden From Listings Or No Longer For Sale.", href:"/stock?status=inactive" },
  ]

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="page-title">DASHBOARD OVERVIEW</h1>
        <p className="page-subtitle">Live summary of your stock, workshop activity, metal prices and rental users in one place.</p>
      </div>

      {/* Search */}
      <div className="card">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-semibold text-sm text-gray-800 mb-1">Scan product barcode</p>
            <p className="text-xs text-gray-400 mb-3">Use your barcode scanner or click the camera icon to scan a product.</p>
            <div className="relative">
              <input type="text" placeholder="Scan here to search by barcode" value={barcodeSearch} onChange={e => setBarcodeSearch(e.target.value)} className="input pr-10" />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-brand-700 rounded-md flex items-center justify-center">
                <Camera size={14} className="text-white" />
              </button>
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800 mb-1">Search by SKU</p>
            <p className="text-xs text-gray-400 mb-3">Enter a full or partial SKU code to find a specific item.</p>
            <input type="text" placeholder="Type SKU and press Enter" value={skuSearch} onChange={e => setSkuSearch(e.target.value)} className="input" />
          </div>
        </div>
        <p className="text-xs text-blue-500 mt-3 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">i</span>
          Barcode scan is the fastest way to search. Manual SKU search is available on the right.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <Link key={i} href={s.href}>
            <div className="card hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <QrCode size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.count}</p>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Metal price + calculator */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="font-bold text-gray-800 text-sm tracking-wide mb-1">LIVE METAL PRICE</p>
          <p className="text-xs text-gray-400 mb-4">{today}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 uppercase">Metal</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 uppercase">Price of 1gram</th>
              </tr>
            </thead>
            <tbody>
              {MAIN_METALS.map(m => (
                <tr key={m.purity} className="border-b border-gray-50">
                  <td className="py-2.5 text-gray-700">{m.label}</td>
                  <td className="py-2.5 text-gray-600">GBP £ {(priceMap[m.purity] ?? 0).toFixed(2)}/g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <p className="font-bold text-gray-800 text-sm tracking-wide mb-1">LIVE PRICE PER GRAM FOR METALS</p>
          <p className="text-xs text-gray-400 mb-4">{today}</p>
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-600">Gold</p>
              <p className="text-xs text-gray-400">Live price calculator</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={pct} onChange={e => setPct(Number(e.target.value))} className="input w-16 text-right py-1" min={1} max={200} />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <span className="text-xs text-gray-400">of market value</span>
          </div>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2 uppercase">Description</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2 uppercase">Enter Weight</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2 uppercase">Value (GBP)</th>
                </tr>
              </thead>
              <tbody>
                {METAL_PURITIES.map(m => {
                  const base = priceMap["24k"] ?? 108.32
                  const ppg = base * m.multiplier * (pct / 100)
                  const w = parseFloat(calcWeight[m.key] ?? "1") || 0
                  return (
                    <tr key={m.key} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700">{m.label}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <input type="number" value={calcWeight[m.key] ?? "1"} onChange={e => setCalcWeight(p => ({...p, [m.key]: e.target.value}))} className="input w-14 text-center py-1 text-xs" min={0} />
                          <span className="text-xs text-gray-400">g</span>
                        </div>
                      </td>
                      <td className="py-2 text-xs text-gray-600">GBP £ {ppg.toFixed(2)}/g</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
