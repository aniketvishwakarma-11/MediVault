"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Stethoscope,
  Building2,
  Shield,
  User,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Edit3,
  X,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  patient_id?: string;
  blood_group?: string;
  date_of_birth?: string;
  doctor_id?: string;
  license_number?: string;
  specialization?: string;
  hospital_name?: string;
  verification_status?: string;
  document_count?: number;
  active_consents_count?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_BADGES: Record<string, { label: string; color: string; icon: any }> = {
  patient: {
    label: "Patient",
    color: "bg-cyan-50 text-[#0891B2] border-cyan-200",
    icon: User,
  },
  doctor: {
    label: "Doctor",
    color: "bg-teal-50 text-[#0D9488] border-teal-200",
    icon: Stethoscope,
  },
  hospital: {
    label: "Hospital",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Building2,
  },
  admin: {
    label: "Admin",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Shield,
  },
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal / Drawer state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState("patient");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = useCallback(async (pageToLoad = 1) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "15",
        search: search.trim(),
        role: selectedRole,
      });

      const res = await fetch(`${API_BASE_URL}/admin/users?${queryParams}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.users) {
        setUsers(json.data.users);
        if (json.data.pagination) {
          setPagination(json.data.pagination);
        }
      }
    } catch (err) {
      console.warn("[AdminUsers] Failed to fetch users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedRole]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers(pagination.page);
  };

  const handleViewUser = async (userId: string) => {
    setDetailLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data) {
        setSelectedUser(json.data);
      }
    } catch (err) {
      console.warn("[AdminUsers] Failed to fetch user details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    setUpdatingRole(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/users/${roleModalUser.id}/role`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setActionSuccess(`Role for ${roleModalUser.full_name} updated to ${newRole.toUpperCase()}`);
      setTimeout(() => setActionSuccess(null), 4000);

      setRoleModalUser(null);
      fetchUsers(pagination.page);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Page Title & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] text-xs font-bold uppercase tracking-wider border border-cyan-200 mb-1.5">
            <Users className="w-3.5 h-3.5" />
            User Governance &amp; Directory
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Directory of all registered patients, physicians, hospital accounts, and platform administrators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#0891B2] ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
          <Link
            href="/admin/doctors/verification"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[40px]"
          >
            <Stethoscope className="w-4 h-4" />
            Verification Queue
          </Link>
        </div>
      </div>

      {/* ─── Success Toast Banner ─── */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by name, email address, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0891B2] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 [scrollbar-width:none]">
            {[
              { key: "all", label: "All Roles", count: pagination.total },
              { key: "patient", label: "Patients", icon: User },
              { key: "doctor", label: "Doctors", icon: Stethoscope },
              { key: "hospital", label: "Hospitals", icon: Building2 },
              { key: "admin", label: "Admins", icon: Shield },
            ].map((tab) => {
              const isSelected = selectedRole === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedRole(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#0891B2] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Users Data Table ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">User / Identity</th>
                <th className="py-3.5 px-4">Platform Role</th>
                <th className="py-3.5 px-4">Role-Specific Details</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-10 w-44 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No users found matching your search</p>
                    <p className="text-xs text-slate-400">Try adjusting your filters or search keywords</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleConfig = ROLE_BADGES[u.role] || ROLE_BADGES.patient;
                  const RoleIcon = roleConfig.icon;
                  const initials = u.full_name
                    ? u.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "US";

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-cyan-50/30 transition-colors group"
                    >
                      {/* Identity */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 font-heading">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-sm text-[#0F172A] truncate">
                              {u.full_name || "Unnamed User"}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleConfig.color}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Role-Specific Details */}
                      <td className="py-4 px-4">
                        {u.role === "doctor" ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-xs text-[#0F172A]">
                              {u.specialization || "General Practice"}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {u.license_number || "No License"}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  u.verification_status?.toUpperCase() === "VERIFIED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : u.verification_status?.toUpperCase() === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {u.verification_status || "PENDING"}
                              </span>
                            </div>
                          </div>
                        ) : u.role === "patient" ? (
                          <div className="space-y-0.5">
                            <p className="text-xs text-slate-700 font-medium">
                              Blood: <span className="font-bold text-[#0891B2]">{u.blood_group || "—"}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {u.document_count || 0} documents · {u.active_consents_count || 0} active consents
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Platform Admin</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-600 font-mono">
                          {u.phone && u.phone !== "Not provided" ? u.phone : "—"}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewUser(u.id)}
                            disabled={detailLoading}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
                            title="View Full Profile & Vault History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setRoleModalUser(u);
                              setNewRole(u.role);
                            }}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                            title="Change User Role"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {u.role === "doctor" && u.verification_status?.toLowerCase() !== "verified" && (
                            <Link
                              href="/admin/doctors/verification"
                              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold transition-all inline-flex items-center gap-1"
                              title="Review Credentials in Verification Queue"
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              <span>Review</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Showing <span className="font-bold text-[#0F172A]">{users.length}</span> of{" "}
            <span className="font-bold text-[#0F172A]">{pagination.total}</span> registered users
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-600 px-2 font-mono">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Change Role Modal ─── */}
      {roleModalUser && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setRoleModalUser(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-50 text-[#0891B2]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-[#0F172A] text-base">
                  Update Platform Role
                </h3>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="text-xs text-slate-500 font-medium">Selected User</p>
              <p className="font-heading font-bold text-sm text-[#0F172A]">
                {roleModalUser.full_name}
              </p>
              <p className="text-xs text-slate-500 font-mono">{roleModalUser.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Assign New Role</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "patient", label: "Patient", icon: User, desc: "Personal Health Vault" },
                  { key: "doctor", label: "Doctor", icon: Stethoscope, desc: "Clinical EMR Portal" },
                  { key: "hospital", label: "Hospital", icon: Building2, desc: "Organization Node" },
                  { key: "admin", label: "Admin", icon: Shield, desc: "System Administration" },
                ].map((r) => {
                  const isSelected = newRole === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setNewRole(r.key)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-50 border-[#0891B2] text-[#0891B2] shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <r.icon className="w-4 h-4" />
                        <span className="font-heading font-bold text-xs">{r.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{r.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={updatingRole}
                className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {updatingRole ? "Updating..." : "Save Role Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detailed User View Drawer ─── */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0 font-heading">
                  {selectedUser.full_name?.slice(0, 2).toUpperCase() || "US"}
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">
                    {selectedUser.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role & Core Demographics */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Account Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Role</p>
                  <p className="text-sm font-bold text-[#0891B2] capitalize mt-0.5">
                    {selectedUser.role}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Phone</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5 font-mono">
                    {selectedUser.phone || "Not provided"}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">User ID (UUID)</p>
                  <p className="text-[11px] font-mono text-slate-600 truncate mt-0.5">
                    {selectedUser.id}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Created On</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5 font-mono">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Doctor Specific Info */}
            {selectedUser.role === "doctor" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                  Physician Credentials
                </h4>
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">License Number</span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {selectedUser.license_number || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Specialization</span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedUser.specialization || "General Practice"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Hospital Affiliation</span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedUser.hospital_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Verification Status</span>
                    <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md uppercase">
                      {selectedUser.verification_status || "PENDING"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Patient Specific Info */}
            {selectedUser.role === "patient" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                  Clinical Demographics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Blood Group</p>
                    <p className="text-base font-bold text-[#0891B2] mt-0.5">
                      {selectedUser.blood_group || "—"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Date of Birth</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5 font-mono">
                      {selectedUser.date_of_birth || "—"}
                    </p>
                  </div>
                </div>

                {/* Recent Documents */}
                {selectedUser.recent_documents?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold text-slate-600">Recent Medical Documents</h5>
                    <div className="space-y-1.5">
                      {selectedUser.recent_documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-[#0891B2] shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {doc.document_name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Audit Activity */}
            {selectedUser.recent_audit_logs?.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                  Recent User Activity
                </h4>
                <div className="space-y-1.5">
                  {selectedUser.recent_audit_logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                    >
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-[#0891B2]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
