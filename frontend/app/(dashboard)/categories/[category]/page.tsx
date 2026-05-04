"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { formatCurrency, formatWeight, statusLabel, STATUS_COLORS, titleCase } from "@/lib/utils";
import { Package, Loader2, Search, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StockItem } from "@/types";

const CATEGORY_META: Record<string, { label: string; icon: string; description: string }> = {
  rings: { label: "Rings", icon: "💍", description: "Diamond, gemstone and plain bands" },
  diamonds: { label: "Diamonds", icon: "💎", description: "Loose diamonds and diamond-set pieces" },
  gemstones: { label: "Gemstones", icon: "🔮", description: "Coloured gemstones and semi-precious stones" },
  mounts: { label: "Mounts & Settings", icon: "⚙️", description: "Ring mounts, settings and findings" },
  watches: { label: "Watches", icon: "⌚", description: "Luxury and pre-owned timepieces" },
};

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const meta = CATEGORY_META[category] ?? { label: titleCase(category), icon: "📦", description: "" };

  const { data: response, isLoading } = useQuery({
    queryKey: ["stock", "category", category, search, statusFilter],
    queryFn: () =>
      stockApi.list({
        category,
        search,
        status: statusFilter,
        page: 1,
        page_size: 50,
      }),
  });

  const items: StockItem[] = response?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{meta.label}</h1>
            {meta.description && <p className="text-surface-400 text-sm">{meta.description}</p>}
          </div>
        </div>
        <Link href={`/stock/add?category=${category}`} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add {meta.label.replace(/s$/, "")}
        </Link>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder={`Search ${meta.label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input min-w-36"
        >
          <option value="">All Statuses</option>
          {["active", "consignment", "repair", "review", "sold", "inactive"].map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <div className="text-sm text-surface-400">
          {response?.total ?? 0} item{(response?.total ?? 0) !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : !items.length ? (
        <div className="text-center py-20 text-surface-500">
          <span className="text-5xl mb-4 block">{meta.icon}</span>
          <p className="text-lg">No {meta.label.toLowerCase()} found</p>
          <Link href={`/stock/add?category=${category}`} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add first item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/stock/${item.id}`}
              className="card hover:border-purple-500/40 hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* Image */}
              <div className="aspect-square rounded-lg bg-surface-700 mb-4 overflow-hidden flex items-center justify-center">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.product_name || item.sku}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <Package className="w-8 h-8 text-surface-500" />
                )}
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-white text-sm leading-snug line-clamp-2">
                    {item.product_name || "Unnamed Item"}
                  </p>
                  <span className={`badge ${STATUS_COLORS[item.status]} shrink-0`}>
                    {statusLabel(item.status)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <code className="text-purple-300">{item.sku}</code>
                  {item.metal_purity && <span>·</span>}
                  {item.metal_purity && <span>{item.metal_purity}</span>}
                  {item.carat_weight && <span>·</span>}
                  {item.carat_weight && <span>{formatWeight(item.carat_weight)}</span>}
                </div>

                <div className="pt-2 border-t border-surface-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-500">Cost</p>
                    <p className="text-sm font-medium text-surface-300">{formatCurrency(item.cost_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-500">Retail</p>
                    <p className="text-sm font-semibold text-white">{formatCurrency(item.retail_price ?? 0)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
