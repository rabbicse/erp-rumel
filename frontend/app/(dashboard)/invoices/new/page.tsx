"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceApi, stockApi } from "@/lib/api";
import { formatCurrency, formatDate, statusLabel, STATUS_COLORS } from "@/lib/utils";
import {
  FileText, Plus, Search, Loader2, X, Trash2, ChevronDown, Check
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const ORDER_TYPES = ["trade_order", "pre_owned", "bespoke"] as const;

interface LineItem {
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceForm {
  order_type: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
  discount: number;
  due_date: string;
  items: LineItem[];
}

const EMPTY_FORM: InvoiceForm = {
  order_type: "trade_order",
  customer_name: "", customer_email: "", customer_phone: "",
  notes: "", discount: 0, due_date: "",
  items: [{ sku: "", description: "", quantity: 1, unit_price: 0 }],
};

export default function InvoiceCreatePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - form.discount);

  function updateItem(idx: number, key: keyof LineItem, val: string | number) {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({
      ...f,
      items: [...f.items, { sku: "", description: "", quantity: 1, unit_price: 0 }],
    }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  const createMutation = useMutation({
    mutationFn: () => invoiceApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">New Invoice</h1>
          <p className="text-surface-400 text-sm">Create a new sales invoice</p>
        </div>
        <Link href="/invoices" className="btn-secondary">Cancel</Link>
      </div>

      {/* Order Type */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Order Type</h2>
        <div className="grid grid-cols-3 gap-3">
          {ORDER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setForm((f) => ({ ...f, order_type: t }))}
              className={`py-3 rounded-xl border text-sm font-medium transition-all
                ${form.order_type === t
                  ? "border-purple-500 bg-purple-600/20 text-purple-300"
                  : "border-surface-600 text-surface-400 hover:border-surface-500 hover:text-white"}`}
            >
              {statusLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Info */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Customer</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="label">Name *</label>
            <input
              className="input w-full"
              placeholder="Customer name"
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Email</label>
            <input
              type="email"
              className="input w-full"
              placeholder="customer@email.com"
              value={form.customer_email}
              onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Phone</label>
            <input
              className="input w-full"
              placeholder="+44…"
              value={form.customer_phone}
              onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input w-full"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Items</h2>
        <div className="space-y-3">
          {form.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-3">
                <input
                  className="input w-full font-mono text-xs"
                  placeholder="SKU"
                  value={item.sku}
                  onChange={(e) => updateItem(idx, "sku", e.target.value)}
                />
              </div>
              <div className="col-span-4">
                <input
                  className="input w-full text-sm"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  min={1}
                  className="input w-full text-center text-sm"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  step="0.01"
                  className="input w-full text-sm"
                  placeholder="0.00"
                  value={item.unit_price || ""}
                  onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-2">
                <button
                  onClick={() => removeItem(idx)}
                  disabled={form.items.length === 1}
                  className="text-surface-500 hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 text-xs text-surface-500">SKU</div>
            <div className="col-span-4 text-xs text-surface-500">Description</div>
            <div className="col-span-1 text-xs text-surface-500 text-center">Qty</div>
            <div className="col-span-3 text-xs text-surface-500">Unit Price</div>
          </div>
          <button onClick={addItem} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add line item
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="card">
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-surface-300">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-surface-300">
            <span>Discount (£)</span>
            <input
              type="number"
              min={0}
              className="input w-32 text-right text-sm"
              value={form.discount || ""}
              onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex justify-between text-base font-semibold text-white border-t border-surface-700 pt-3">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <h2 className="font-semibold text-white mb-3">Notes</h2>
        <textarea
          className="input w-full h-24 resize-none"
          placeholder="Any additional notes for this invoice…"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Link href="/invoices" className="btn-secondary">Cancel</Link>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.customer_name || createMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Invoice
        </button>
      </div>
    </div>
  );
}
