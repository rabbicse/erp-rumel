"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Plus, Search, Loader2, X, FileText } from "lucide-react";
import toast from "react-hot-toast";

interface PurchaseForm {
  supplier_name: string;
  supplier_contact: string;
  invoice_number: string;
  total_amount: string;
  notes: string;
  purchase_date: string;
  items: { description: string; quantity: number; unit_price: number }[];
}

const EMPTY_FORM: PurchaseForm = {
  supplier_name: "", supplier_contact: "", invoice_number: "",
  total_amount: "", notes: "", purchase_date: new Date().toISOString().split("T")[0],
  items: [{ description: "", quantity: 1, unit_price: 0 }],
};

export default function PurchasePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PurchaseForm>(EMPTY_FORM);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchase", search],
    queryFn: () => purchaseApi.list({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (d: PurchaseForm) => purchaseApi.create({
      ...d,
      total_amount: parseFloat(d.total_amount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase"] });
      toast.success("Purchase invoice created");
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to create purchase invoice"),
  });

  function updateItem(idx: number, key: string, val: string | number) {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      return { ...f, items };
    });
  }

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase Invoices</h1>
          <p className="text-surface-400 text-sm">Track supplier invoices and purchases</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Purchase
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search supplier or invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Total</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></td></tr>
              ) : !purchases?.length ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-surface-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No purchase invoices yet
                  </td>
                </tr>
              ) : (
                purchases.map((p: { id: string; invoice_number: string; supplier_name: string; purchase_date: string; total_amount: number; notes: string }) => (
                  <tr key={p.id}>
                    <td><code className="text-purple-300 text-xs">{p.invoice_number || "—"}</code></td>
                    <td className="font-medium text-surface-200">{p.supplier_name}</td>
                    <td>{formatDate(p.purchase_date)}</td>
                    <td className="font-semibold text-white">{formatCurrency(p.total_amount)}</td>
                    <td className="text-surface-400 text-sm truncate max-w-48">{p.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-white">New Purchase Invoice</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Supplier Name *</label>
                  <input
                    className="input w-full"
                    placeholder="Supplier Ltd"
                    value={form.supplier_name}
                    onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Contact</label>
                  <input
                    className="input w-full"
                    placeholder="Phone / email"
                    value={form.supplier_contact}
                    onChange={(e) => setForm((f) => ({ ...f, supplier_contact: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Invoice Number</label>
                  <input
                    className="input w-full"
                    placeholder="INV-001"
                    value={form.invoice_number}
                    onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Purchase Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={form.purchase_date}
                    onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Line items */}
              <div>
                <p className="label mb-3">Items</p>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          className="input w-full text-sm"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
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
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                          disabled={form.items.length === 1}
                          className="text-surface-500 hover:text-red-400 disabled:opacity-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, unit_price: 0 }] }))}
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add item
                  </button>
                </div>
                <div className="flex justify-between pt-3 border-t border-surface-700 text-sm font-medium">
                  <span className="text-surface-400">Subtotal</span>
                  <span className="text-white">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Notes</label>
                <textarea
                  className="input w-full h-20 resize-none"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => createMutation.mutate({ ...form, total_amount: String(subtotal) })}
                  disabled={!form.supplier_name || createMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
