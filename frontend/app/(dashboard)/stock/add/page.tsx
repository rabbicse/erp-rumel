"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { stockApi } from "@/lib/api"
import { ArrowLeft, Loader2, Info, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

type PaymentType = "BD" | "CR" | "CC"

const PAYMENT_TYPES = [
  {
    key: "BD" as PaymentType,
    label: "Add to Bank Transaction Stock",
    description: "Use this when the customer was paid via bank transfer or online payment.",
    bullets: ["Ideal for bank / online payments", "Clear transaction history", "Perfect for higher-value items"],
    emoji: "&#x1F4B0;",
    btn: "Continue with Bank Stock",
  },
  {
    key: "CR" as PaymentType,
    label: "Add to Cash Transaction Stock",
    description: "Use this when the customer was paid in cash at the branch.",
    bullets: ["In-store cash payouts", "Fast over-the-counter deals", "Perfect for walk-in clients"],
    emoji: "&#x1F4B5;",
    btn: "Continue with Cash Stock",
  },
  {
    key: "CC" as PaymentType,
    label: "Add to Crypto Stock",
    description: "Use this when the customer was paid using cryptocurrency.",
    bullets: ["Track crypto deals clearly", "Ideal for modern clients", "Great for high-value trades"],
    emoji: "&#x1FA99;",
    btn: "Continue with Crypto Stock",
  },
]

const PAYMENT_LABELS: Record<PaymentType, string> = {
  BD: "BD (Bank Transaction)",
  CR: "CR (Cash)",
  CC: "CC (Crypto)",
}

interface FormData {
  purchase_method: PaymentType
  category: string
  sku: string
  supplier: string
  purchase_price: string
  purchase_date: string
  product_title: string
}

const EMPTY: FormData = {
  purchase_method: "BD",
  category: "", sku: "", supplier: "",
  purchase_price: "0", purchase_date: "", product_title: "",
}

const CATEGORIES = ["Rings","Diamonds","Gemstones","Mounts","Watches","Bracelet","Necklace","Earrings","Chain","Brooch","Scrap","Other"]

export default function AddStockPage() {
  const router = useRouter()
  const [step, setStep] = useState<1|2>(1)
  const [payType, setPayType] = useState<PaymentType>("BD")
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const createMutation = useMutation({
    mutationFn: (data: FormData) => stockApi.create({
      stock_type: data.purchase_method,
      category: data.category.toLowerCase(),
      // sku_manual: data.sku,
      supplier_name: data.supplier,
      cost_price: parseFloat(data.purchase_price) || 0,
      retail_price: parseFloat(data.purchase_price) || 0,
      product_name: data.product_title,
    }),
    onSuccess: () => { toast.success("Stock item created"); router.push("/stock") },
    onError: () => toast.error("Failed to create stock item"),
  })

  function validate(): boolean {
    const e: Partial<FormData> = {}
    if (!form.category) e.category = "Please select stock category"
    if (!form.product_title) e.product_title = "Please enter product title / description"
    if (!form.purchase_date) e.purchase_date = "Enter purchase date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleContinue(pt: PaymentType) {
    setPayType(pt)
    setForm(f => ({ ...f, purchase_method: pt }))
    setStep(2)
  }

  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  if (step === 1) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/stock" className="btn-secondary text-xs flex items-center gap-1.5"><ArrowLeft size={13} /> Back</Link>
          <div>
            <h1 className="page-title">ADD NEW STOCK</h1>
            <p className="page-subtitle">Choose how you are adding stock today – bank transfer, cash or crypto.</p>
          </div>
        </div>

        <div className="card mb-6 flex items-start gap-3 bg-blue-50 border-blue-100">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">How would you like to add this stock?</p>
            <p className="text-xs text-blue-600 mt-0.5">Pick the payment method used when buying this item. You can still edit full details on the next page.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {PAYMENT_TYPES.map(pt => (
            <div key={pt.key} className="card flex flex-col hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl mb-4" dangerouslySetInnerHTML={{ __html: pt.emoji }} />
              <h3 className="font-bold text-gray-800 text-sm mb-2">{pt.label}</h3>
              <p className="text-xs text-gray-500 mb-4">{pt.description}</p>
              <ul className="space-y-1.5 mb-6 flex-1">
                {pt.bullets.map(b => (
                  <li key={b} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle size={11} className="text-brand-500 shrink-0" />{b}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleContinue(pt.key)}
                className="w-full py-2.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium transition-colors">
                {pt.btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setStep(1)} className="btn-secondary text-xs flex items-center gap-1.5"><ArrowLeft size={13} /> Back</button>
        <div>
          <h1 className="page-title">ADD NEW STOCK ITEM</h1>
          <p className="page-subtitle">Record purchase method, category, supplier and price. You can review and edit full product details on the next screens.</p>
        </div>
      </div>

      <div className="card mb-4 flex items-start gap-3 bg-blue-50 border-blue-100">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">How will you record this purchase?</p>
          <p className="text-xs text-blue-600 mt-0.5">Select how this item was paid for. You can change or add further details on the next page.</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        {/* Main form */}
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">i</span>
            </div>
            <h2 className="font-bold text-gray-800">ESSENTIALS</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Key details for this stock item.</p>

          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-xs text-amber-700 mb-5">
            <strong>Tip:</strong> Update the fields below and click <strong>Save and Continue</strong> at the bottom of the page to save your changes.
            Make sure the stock type, supplier and prices match your purchase invoice for accurate reports.
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Purchase Method */}
            <div>
              <label className="label">Purchase Method *</label>
              <div className="relative">
                <input type="text" value={PAYMENT_LABELS[payType]} readOnly className="input bg-gray-50 text-gray-600 pr-8" />
                <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              </div>
            </div>

            {/* Stock Category */}
            <div>
              <label className="label">Stock Category *</label>
              <div className="relative">
                <select value={form.category} onChange={e => set("category", e.target.value)} className={"input " + (errors.category ? "input-error" : "")}>
                  <option value="">Select Stock Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
                {errors.category && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
              </div>
              {errors.category && <p className="error-text">{errors.category}</p>}
              {!errors.category && <p className="text-xs text-brand-500 mt-1">Select stock category</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="label">Product SKU / Code *</label>
              <div className="relative">
                <input type="text" placeholder="Enter internal stock code (e.g. CF-001)" value={form.sku} onChange={e => set("sku", e.target.value)} className={"input " + (errors.sku ? "input-error" : "")} />
                {errors.sku && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
              </div>
              {errors.sku && <p className="error-text">{errors.sku}</p>}
              {!errors.sku && <p className="text-xs text-brand-500 mt-1">Please enter product SKU / code</p>}
            </div>

            {/* Supplier */}
            <div>
              <label className="label">Supplier / Source</label>
              <div className="relative">
                <select value={form.supplier} onChange={e => set("supplier", e.target.value)} className="input">
                  <option value="">Select Supplier or Sour...</option>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
              <p className="text-xs text-brand-500 mt-1">Select supplier or source</p>
            </div>

            {/* Purchase Price */}
            <div>
              <label className="label">Purchase Price</label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">&#xa3;</span>
                <input type="number" value={form.purchase_price} onChange={e => set("purchase_price", e.target.value)}
                  className="input rounded-l-none flex-1" min={0} step="0.01" />
                <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="label">Purchase Date</label>
              <div className="relative">
                <input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} className={"input " + (errors.purchase_date ? "input-error" : "")} />
                {errors.purchase_date && <AlertCircle size={14} className="absolute right-10 top-1/2 -translate-y-1/2 text-red-400" />}
              </div>
              {errors.purchase_date && <p className="error-text">{errors.purchase_date}</p>}
              {!errors.purchase_date && <p className="text-xs text-brand-500 mt-1">Enter purchase date</p>}
            </div>

            {/* Product Title */}
            <div className="col-span-2">
              <label className="label">Product Title / Description *</label>
              <div className="relative">
                <input type="text" placeholder="e.g. 18ct White Gold Diamond Engagement Ring"
                  value={form.product_title} onChange={e => set("product_title", e.target.value)}
                  className={"input " + (errors.product_title ? "input-error" : "")} />
                {errors.product_title && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
              </div>
              {errors.product_title && <p className="error-text">{errors.product_title}</p>}
              {!errors.product_title && <p className="text-xs text-red-400 mt-1">Please enter product title / description</p>}
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button
              onClick={() => { if (validate()) createMutation.mutate(form) }}
              disabled={createMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Save and Continue
            </button>
          </div>
        </div>

        {/* Help tips */}
        <div className="card h-fit">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-brand-700 text-[10px] font-bold">i</span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm">FORM HELP &amp; TIPS</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Simple guidance for adding new stock items.</p>
          <ul className="space-y-3 text-xs text-gray-500">
            <li>• Use clear product titles staff and customers will recognise.</li>
            <li>• Keep SKUs / codes short and consistent with your other systems.</li>
            <li>• Make sure purchase price and date match the supplier invoice.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
