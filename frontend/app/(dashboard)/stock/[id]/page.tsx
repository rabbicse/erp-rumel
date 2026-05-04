"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { formatCurrency, formatDate, formatWeight, statusLabel, STATUS_COLORS } from "@/lib/utils";
import {
  ArrowLeft, Pencil, Save, X, Trash2, Tag, Package, DollarSign,
  Calendar, User, TriangleAlert, Image as ImageIcon, MoreVertical
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { StockItem, StockStatus } from "@/types";

const STATUSES: StockStatus[] = ["active", "consignment", "repair", "review", "sold", "inactive"];

export default function StockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<StockItem>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["stock", id],
    queryFn: () => stockApi.get(id),
  });

  useEffect(() => {
    if (item) setForm(item);
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StockItem>) => stockApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Stock item updated");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update item"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: StockStatus) => stockApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock", id] });
      toast.success("Status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => stockApi.delete(id),
    onSuccess: () => {
      toast.success("Item deleted");
      router.push("/stock");
    },
    onError: () => toast.error("Failed to delete"),
  });

  function field(key: keyof StockItem, label: string, type = "text") {
    const val = form[key];
    if (!editing) {
      return (
        <div key={key} className="space-y-1">
          <p className="text-xs text-surface-400 uppercase tracking-wider">{label}</p>
          <p className="text-sm text-surface-100 font-medium">
            {val != null && val !== "" ? String(val) : <span className="text-surface-500">—</span>}
          </p>
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1">
        <label className="label">{label}</label>
        <input
          type={type}
          value={String(val ?? "")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value,
            }))
          }
          className="input w-full"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20 text-surface-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Stock item not found</p>
        <Link href="/stock" className="btn-secondary mt-4 inline-flex">Back to Stock</Link>
      </div>
    );
  }

  const pnl = item.sold_price ? item.sold_price - item.cost_price : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/stock" className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{item.sku}</h1>
            <span className={`badge ${STATUS_COLORS[item.status]}`}>{statusLabel(item.status)}</span>
          </div>
          <p className="text-surface-400 text-sm mt-0.5">{item.product_name || "Unnamed Item"}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setForm(item); setEditing(false); }}
                className="btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Tag className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-white">Product Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {field("sku", "SKU")}
              {field("product_name", "Product Name")}
              {field("category", "Category")}
              {field("stock_type", "Stock Type")}
              {field("metal_purity", "Metal Purity")}
              {field("carat_weight", "Carat Weight (g)", "number")}
              {field("description", "Description")}
            </div>
          </div>

          {/* Pricing */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-white">Pricing</h2>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {field("cost_price", "Cost Price (£)", "number")}
              {field("retail_price", "Retail Price (£)", "number")}
              {field("sold_price", "Sold Price (£)", "number")}
              {!editing && pnl !== null && (
                <div className="space-y-1">
                  <p className="text-xs text-surface-400 uppercase tracking-wider">P&amp;L</p>
                  <p className={`text-sm font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer / Supplier */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-white">Customer / Supplier</h2>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {field("customer_name", "Customer Name")}
              {field("customer_phone", "Phone")}
              {field("customer_email", "Email")}
              {field("supplier_name", "Supplier")}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Status</h2>
            <div className="space-y-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => statusMutation.mutate(s)}
                  disabled={item.status === s}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${item.status === s
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 cursor-default"
                      : "text-surface-400 hover:bg-surface-700 hover:text-white border border-transparent"
                    }`}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-white">Metadata</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-surface-400 uppercase tracking-wider">Created</p>
                <p className="text-surface-200">{formatDate(item.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 uppercase tracking-wider">Last Updated</p>
                <p className="text-surface-200">{formatDate(item.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 uppercase tracking-wider">ID</p>
                <p className="text-surface-400 font-mono text-xs break-all">{item.id}</p>
              </div>
            </div>
          </div>

          {/* Image */}
          {item.image_url && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-white">Image</h2>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.product_name || item.sku}
                className="w-full rounded-lg object-cover aspect-square"
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <TriangleAlert className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-white">Delete Item</h3>
            </div>
            <p className="text-surface-400 text-sm mb-6">
              Are you sure you want to delete <strong className="text-white">{item.sku}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
