"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { consignmentApi } from "@/lib/api";
import { formatDate, formatCurrency, statusLabel, STATUS_COLORS } from "@/lib/utils";
import { Package, Plus, Search, ArrowLeftRight, ArrowUpRight, ArrowDownLeft, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Consignment } from "@/types";

type Tab = "all" | "out" | "returned";

interface OutForm {
  sku: string;
  consignee_name: string;
  consignee_contact: string;
  consignment_value: string;
  notes: string;
  expected_return_date: string;
}

const EMPTY_OUT: OutForm = {
  sku: "", consignee_name: "", consignee_contact: "",
  consignment_value: "", notes: "", expected_return_date: "",
};

export default function ConsignmentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showOutForm, setShowOutForm] = useState(false);
  const [outForm, setOutForm] = useState<OutForm>(EMPTY_OUT);
  const [returnSku, setReturnSku] = useState("");
  const [showReturnForm, setShowReturnForm] = useState(false);

  const { data: consignments, isLoading } = useQuery({
    queryKey: ["consignment", tab, search],
    queryFn: () => consignmentApi.list({ status: tab === "all" ? "" : tab, search }),
  });

  const outMutation = useMutation({
    mutationFn: (d: OutForm) => consignmentApi.createOut({
      ...d,
      consignment_value: parseFloat(d.consignment_value) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consignment"] });
      toast.success("Consignment recorded");
      setShowOutForm(false);
      setOutForm(EMPTY_OUT);
    },
    onError: () => toast.error("Failed to record consignment"),
  });

  const returnMutation = useMutation({
    mutationFn: (sku: string) => consignmentApi.return(sku),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consignment"] });
      toast.success("Item returned");
      setShowReturnForm(false);
      setReturnSku("");
    },
    onError: () => toast.error("Failed to process return"),
  });

  function f(key: keyof OutForm) {
    return {
      value: outForm[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setOutForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <ArrowLeftRight className="w-4 h-4" /> },
    { key: "out", label: "Out", icon: <ArrowUpRight className="w-4 h-4" /> },
    { key: "returned", label: "Returned", icon: <ArrowDownLeft className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Consignment</h1>
          <p className="text-surface-400 text-sm">Track items sent out and received back</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReturnForm(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowDownLeft className="w-4 h-4" /> Record Return
          </button>
          <button
            onClick={() => setShowOutForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Send Out
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg bg-surface-900/50 p-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                ${tab === t.key ? "bg-purple-600 text-white" : "text-surface-400 hover:text-white"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by SKU or consignee…"
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
                <th>SKU</th>
                <th>Consignee</th>
                <th>Contact</th>
                <th>Value</th>
                <th>Sent Out</th>
                <th>Expected Return</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  </td>
                </tr>
              ) : !consignments?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-surface-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No consignment records found
                  </td>
                </tr>
              ) : (
                consignments.map((c: Consignment) => (
                  <tr key={c.id}>
                    <td><code className="text-purple-300 text-xs">{c.sku}</code></td>
                    <td className="font-medium text-surface-200">{c.consignee_name}</td>
                    <td className="text-surface-400">{c.consignee_contact || "—"}</td>
                    <td>{c.consignment_value ? formatCurrency(c.consignment_value) : "—"}</td>
                    <td>{formatDate(c.sent_out_date)}</td>
                    <td>{c.expected_return_date ? formatDate(c.expected_return_date) : "—"}</td>
                    <td>{c.returned_date ? formatDate(c.returned_date) : "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[c.status] ?? "badge-inactive"}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Out Modal */}
      {showOutForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-white">Send Item Out on Consignment</h2>
              </div>
              <button onClick={() => setShowOutForm(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">SKU *</label>
                  <input className="input w-full font-mono" placeholder="CF-001" {...f("sku")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Consignment Value (£)</label>
                  <input type="number" className="input w-full" placeholder="0.00" {...f("consignment_value")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Consignee Name *</label>
                  <input className="input w-full" placeholder="John Smith" {...f("consignee_name")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Contact</label>
                  <input className="input w-full" placeholder="Phone / email" {...f("consignee_contact")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Expected Return Date</label>
                  <input type="date" className="input w-full" {...f("expected_return_date")} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="label">Notes</label>
                  <textarea className="input w-full h-20 resize-none" placeholder="Any additional notes…" {...f("notes")} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowOutForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => outMutation.mutate(outForm)}
                  disabled={!outForm.sku || !outForm.consignee_name || outMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {outMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-white">Record Return</h2>
              </div>
              <button onClick={() => setShowReturnForm(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="label">SKU *</label>
                <input
                  className="input w-full font-mono"
                  placeholder="CF-001"
                  value={returnSku}
                  onChange={(e) => setReturnSku(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowReturnForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => returnMutation.mutate(returnSku)}
                  disabled={!returnSku || returnMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {returnMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Mark Returned
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
