"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manufacturingApi } from "@/lib/api";
import { formatDate, formatCurrency, statusLabel, STATUS_COLORS } from "@/lib/utils";
import {
  Wrench, Plus, Search, Filter, ChevronDown, Loader2,
  X, Save, Calendar, User, DollarSign, Tag
} from "lucide-react";
import toast from "react-hot-toast";
import { ManufacturingJob } from "@/types";

const JOB_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

interface NewJobForm {
  job_name: string;
  sku: string;
  customer_name: string;
  customer_phone: string;
  description: string;
  due_date: string;
  cost_estimate: string;
  deposit_paid: string;
}

const EMPTY_FORM: NewJobForm = {
  job_name: "", sku: "", customer_name: "", customer_phone: "",
  description: "", due_date: "", cost_estimate: "", deposit_paid: "",
};

export default function ManufacturingPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewJobForm>(EMPTY_FORM);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["manufacturing", search, statusFilter],
    queryFn: () => manufacturingApi.list({ search, status: statusFilter }),
  });

  const createMutation = useMutation({
    mutationFn: (data: NewJobForm) => manufacturingApi.create({
      ...data,
      cost_estimate: parseFloat(data.cost_estimate) || 0,
      deposit_paid: parseFloat(data.deposit_paid) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing"] });
      toast.success("Job created");
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to create job"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      manufacturingApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing"] });
      toast.success("Status updated");
    },
  });

  function f(key: keyof NewJobForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Manufacturing</h1>
          <p className="text-surface-400 text-sm">Track bespoke and repair jobs</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search jobs…"
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
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Jobs Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Job / SKU</th>
                <th>Customer</th>
                <th>Description</th>
                <th>Due Date</th>
                <th>Estimate</th>
                <th>Deposit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  </td>
                </tr>
              ) : !jobs?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-surface-500">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No manufacturing jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job: ManufacturingJob) => (
                  <tr key={job.id}>
                    <td>
                      <p className="font-medium text-white">{job.job_name}</p>
                      {job.sku && <p className="text-xs text-surface-500 font-mono">{job.sku}</p>}
                    </td>
                    <td>
                      <p className="text-surface-200">{job.customer_name || "—"}</p>
                      {job.customer_phone && (
                        <p className="text-xs text-surface-500">{job.customer_phone}</p>
                      )}
                    </td>
                    <td className="max-w-48">
                      <p className="text-surface-300 text-sm truncate">{job.description || "—"}</p>
                    </td>
                    <td>{formatDate(job.due_date)}</td>
                    <td>{job.cost_estimate ? formatCurrency(job.cost_estimate) : "—"}</td>
                    <td>{job.deposit_paid ? formatCurrency(job.deposit_paid) : "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[job.status] ?? "badge-inactive"}`}>
                        {statusLabel(job.status)}
                      </span>
                    </td>
                    <td>
                      <select
                        value={job.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: job.id, status: e.target.value })}
                        className="input text-xs py-1 pr-6"
                      >
                        {JOB_STATUSES.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Job Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-white">New Manufacturing Job</h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="label">Job Name *</label>
                  <input className="input w-full" placeholder="e.g. Bespoke Engagement Ring" {...f("job_name")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">MFG SKU</label>
                  <input className="input w-full" placeholder="Auto-generated if blank" {...f("sku")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Due Date</label>
                  <input type="date" className="input w-full" {...f("due_date")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Customer Name</label>
                  <input className="input w-full" placeholder="John Smith" {...f("customer_name")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Customer Phone</label>
                  <input className="input w-full" placeholder="+44…" {...f("customer_phone")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Cost Estimate (£)</label>
                  <input type="number" className="input w-full" placeholder="0.00" {...f("cost_estimate")} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Deposit Paid (£)</label>
                  <input type="number" className="input w-full" placeholder="0.00" {...f("deposit_paid")} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="label">Description</label>
                  <textarea
                    className="input w-full h-24 resize-none"
                    placeholder="Job details, specifications…"
                    {...f("description")}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.job_name || createMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
