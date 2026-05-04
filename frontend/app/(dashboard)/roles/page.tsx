"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleApi } from "@/lib/api";
import { Shield, Plus, Pencil, X, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Role } from "@/types";

const PERMISSIONS = [
  { key: "view_stock", label: "View Stock" },
  { key: "manage_stock", label: "Manage Stock" },
  { key: "view_invoices", label: "View Invoices" },
  { key: "manage_invoices", label: "Manage Invoices" },
  { key: "view_manufacturing", label: "View Manufacturing" },
  { key: "manage_manufacturing", label: "Manage Manufacturing" },
  { key: "view_consignment", label: "View Consignment" },
  { key: "manage_consignment", label: "Manage Consignment" },
  { key: "view_reports", label: "View Reports" },
  { key: "manage_users", label: "Manage Users" },
  { key: "manage_roles", label: "Manage Roles" },
  { key: "bulk_upload", label: "Bulk Upload" },
  { key: "export_data", label: "Export Data" },
  { key: "print_labels", label: "Print Labels" },
];

interface RoleForm {
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY_FORM: RoleForm = { name: "", description: "", permissions: [] };

export default function RolesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d: RoleForm) => roleApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created");
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoleForm> }) => roleApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role updated");
      setEditRole(null);
    },
    onError: () => toast.error("Failed to update role"),
  });

  function openEdit(r: Role) {
    setEditRole(r);
    setForm({ name: r.name, description: r.description ?? "", permissions: r.permissions ?? [] });
  }

  function togglePerm(key: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  }

  const SYSTEM_ROLES = ["admin", "manager", "staff", "viewer"];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Roles</h1>
          <p className="text-surface-400 text-sm">Define permissions for each role</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          roles?.map((role: Role) => {
            const isSystem = SYSTEM_ROLES.includes(role.name.toLowerCase());
            return (
              <div key={role.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{role.name}</p>
                        {isSystem && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-400">System</span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-surface-400">{role.description}</p>
                      )}
                    </div>
                  </div>
                  {!isSystem && (
                    <button onClick={() => openEdit(role)} className="btn-secondary text-sm flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {PERMISSIONS.map((p) => {
                    const has = role.permissions?.includes(p.key) || role.name.toLowerCase() === "admin";
                    return (
                      <span
                        key={p.key}
                        className={`text-xs px-2.5 py-1 rounded-full border
                          ${has
                            ? "border-purple-500/30 bg-purple-600/10 text-purple-300"
                            : "border-surface-700 text-surface-600"}`}
                      >
                        {p.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showForm || editRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <h2 className="font-semibold text-white">{editRole ? "Edit Role" : "New Role"}</h2>
              <button onClick={() => { setShowForm(false); setEditRole(null); }} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="label">Role Name *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Salesperson"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="label">Description</label>
                <input
                  className="input w-full"
                  placeholder="Brief description of this role"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <p className="label mb-3">Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSIONS.map((p) => {
                    const has = form.permissions.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        onClick={() => togglePerm(p.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all
                          ${has
                            ? "border-purple-500/50 bg-purple-600/20 text-purple-300"
                            : "border-surface-600 text-surface-400 hover:border-surface-500 hover:text-white"}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                          ${has ? "border-purple-500 bg-purple-500" : "border-surface-500"}`}>
                          {has && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditRole(null); }} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => {
                    if (editRole) updateMutation.mutate({ id: editRole.id, data: form });
                    else createMutation.mutate(form);
                  }}
                  disabled={!form.name || createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editRole ? "Update" : "Create"} Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
