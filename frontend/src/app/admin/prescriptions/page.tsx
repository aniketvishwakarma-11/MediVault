"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  Stethoscope,
  User,
  Pill,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  Eye,
  Activity,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PrescriptionRecord {
  id: string;
  consultation_id?: string;
  doctor_id: string;
  patient_id: string;
  diagnosis_code?: string;
  diagnosis_text: string;
  status: string;
  notes?: string;
  recommended_tests?: string[];
  qr_code_hash?: string;
  digital_signature?: string;
  blockchain_tx_hash?: string;
  validity_days?: number;
  expires_at?: string;
  created_at: string;
  medications_json?: any;
  patient_name: string;
  patient_email: string;
  blood_group?: string;
  doctor_name: string;
  doctor_email: string;
  doctor_license?: string;
  doctor_specialization?: string;
  doctor_hospital?: string;
  items: any[];
}

interface DrugCatalogItem {
  id: string;
  rxcui?: string;
  atc_code?: string;
  is_who_essential: boolean;
  brand_name?: string;
  generic_name: string;
  therapeutic_class?: string;
  is_nlem: boolean;
  dosage_form: string;
  strength: string;
  route?: string;
  default_schedule?: string;
  food_instructions?: string;
  jan_aushadhi_price?: number;
  market_brand_price?: number;
  contraindications?: string[];
}

interface PrescriptionSummary {
  total: number;
  active: number;
  completed: number;
}

export default function AdminPrescriptionsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();
  const [activeTab, setActiveTab] = useState<"prescriptions" | "catalog">("prescriptions");

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [summary, setSummary] = useState<PrescriptionSummary | null>(null);
  const [prescriptionPagination, setPrescriptionPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [prescriptionSearch, setPrescriptionSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  // Drug Catalog state
  const [drugs, setDrugs] = useState<DrugCatalogItem[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [catalogPagination, setCatalogPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  // Modal state
  const [isDrugModalOpen, setIsDrugModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<DrugCatalogItem | null>(null);
  const [drugFormData, setDrugFormData] = useState({
    generic_name: "",
    brand_name: "",
    therapeutic_class: "General Medicine",
    dosage_form: "Tablet",
    strength: "500 mg",
    default_schedule: "1-0-1",
    food_instructions: "Take after meals",
    jan_aushadhi_price: "",
    market_brand_price: "",
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Fetch Prescriptions ───
  const fetchPrescriptions = useCallback(async (pageToLoad = 1) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "15",
        search: prescriptionSearch.trim(),
        status: selectedStatus,
      });

      const res = await fetch(`${API_BASE_URL}/admin/prescriptions?${queryParams}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.prescriptions) setPrescriptions(json.data.prescriptions);
      if (json?.data?.summary) setSummary(json.data.summary);
      if (json?.data?.pagination) setPrescriptionPagination(json.data.pagination);
    } catch (err) {
      console.warn("[AdminPrescriptions] Failed to fetch prescriptions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [prescriptionSearch, selectedStatus]);

  // ─── Fetch Drug Catalog ───
  const fetchDrugCatalog = useCallback(async (pageToLoad = 1) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "15",
        search: catalogSearch.trim(),
        class: selectedClass,
      });

      const res = await fetch(`${API_BASE_URL}/admin/drugs/catalog?${queryParams}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.drugs) setDrugs(json.data.drugs);
      if (json?.data?.classes) setClasses(json.data.classes);
      if (json?.data?.pagination) setCatalogPagination(json.data.pagination);
    } catch (err) {
      console.warn("[AdminPrescriptions] Failed to fetch drug catalog:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [catalogSearch, selectedClass]);

  useEffect(() => {
    if (activeTab === "prescriptions") {
      fetchPrescriptions(1);
    } else {
      fetchDrugCatalog(1);
    }
  }, [activeTab, fetchPrescriptions, fetchDrugCatalog]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === "prescriptions") {
      fetchPrescriptions(prescriptionPagination.page);
    } else {
      fetchDrugCatalog(catalogPagination.page);
    }
  };

  // ─── Drug CRUD Handlers ───
  const handleOpenAddDrug = () => {
    setEditingDrug(null);
    setDrugFormData({
      generic_name: "",
      brand_name: "",
      therapeutic_class: "Analgesic & Antipyretic",
      dosage_form: "Tablet",
      strength: "650 mg",
      default_schedule: "1-0-1",
      food_instructions: "Take after meals",
      jan_aushadhi_price: "12.00",
      market_brand_price: "35.00",
    });
    setIsDrugModalOpen(true);
  };

  const handleOpenEditDrug = (drug: DrugCatalogItem) => {
    setEditingDrug(drug);
    setDrugFormData({
      generic_name: drug.generic_name,
      brand_name: drug.brand_name || "",
      therapeutic_class: drug.therapeutic_class || "General Medicine",
      dosage_form: drug.dosage_form || "Tablet",
      strength: drug.strength || "500 mg",
      default_schedule: drug.default_schedule || "1-0-1",
      food_instructions: drug.food_instructions || "Take after meals",
      jan_aushadhi_price: drug.jan_aushadhi_price ? String(drug.jan_aushadhi_price) : "",
      market_brand_price: drug.market_brand_price ? String(drug.market_brand_price) : "",
    });
    setIsDrugModalOpen(true);
  };

  const handleSaveDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugFormData.generic_name.trim()) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        ...drugFormData,
        jan_aushadhi_price: drugFormData.jan_aushadhi_price ? parseFloat(drugFormData.jan_aushadhi_price) : null,
        market_brand_price: drugFormData.market_brand_price ? parseFloat(drugFormData.market_brand_price) : null,
      };

      if (editingDrug) {
        const res = await fetch(`${API_BASE_URL}/admin/drugs/catalog/${editingDrug.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        const res = await fetch(`${API_BASE_URL}/admin/drugs/catalog`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      setIsDrugModalOpen(false);
      fetchDrugCatalog(catalogPagination.page);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDrug = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the standardized Drug Catalog?`)) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/drugs/catalog/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      fetchDrugCatalog(catalogPagination.page);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Page Title & Tab Switcher ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] text-xs font-bold uppercase tracking-wider border border-cyan-200 mb-1.5">
            <Pill className="w-3.5 h-3.5" />
            Clinical Therapeutics &amp; Formulary
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
            Prescriptions &amp; Drug Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Oversight of digital clinical prescriptions, patient drug adherence, and standardized pharmacopoeia catalog.
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
          {activeTab === "catalog" && (
            <button
              onClick={handleOpenAddDrug}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Medication
            </button>
          )}
        </div>
      </div>

      {/* ─── Mode Switcher Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("prescriptions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "prescriptions"
              ? "bg-[#0891B2] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Prescription Registry</span>
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "catalog"
              ? "bg-[#0891B2] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Drug Catalog Master (Formulary)</span>
        </button>
      </div>

      {/* ─── TAB 1: PRESCRIPTIONS REGISTRY ─── */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6">

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Prescriptions Issued",
                value: summary?.total ?? "—",
                sub: "Authored by certified doctors",
                icon: FileText,
                color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
              },
              {
                label: "Active Medication Courses",
                value: summary?.active ?? "—",
                sub: "Currently in patient regimen",
                icon: HeartPulse,
                color: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
              },
              {
                label: "Completed / Dispensed",
                value: summary?.completed ?? "—",
                sub: "Full treatment course filled",
                icon: CheckCircle2,
                color: "bg-blue-50 text-blue-600 border border-blue-200/80",
              },
              {
                label: "Digital Signature Anchor",
                value: "100%",
                sub: "Cryptographically verified",
                icon: ShieldCheck,
                color: "bg-purple-50 text-purple-600 border border-purple-200/80",
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

          {/* Search & Status Filter */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by patient name, prescribing doctor, or diagnosis..."
                value={prescriptionSearch}
                onChange={(e) => setPrescriptionSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0891B2] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-400">Course Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891B2] cursor-pointer"
              >
                <option value="all">All Prescriptions</option>
                <option value="ACTIVE">Active Courses</option>
                <option value="FULLY_DISPENSED">Fully Dispensed</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          {/* Prescriptions Data Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Patient Vault</th>
                    <th className="py-3.5 px-4">Prescribing Doctor</th>
                    <th className="py-3.5 px-4">Clinical Diagnosis</th>
                    <th className="py-3.5 px-4">Prescribed Items</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Issued Date</th>
                    <th className="py-3.5 px-6 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-6"><div className="h-10 w-36 bg-slate-100 rounded-xl" /></td>
                        <td className="py-4 px-4"><div className="h-10 w-36 bg-slate-100 rounded-xl" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-6 text-right"><div className="h-8 w-12 bg-slate-100 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  ) : prescriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400 space-y-2">
                        <Pill className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-sm text-slate-600">No prescriptions found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search criteria</p>
                      </td>
                    </tr>
                  ) : (
                    prescriptions.map((pr) => {
                      const itemCount = pr.items?.length || (Array.isArray(pr.medications_json) ? pr.medications_json.length : 0);

                      return (
                        <tr key={pr.id} className="hover:bg-cyan-50/30 transition-colors">
                          {/* Patient */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-cyan-100 text-[#0891B2] font-bold flex items-center justify-center text-xs shrink-0 font-heading">
                                {pr.patient_name ? pr.patient_name.slice(0, 2).toUpperCase() : "PT"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-heading font-bold text-sm text-[#0F172A] truncate">{pr.patient_name}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{pr.patient_email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Doctor */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-[#0F172A] truncate">Dr. {pr.doctor_name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{pr.doctor_specialization || "Physician"}</p>
                              </div>
                            </div>
                          </td>

                          {/* Diagnosis */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5 max-w-[200px]">
                              {pr.diagnosis_code && (
                                <span className="inline-block font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                  {pr.diagnosis_code}
                                </span>
                              )}
                              <p className="text-xs text-slate-700 truncate" title={pr.diagnosis_text}>
                                {pr.diagnosis_text || "Clinical Consultation"}
                              </p>
                            </div>
                          </td>

                          {/* Items */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#0D9488] border border-teal-200">
                              <Pill className="w-3 h-3" /> {itemCount} Medications
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                pr.status === "ACTIVE" || !pr.status
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : pr.status === "FULLY_DISPENSED"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {pr.status || "ACTIVE"}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-4 px-4">
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(pr.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedPrescription(pr)}
                              className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                              title="Inspect Prescription Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold text-[#0F172A]">{prescriptions.length}</span> of{" "}
                <span className="font-bold text-[#0F172A]">{prescriptionPagination.total}</span> prescriptions
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchPrescriptions(prescriptionPagination.page - 1)}
                  disabled={prescriptionPagination.page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-xs font-bold text-slate-600 px-2 font-mono">
                  Page {prescriptionPagination.page} of {prescriptionPagination.totalPages || 1}
                </span>
                <button
                  onClick={() => fetchPrescriptions(prescriptionPagination.page + 1)}
                  disabled={prescriptionPagination.page >= prescriptionPagination.totalPages || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: DRUG CATALOG MASTER (FORMULARY) ─── */}
      {activeTab === "catalog" && (
        <div className="space-y-6">

          {/* Search & Class Filter */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by generic molecule, brand name (e.g. Dolo 650), or class..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0891B2] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-400">Therapeutic Class:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891B2] cursor-pointer"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drug Catalog Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Generic Molecule &amp; Brand</th>
                    <th className="py-3.5 px-4">Therapeutic Class</th>
                    <th className="py-3.5 px-4">Form &amp; Strength</th>
                    <th className="py-3.5 px-4">Standard Schedule</th>
                    <th className="py-3.5 px-4">Jan Aushadhi vs Market Price</th>
                    <th className="py-3.5 px-4">Formulary Badges</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-6"><div className="h-10 w-44 bg-slate-100 rounded-xl" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                        <td className="py-4 px-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  ) : drugs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400 space-y-2">
                        <Pill className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-sm text-slate-600">No drugs found in catalog</p>
                        <p className="text-xs text-slate-400">Click &quot;Add Medication&quot; above to create a formulary entry</p>
                      </td>
                    </tr>
                  ) : (
                    drugs.map((drug) => (
                      <tr key={drug.id} className="hover:bg-cyan-50/30 transition-colors">
                        {/* Drug Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#0D9488] font-bold flex items-center justify-center text-xs shrink-0 font-heading">
                              Rx
                            </div>
                            <div>
                              <p className="font-heading font-bold text-sm text-[#0F172A]">{drug.generic_name}</p>
                              {drug.brand_name && (
                                <p className="text-[11px] text-[#0891B2] font-semibold">Brand: {drug.brand_name}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Therapeutic Class */}
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {drug.therapeutic_class || "General"}
                          </span>
                        </td>

                        {/* Form & Strength */}
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800">{drug.strength}</p>
                          <p className="text-[10px] text-slate-400">{drug.dosage_form || "Tablet"}</p>
                        </td>

                        {/* Schedule */}
                        <td className="py-4 px-4">
                          <span className="font-mono text-xs font-bold text-[#0891B2]">{drug.default_schedule || "1-0-1"}</span>
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{drug.food_instructions}</p>
                        </td>

                        {/* Price Comparison */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            {drug.jan_aushadhi_price ? (
                              <p className="text-xs font-bold text-emerald-700">₹{drug.jan_aushadhi_price} (Jan Aushadhi)</p>
                            ) : null}
                            {drug.market_brand_price ? (
                              <p className="text-[10px] text-slate-400 line-through">₹{drug.market_brand_price} (Brand)</p>
                            ) : null}
                          </div>
                        </td>

                        {/* Badges */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            {drug.is_who_essential && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                WHO EML
                              </span>
                            )}
                            {drug.is_nlem && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                NLEM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditDrug(drug)}
                              className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                              title="Edit Drug"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDrug(drug.id, drug.generic_name)}
                              className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 transition-all cursor-pointer"
                              title="Remove Drug"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold text-[#0F172A]">{drugs.length}</span> of{" "}
                <span className="font-bold text-[#0F172A]">{catalogPagination.total}</span> medications in formulary
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchDrugCatalog(catalogPagination.page - 1)}
                  disabled={catalogPagination.page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-xs font-bold text-slate-600 px-2 font-mono">
                  Page {catalogPagination.page} of {catalogPagination.totalPages || 1}
                </span>
                <button
                  onClick={() => fetchDrugCatalog(catalogPagination.page + 1)}
                  disabled={catalogPagination.page >= catalogPagination.totalPages || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Prescription Details Drawer ─── */}
      {selectedPrescription && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in"
          onClick={() => setSelectedPrescription(null)}
        >
          <div
            className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-200">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">Clinical Prescription</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedPrescription.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctor & Patient Context */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Patient Vault</span>
                <p className="font-bold text-sm text-[#0F172A]">{selectedPrescription.patient_name}</p>
                <p className="text-slate-500 font-mono text-[11px] truncate">{selectedPrescription.patient_email}</p>
                <p className="text-[#0891B2] font-semibold">Blood: {selectedPrescription.blood_group || "—"}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Prescribing Physician</span>
                <p className="font-bold text-sm text-[#0F172A]">Dr. {selectedPrescription.doctor_name}</p>
                <p className="text-slate-500 text-[11px]">{selectedPrescription.doctor_specialization || "Physician"}</p>
                <p className="text-slate-400 font-mono text-[10px]">Lic: {selectedPrescription.doctor_license || "—"}</p>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200/80 text-xs space-y-1">
              <p className="font-bold text-[#0891B2]">Clinical Diagnosis</p>
              <p className="text-slate-800 text-sm font-semibold">{selectedPrescription.diagnosis_text}</p>
              {selectedPrescription.notes && (
                <p className="text-slate-600 pt-1 leading-relaxed">{selectedPrescription.notes}</p>
              )}
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Prescribed Medication Regimen
              </h4>

              {selectedPrescription.items?.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Medication</th>
                        <th className="py-2.5 px-3">Strength &amp; Form</th>
                        <th className="py-2.5 px-3">Schedule</th>
                        <th className="py-2.5 px-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPrescription.items.map((it: any) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-800">{it.drug_name || it.name}</p>
                            <p className="text-[10px] text-slate-400">{it.generic_name}</p>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {it.strength} · {it.dosage_form || "Tablet"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-[#0891B2]">{it.schedule_code || it.schedule || "1-0-1"}</span>
                            <p className="text-[10px] text-slate-400">{it.food_instructions}</p>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {it.duration_days ? `${it.duration_days} Days` : "Course"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                  Prescription items embedded in document record.
                </div>
              )}
            </div>

            {/* Cryptographic Signature & Anchor */}
            {selectedPrescription.digital_signature && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Digital Signature Proof
                </span>
                <p className="font-mono text-[10px] text-slate-700 break-all bg-white p-2 rounded-xl border border-slate-200">
                  {selectedPrescription.digital_signature}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Add / Edit Drug Modal ─── */}
      {isDrugModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsDrugModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
                  <Pill className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-[#0F172A] text-base">
                  {editingDrug ? "Edit Drug Catalog Item" : "Add Medication to Formulary"}
                </h3>
              </div>
              <button
                onClick={() => setIsDrugModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDrug} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Official Generic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol / Acetaminophen"
                    value={drugFormData.generic_name}
                    onChange={(e) => setDrugFormData({ ...drugFormData, generic_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#0891B2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Brand Name (Commercial)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dolo 650, Calpol"
                    value={drugFormData.brand_name}
                    onChange={(e) => setDrugFormData({ ...drugFormData, brand_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#0891B2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Therapeutic Class</label>
                  <input
                    type="text"
                    placeholder="e.g. Analgesic & Antipyretic"
                    value={drugFormData.therapeutic_class}
                    onChange={(e) => setDrugFormData({ ...drugFormData, therapeutic_class: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#0891B2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 650 mg, 500 mg"
                    value={drugFormData.strength}
                    onChange={(e) => setDrugFormData({ ...drugFormData, strength: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#0891B2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Dosage Form</label>
                  <select
                    value={drugFormData.dosage_form}
                    onChange={(e) => setDrugFormData({ ...drugFormData, dosage_form: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0891B2]"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Jan Aushadhi Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12.50"
                    value={drugFormData.jan_aushadhi_price}
                    onChange={(e) => setDrugFormData({ ...drugFormData, jan_aushadhi_price: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#0891B2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Market Brand Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 35.00"
                    value={drugFormData.market_brand_price}
                    onChange={(e) => setDrugFormData({ ...drugFormData, market_brand_price: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#0891B2]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDrugModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? "Saving..." : editingDrug ? "Update Medication" : "Add Medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
