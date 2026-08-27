"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Download,
  Eye,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Clock,
  HardDrive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  FileCode,
  FileSpreadsheet,
  FileCheck2,
  Database,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface DocumentRecord {
  id: string;
  document_name: string;
  document_category: string;
  file_extension: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  storage_path: string;
  created_at: string;
  patient_id: string;
  user_id: string;
  patient_name: string;
  patient_email: string;
  analysis_id?: string;
  model_name?: string;
  execution_time_ms?: number;
  clinical_summary?: string;
  blockchain_tx_hash?: string;
  blockchain_block_number?: number;
}

interface StorageStats {
  total_documents: number;
  total_storage_bytes: number;
  uploads_7d: number;
  analyzed_percentage: number;
  total_notarized: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  lab_report: { label: "Lab Report", color: "bg-cyan-50 text-[#0891B2] border-cyan-200" },
  prescription: { label: "Prescription", color: "bg-teal-50 text-[#0D9488] border-teal-200" },
  radiology: { label: "Radiology / Imaging", color: "bg-blue-50 text-blue-700 border-blue-200" },
  discharge_summary: { label: "Discharge Summary", color: "bg-purple-50 text-purple-700 border-purple-200" },
  insurance: { label: "Insurance / Claim", color: "bg-amber-50 text-amber-700 border-amber-200" },
  vaccination: { label: "Vaccination", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  other: { label: "General Record", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AdminDocumentsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Drawer / Details state
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const fetchDocuments = useCallback(async (pageToLoad = 1) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "15",
        search: search.trim(),
        category: selectedCategory,
        status: selectedStatus,
      });

      const [docsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/documents?${queryParams}`, { headers }),
        fetch(`${API_BASE_URL}/admin/storage/stats`, { headers }),
      ]);

      if (docsRes.ok) {
        const docsJson = await docsRes.json();
        if (docsJson?.data?.documents) setDocuments(docsJson.data.documents);
        if (docsJson?.data?.pagination) setPagination(docsJson.data.pagination);
      }

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson?.data) setStorageStats(statsJson.data);
      }
    } catch (err) {
      console.warn("[AdminDocuments] Failed to fetch documents:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchDocuments(1);
  }, [fetchDocuments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments(pagination.page);
  };

  const handleViewDetails = async (docId: string) => {
    setDrawerLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/documents/${docId}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data) {
        setSelectedDoc(json.data);
      }
    } catch (err) {
      console.warn("[AdminDocuments] Failed to fetch document details:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDirectDownload = async (docId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/documents/${docId}/download`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.data?.download_url) {
        window.open(json.data.download_url, "_blank");
      }
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to permanently purge "${docName}" from the platform?\n\nThis will delete the file from MinIO storage and cascade delete all associated AI analyses, lab parameters, and medications.`)) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/documents/${docId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess("Document and all associated clinical entities permanently purged.");
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      fetchDocuments(pagination.page);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Page Title & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] text-xs font-bold uppercase tracking-wider border border-cyan-200 mb-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            MinIO Object Storage &amp; Document Registry
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
            Document Registry
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cryptographically verified health records, clinical document versions, and AI extraction payloads.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-[#0891B2] ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing..." : "Refresh"}
        </button>
      </div>

      {/* ─── Storage Capacity & AI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Records in Vault",
            value: storageStats?.total_documents ?? "—",
            sub: `+${storageStats?.uploads_7d ?? 0} uploaded this week`,
            icon: FileText,
            color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
          },
          {
            label: "Encrypted Storage Used",
            value: storageStats ? formatBytes(storageStats.total_storage_bytes) : "—",
            sub: "Stored across MinIO clusters",
            icon: HardDrive,
            color: "bg-teal-50 text-[#0D9488] border border-teal-200/80",
          },
          {
            label: "AI Parsed & Structured",
            value: `${storageStats?.analyzed_percentage ?? 0}%`,
            sub: "Extracted into medical knowledge",
            icon: Brain,
            color: "bg-purple-50 text-purple-600 border border-purple-200/80",
          },
          {
            label: "Blockchain Notarized",
            value: storageStats?.total_notarized ?? 0,
            sub: "Anchored to Polygon Amoy Testnet",
            icon: ShieldCheck,
            color: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-2xl ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-heading font-extrabold text-2xl text-[#0F172A]">
                  {loading ? (
                    <span className="inline-block w-14 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    kpi.value.toLocaleString()
                  )}
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Search & Category Filters Bar ─── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by document name, patient name, or SHA-256 checksum..."
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

          {/* Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400">AI Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891B2] cursor-pointer"
            >
              <option value="all">All Documents</option>
              <option value="analyzed">Analyzed (Completed)</option>
              <option value="pending">Pending Analysis</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[
            { key: "all", label: "All Modalities" },
            { key: "lab_report", label: "Lab Reports" },
            { key: "prescription", label: "Prescriptions" },
            { key: "radiology", label: "Imaging & Radiology" },
            { key: "discharge_summary", label: "Discharge Summaries" },
            { key: "insurance", label: "Insurance Claims" },
            { key: "other", label: "Other Records" },
          ].map((tab) => {
            const isSelected = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#0891B2] text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Documents Data Table ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Document / File</th>
                <th className="py-3.5 px-4">Patient Vault</th>
                <th className="py-3.5 px-4">Modality</th>
                <th className="py-3.5 px-4">File Size</th>
                <th className="py-3.5 px-4">AI Analysis</th>
                <th className="py-3.5 px-4">Notarization</th>
                <th className="py-3.5 px-4">Uploaded</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-10 w-44 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No documents found matching filters</p>
                    <p className="text-xs text-slate-400">Try selecting another modality or clearing search keywords</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const catStyle = CATEGORY_STYLES[doc.document_category] || CATEGORY_STYLES.other;
                  const isAnalyzed = Boolean(doc.analysis_id);

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-cyan-50/30 transition-colors group"
                    >
                      {/* Document Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase shrink-0 font-mono">
                            {doc.file_extension || "DOC"}
                          </div>
                          <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                            <p className="font-heading font-bold text-sm text-[#0F172A] truncate" title={doc.document_name}>
                              {doc.document_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              SHA: {doc.checksum_sha256 ? `${doc.checksum_sha256.slice(0, 12)}…` : "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Patient Vault */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-xs text-[#0F172A] truncate">
                          {doc.patient_name || "Unknown Patient"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {doc.patient_email}
                        </p>
                      </td>

                      {/* Modality */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.color}`}
                        >
                          {catStyle.label}
                        </span>
                      </td>

                      {/* File Size */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs text-slate-600">
                          {formatBytes(doc.file_size_bytes)}
                        </span>
                      </td>

                      {/* AI Status */}
                      <td className="py-4 px-4">
                        {isAnalyzed ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              <Brain className="w-3 h-3" /> Analyzed
                            </span>
                            {doc.execution_time_ms && (
                              <p className="text-[9px] text-slate-400 font-mono">
                                {doc.execution_time_ms} ms
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Notarization */}
                      <td className="py-4 px-4">
                        {doc.blockchain_tx_hash ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" /> Polygon
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Standard Vault</span>
                        )}
                      </td>

                      {/* Uploaded */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(doc.id)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                            title="Inspect Metadata & AI Extraction Drawer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDirectDownload(doc.id)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                            title="Download Raw File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.document_name)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 transition-all cursor-pointer"
                            title="Purge Document & All AI Entities"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
            Showing <span className="font-bold text-[#0F172A]">{documents.length}</span> of{" "}
            <span className="font-bold text-[#0F172A]">{pagination.total}</span> total documents
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDocuments(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-600 px-2 font-mono">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchDocuments(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Document Detail & AI Extraction Drawer ─── */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white flex items-center justify-center font-bold text-sm uppercase shrink-0 font-heading shadow-xs">
                  {selectedDoc.file_extension || "DOC"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A] truncate" title={selectedDoc.document_name}>
                    {selectedDoc.document_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatBytes(selectedDoc.file_size_bytes)} · {selectedDoc.mime_type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            {selectedDoc.download_url && (
              <div className="flex items-center gap-3">
                <a
                  href={selectedDoc.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Open Secure Preview
                </a>
                <a
                  href={selectedDoc.download_url}
                  download={selectedDoc.document_name}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            )}

            {/* Patient Ownership Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Patient Vault Identity
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Patient Name:</span>
                  <p className="font-bold text-[#0F172A]">{selectedDoc.patient_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <p className="font-bold text-slate-700 font-mono truncate">{selectedDoc.patient_email}</p>
                </div>
                <div>
                  <span className="text-slate-400">Blood Group:</span>
                  <p className="font-bold text-[#0891B2]">{selectedDoc.blood_group || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Uploaded On:</span>
                  <p className="font-bold text-slate-700 font-mono">
                    {new Date(selectedDoc.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Cryptographic Hash & Storage Path */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Cryptographic Storage Specs
              </h4>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">SHA-256 Content Hash</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="font-mono text-[11px] text-slate-800 break-all bg-white p-2 rounded-xl border border-slate-200 flex-1">
                      {selectedDoc.checksum_sha256}
                    </p>
                    <button
                      onClick={() => handleCopy(selectedDoc.checksum_sha256)}
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      title="Copy SHA-256"
                    >
                      {copiedHash ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">MinIO Bucket Path</span>
                  <p className="font-mono text-[11px] text-slate-700 mt-0.5 truncate bg-white p-2 rounded-xl border border-slate-200">
                    {selectedDoc.storage_path}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Medical Extraction Section */}
            {selectedDoc.analysis_id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-widest font-heading flex items-center gap-1.5">
                    <Brain className="w-4 h-4" /> AI Clinical Intelligence
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {selectedDoc.model_name || "Gemini 1.5 Flash"} · {selectedDoc.execution_time_ms} ms
                  </span>
                </div>

                {/* Clinical Summary */}
                {selectedDoc.clinical_summary && (
                  <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs space-y-1">
                    <p className="font-bold text-purple-900">Extracted Clinical Summary</p>
                    <p className="text-slate-700 leading-relaxed">{selectedDoc.clinical_summary}</p>
                  </div>
                )}

                {/* Extracted Biomarkers Table */}
                {selectedDoc.medical_knowledge?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Structured Medical Findings</p>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="py-2 px-3">Biomarker / Finding</th>
                            <th className="py-2 px-3">Observed Value</th>
                            <th className="py-2 px-3">Ref Range</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDoc.medical_knowledge.map((mk: any) => (
                            <tr key={mk.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-800">{mk.name}</td>
                              <td className="py-2 px-3 font-mono text-[#0891B2] font-bold">
                                {mk.value} {mk.unit || ""}
                              </td>
                              <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                                {mk.reference_range || "—"}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    mk.status === "critical"
                                      ? "bg-rose-100 text-rose-800"
                                      : mk.status === "abnormal"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {mk.status || "normal"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                No AI analysis generated for this document yet.
              </div>
            )}

            {/* Blockchain Notarization Proof */}
            {selectedDoc.blockchain_tx_hash && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest font-heading flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Blockchain Proof of Integrity
                </h4>
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Network</span>
                    <span className="font-bold text-emerald-800">
                      {selectedDoc.blockchain_network || "Polygon Amoy Testnet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Block Number</span>
                    <span className="font-mono font-bold text-slate-900">
                      #{selectedDoc.blockchain_block_number || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Transaction Hash</span>
                    <p className="font-mono text-[10px] text-emerald-900 break-all bg-white p-2 rounded-xl border border-emerald-200 mt-1">
                      {selectedDoc.blockchain_tx_hash}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
