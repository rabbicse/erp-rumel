"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelApi } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Tag, Plus, Search, Printer, Loader2, X, QrCode } from "lucide-react";
import toast from "react-hot-toast";

interface LabelEntry {
  id: string;
  sku: string;
  product_name: string;
  metal_purity: string;
  carat_weight: number;
  retail_price: number;
  printed_at: string;
  print_count: number;
}

export default function LabelsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: labels, isLoading } = useQuery({
    queryKey: ["labels", search],
    queryFn: () => labelApi.list({ search }),
  });

  const addMutation = useMutation({
    mutationFn: (sku: string) => labelApi.print([sku]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labels"] });
      toast.success("Label queued for printing");
      setSkuInput("");
    },
    onError: () => toast.error("SKU not found"),
  });

  const printMutation = useMutation({
    mutationFn: (skus: string[]) => labelApi.print(skus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labels"] });
      toast.success(`${selected.size} label(s) sent to printer`);
      setSelected(new Set());
    },
    onError: () => toast.error("Print failed"),
  });

  function toggleSelect(sku: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function toggleAll() {
    if (!labels) return;
    if (selected.size === labels.length) setSelected(new Set());
    else setSelected(new Set(labels.map((l: LabelEntry) => l.sku)));
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Labels</h1>
          <p className="text-surface-400 text-sm">Print price and identity labels for stock items</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => printMutation.mutate(Array.from(selected))}
            disabled={printMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {printMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print {selected.size} Label{selected.size !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Add SKU */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Add item to print queue</h2>
        <div className="flex gap-3 max-w-md">
          <div className="relative flex-1">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Enter SKU or scan barcode…"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && skuInput) addMutation.mutate(skuInput); }}
              className="input w-full pl-9 font-mono"
            />
          </div>
          <button
            onClick={() => addMutation.mutate(skuInput)}
            disabled={!skuInput || addMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
        <p className="text-xs text-surface-500 mt-2">Press Enter or click Add. You can also scan a barcode directly.</p>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Filter by SKU or product…"
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
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={labels?.length > 0 && selected.size === labels?.length}
                    onChange={toggleAll}
                    className="rounded border-surface-600 bg-surface-800 text-purple-600"
                  />
                </th>
                <th>SKU</th>
                <th>Product</th>
                <th>Purity</th>
                <th>Weight</th>
                <th>Retail Price</th>
                <th>Last Printed</th>
                <th>Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></td></tr>
              ) : !labels?.length ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-surface-500">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No labels yet. Add SKUs above to queue labels.
                  </td>
                </tr>
              ) : (
                labels.map((l: LabelEntry) => (
                  <tr key={l.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(l.sku)}
                        onChange={() => toggleSelect(l.sku)}
                        className="rounded border-surface-600 bg-surface-800 text-purple-600"
                      />
                    </td>
                    <td><code className="text-purple-300 text-xs">{l.sku}</code></td>
                    <td className="text-surface-200 font-medium">{l.product_name}</td>
                    <td className="text-surface-400">{l.metal_purity || "—"}</td>
                    <td className="text-surface-400">{l.carat_weight ? `${l.carat_weight}g` : "—"}</td>
                    <td className="font-semibold text-white">{l.retail_price ? formatCurrency(l.retail_price) : "—"}</td>
                    <td className="text-surface-400">{l.printed_at ? formatDate(l.printed_at) : "Never"}</td>
                    <td>
                      <span className="badge badge-inactive">{l.print_count ?? 0}×</span>
                    </td>
                    <td>
                      <button
                        onClick={() => printMutation.mutate([l.sku])}
                        className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                        title="Print label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Label preview hint */}
      <div className="card bg-surface-800/50 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
          <Tag className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <p className="font-medium text-white text-sm">Label format</p>
          <p className="text-surface-400 text-sm mt-0.5">
            Labels include: SKU barcode, product name, metal purity, carat weight, and retail price.
            Print to a Dymo or Zebra label printer connected to your workstation.
          </p>
        </div>
      </div>
    </div>
  );
}
