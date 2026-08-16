"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  UserCheck,
  Plus,
  X,
  CheckCircle2,
  Trash2,
  Search,
  Lock,
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldX,
  Bell,
  XCircle,
  Hash,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI } from "@/lib/consent-api";
import { DEMO_CONSENTS } from "@/lib/demoData";
import type { ConsentGrant, ConsentScope, ConsentStatus } from "@/types/consent";

// ── Demo consent adapter ─────────────────────────────────────────────────────
function demoToGrant(c: any): ConsentGrant {
  return {
    id: c.id,
    patientId: "demo-patient",
    granteeId: `demo-doc-${c.id}`,
    granteeRole: "doctor",
    status: c.status === "Active" ? "APPROVED" : "EXPIRED",
    purpose: "Routine medical consultation",
    scope: c.scope as ConsentScope,
    doctorName: c.doctor_name,
    expiresAt: c.expires_at,
    createdAt: c.granted_at,
    updatedAt: c.granted_at,
  };
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ConsentStatus }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Active
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
        <Clock className="w-3 h-3 animate-pulse" /> Pending
      </span>
    );
  }
  if (status === "DENIED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium text-[10px] border border-rose-200">
        <XCircle className="w-3 h-3" /> Denied
      </span>
    );
  }
  if (status === "REVOKED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
        Revoked
      </span>
    );
  }
  if (status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium text-[10px] border border-orange-200">
        Expired
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PatientConsentPage() {
  const { user, isDemo } = useAuth();

  // Grants (APPROVED / REVOKED / EXPIRED / DENIED)
  const [grants, setGrants]           = useState<ConsentGrant[]>([]);
  // Pending incoming requests awaiting patient action
  const [pending, setPending]         = useState<ConsentGrant[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);

  const flash = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // ── Load data ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true);

    if (isDemo) {
      setGrants(DEMO_CONSENTS.map(demoToGrant));
      setPending([]);
      setIsLoading(false);
      return;
    }

    if (!user) {
      setGrants([]);
      setPending([]);
      setIsLoading(false);
      return;
    }

    const [allRes, pendingRes] = await Promise.all([
      ConsentAPI.getAllGrants(),
      ConsentAPI.getPendingRequests(),
    ]);

    setGrants(
      (allRes.data ?? []).filter(
        (g) => g.status !== "PENDING" // pending shown separately
      )
    );
    setPending(pendingRes.data ?? []);
    setIsLoading(false);
  }, [user, isDemo]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Patient actions ──────────────────────────────────────────────────────

  const handleApprove = async (consentId: string, doctorName?: string) => {
    if (isDemo) {
      // Demo: simulate approval
      const req = pending.find((p) => p.id === consentId);
      if (req) {
        setPending((prev) => prev.filter((p) => p.id !== consentId));
        setGrants((prev) => [
          {
            ...req,
            status: "APPROVED",
            consentHash: `demo-hash-${Date.now().toString(16)}`,
            blockchainTxHash: `0x${Date.now().toString(16)}abc`,
          },
          ...prev,
        ]);
        flash(`Access approved for ${doctorName || "doctor"}. Consent hash generated.`);
      }
      return;
    }

    setActionLoading(consentId);
    const { data, error } = await ConsentAPI.approveRequest(consentId);
    setActionLoading(null);
    if (error || !data) {
      flash(error || "Failed to approve request.", true);
      return;
    }
    setPending((prev) => prev.filter((p) => p.id !== consentId));
    setGrants((prev) => [data, ...prev]);
    flash(`✅ Access approved for ${doctorName || "physician"}. Cryptographic authorization issued.`);
  };

  const handleDeny = async (consentId: string, doctorName?: string) => {
    if (isDemo) {
      setPending((prev) => prev.filter((p) => p.id !== consentId));
      flash(`Request from ${doctorName || "doctor"} denied.`);
      return;
    }

    setActionLoading(consentId);
    const { data, error } = await ConsentAPI.denyRequest(consentId);
    setActionLoading(null);
    if (error || !data) {
      flash(error || "Failed to deny request.", true);
      return;
    }
    setPending((prev) => prev.filter((p) => p.id !== consentId));
    setGrants((prev) => [data, ...prev]);
    flash(`Request from ${doctorName || "physician"} has been denied.`);
  };

  const handleRevoke = async (consentId: string, doctorName?: string) => {
    if (!confirm(`Revoke access for ${doctorName || "this doctor"}? They will immediately lose access to your records.`)) return;

    if (isDemo) {
      setGrants((prev) =>
        prev.map((g) => (g.id === consentId ? { ...g, status: "REVOKED" } : g))
      );
      flash("Access revoked.");
      return;
    }

    setActionLoading(consentId);
    const { data, error } = await ConsentAPI.revokeGrant(consentId);
    setActionLoading(null);
    if (error || !data) {
      flash(error || "Failed to revoke consent.", true);
      return;
    }
    setGrants((prev) =>
      prev.map((g) => (g.id === consentId ? { ...g, status: "REVOKED" } : g))
    );
    flash("Consent revoked. Doctor access terminated immediately.");
  };

  const activeGrants  = grants.filter((g) => g.status === "APPROVED");
  const historyGrants = grants.filter((g) => g.status !== "APPROVED");

  return (
    <div className="space-y-8 font-body animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Key className="w-7 h-7 text-sky-600" />
            Consent &amp; Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage doctor access permissions. All grants are cryptographically signed and tamper-evident.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="relative flex items-center">
              <Bell className="w-5 h-5 text-amber-600" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            </span>
          )}
          <button
            onClick={loadAll}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Flash messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Pending Incoming Requests ──────────────────────────────────────── */}
      {(pending.length > 0 || isLoading) && (
        <div className="bg-white p-6 rounded-3xl border border-amber-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Incoming Access Requests
              </h3>
              <p className="text-xs text-slate-500">Physicians awaiting your authorization</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              {pending.length} Pending
            </span>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
              Checking for new requests...
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                        <UserCheck className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {req.doctorName || "Unknown Physician"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Scope: <strong className="text-slate-700">{req.scope}</strong> · 
                          Expires: {req.expiresAt ? new Date(req.expiresAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="PENDING" />
                  </div>

                  {req.purpose && (
                    <p className="text-xs text-slate-600 bg-white/80 px-3 py-2 rounded-xl border border-amber-100 italic">
                      "{req.purpose}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(req.id, req.doctorName)}
                      disabled={actionLoading === req.id}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 min-h-[38px]"
                    >
                      {actionLoading === req.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Approve & Sign
                    </button>
                    <button
                      onClick={() => handleDeny(req.id, req.doctorName)}
                      disabled={actionLoading === req.id}
                      className="flex-1 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 min-h-[38px]"
                    >
                      <ShieldX className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active Grants ──────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Authorized Healthcare Providers</h3>
            <p className="text-xs text-slate-500">Physicians currently allowed to access your records</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
            {activeGrants.length} Active
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold animate-pulse flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
            <span>Fetching access permissions...</span>
          </div>
        ) : activeGrants.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Lock className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Active Permissions</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your health vault is strictly private. Pending doctor requests will appear above when received.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="pb-3 px-2">Doctor / Facility</th>
                  <th className="pb-3 px-2">Scope</th>
                  <th className="pb-3 px-2">Granted</th>
                  <th className="pb-3 px-2">Expires</th>
                  <th className="pb-3 px-2">Hash</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeGrants.map((grant) => (
                  <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 font-bold flex items-center justify-center border border-sky-200">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {grant.doctorName || "Authorized Physician"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            {grant.granteeRole}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {grant.scope}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-slate-600 font-mono">
                      {new Date(grant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-2 text-slate-600 font-mono">
                      {grant.expiresAt ? new Date(grant.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-4 px-2">
                      {grant.consentHash ? (
                        <span
                          title={`SHA-256: ${grant.consentHash}`}
                          className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                        >
                          <Hash className="w-2.5 h-2.5" />
                          {grant.consentHash.substring(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <button
                        onClick={() => handleRevoke(grant.id, grant.doctorName)}
                        disabled={actionLoading === grant.id}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors flex items-center gap-1 ml-auto disabled:opacity-60"
                      >
                        {actionLoading === grant.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Consent History ─────────────────────────────────────────────────── */}
      {historyGrants.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Access History</h3>
            <p className="text-xs text-slate-500">Expired, revoked, and denied requests</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="pb-3 px-2">Doctor</th>
                  <th className="pb-3 px-2">Purpose</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyGrants.map((grant) => (
                  <tr key={grant.id} className="hover:bg-slate-50 transition-colors opacity-70">
                    <td className="py-3 px-2 font-medium text-slate-700">
                      {grant.doctorName || "Physician"}
                    </td>
                    <td className="py-3 px-2 text-slate-500 max-w-[200px] truncate">
                      {grant.purpose || "—"}
                    </td>
                    <td className="py-3 px-2 text-slate-400 font-mono">
                      {new Date(grant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={grant.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
