"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, roleApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Users, Plus, Pencil, Trash2, Shield, X, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { User, Role } from "@/types";
import { useAuth } from "@/hooks/useAuth";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role_id: string;
}

const EMPTY_FORM: UserForm = { name: "", email: "", password: "", role_id: "" };

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => userApi.list({ search }),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d: UserForm) => userApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserForm> }) => userApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      setEditUser(null);
    },
    onError: () => toast.error("Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete user"),
  });

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role_id: u.role_id ?? "" });
  }

  function f(key: keyof UserForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  const roleMap: Record<string, Role> = {};
  roles?.forEach((r: Role) => { roleMap[r.id] = r; });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-surface-400 text-sm">Manage team members and access</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : !users?.length ? (
          <div className="col-span-full text-center py-16 text-surface-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No users found
          </div>
        ) : (
          users.map((u: User) => (
            <div key={u.id} className="card flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{u.name}</p>
                    <p className="text-xs text-surface-400">{u.email}</p>
                  </div>
                </div>
                {me?.id !== u.id && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-red-900/30 text-surface-400 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-surface-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300">{u.role_id ? (roleMap[u.role_id]?.name ?? u.role_id) : "—"}</span>
                </div>
                <span>Joined {formatDate(u.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showForm || editUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <h2 className="font-semibold text-white">{editUser ? "Edit User" : "Add User"}</h2>
              <button onClick={() => { setShowForm(false); setEditUser(null); }} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="label">Full Name *</label>
                <input className="input w-full" placeholder="Jane Doe" {...f("name")} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Email *</label>
                <input type="email" className="input w-full" placeholder="jane@example.com" {...f("email")} />
              </div>
              <div className="space-y-1.5">
                <label className="label">{editUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" className="input w-full" placeholder="••••••••" {...f("password")} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Role *</label>
                <select className="input w-full" {...f("role_id")}>
                  <option value="">Select role…</option>
                  {roles?.map((r: Role) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditUser(null); }} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => {
                    if (editUser) {
                      const data: Partial<UserForm> = { name: form.name, email: form.email, role_id: form.role_id };
                      if (form.password) data.password = form.password;
                      updateMutation.mutate({ id: editUser.id, data });
                    } else {
                      createMutation.mutate(form);
                    }
                  }}
                  disabled={!form.name || !form.email || !form.role_id || createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editUser ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-white mb-2">Delete User</h3>
            <p className="text-surface-400 text-sm mb-6">
              Remove <strong className="text-white">{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
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
