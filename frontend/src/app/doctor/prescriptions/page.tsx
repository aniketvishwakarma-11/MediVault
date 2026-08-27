"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Lock,
  ArrowRight,
  Search,
  AlertTriangle,
  Info,
  Clock,
  QrCode,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  User,
  Users,
  ShieldAlert,
  History,
  FileText,
  Ban,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI } from "@/lib/consent-api";
import { useToast } from "@/context/ToastContext";

interface CatalogDrug {
  id: string;
  rxcui?: string;
  atc_code?: string;
  brand_name?: string;
  generic_name: string;
  therapeutic_class?: string;
  dosage_form: string;
  strength: string;
  default_schedule: string;
  food_instructions: string;
  allergy_classes: string[];
  jan_aushadhi_price?: number;
  market_brand_price?: number;
  is_nlem?: boolean;
}

interface MedicineFormItem {
  drug_catalog_id?: string;
  drug_name: string;
  generic_name?: string;
  dosage_form: string;
  strength: string;
  frequency: string;
  duration: string;
  food_instructions: string;
  quantity: number;
  refills: number;
  instructions: string;
}

interface SafetyAlert {
  severity: "CRITICAL" | "MAJOR" | "MODERATE" | "INFO";
  category: string;
  title: string;
  description: string;
  management_advice: string;
}

interface ConsentedPatient {
  id: string;
  fullName: string;
  uhid: string;
  bloodGroup?: string;
  gender?: string;
}

export default function DoctorPrescriptionsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<"builder" | "history" | "refills">("builder");
  const [patients, setPatients] = useState<ConsentedPatient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<MedicineFormItem[]>([
    {
      drug_name: "",
      generic_name: "",
      dosage_form: "Tablet",
      strength: "",
      frequency: "1-0-1",
      duration: "7 Days",
      food_instructions: "Take after meals",
      quantity: 14,
      refills: 0,
      instructions: "Take with water as directed",
    },
  ]);
  const [recommendedTests, setRecommendedTests] = useState("");
  const [generatedRx, setGeneratedRx] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Autocomplete State
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogDrug[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  // CDS Safety Screening State
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [isScreening, setIsScreening] = useState(false);

  // History State
  const [historyPrescriptions, setHistoryPrescriptions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [deleteConfirmRx, setDeleteConfirmRx] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Incoming Refills Queue State
  const [refillQueue, setRefillQueue] = useState<any[]>([]);
  const [refillQueueLoading, setRefillQueueLoading] = useState(false);
  const [refillActionLoading, setRefillActionLoading] = useState<string | null>(null);

  // Load only patients who have actively granted consent to this doctor
  useEffect(() => {
    fetchConsentedPatients();
    fetchDoctorHistory();
    fetchRefillQueue();
  }, [user]);

  const fetchConsentedPatients = async () => {
    setIsLoadingPatients(true);
    try {
      // 1. Fetch consented patients via authoritative ConsentAPI
      const consented = await ConsentAPI.getConsentedPatients();
      if (consented && consented.length > 0) {
        const list: ConsentedPatient[] = consented.map((p) => ({
          id: p.id,
          fullName: p.fullName || "Patient",
          uhid: p.uhid || `MV-PAT-${p.id.substring(0, 5).toUpperCase()}`,
          bloodGroup: p.bloodGroup,
          gender: p.gender,
        }));
        setPatients(list);
        setSelectedPatientId(list[0].id);
        return;
      }

      // 2. Direct backend fallback
      const doctorId = user?.id || "doc-123";
      const res = await fetch(`/api/prescriptions/doctor/consented-patients?doctor_id=${doctorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.patients) && data.data.patients.length > 0) {
          const list: ConsentedPatient[] = data.data.patients.map((p: any) => ({
            id: p.id,
            fullName: p.fullName || p.full_name || "Patient",
            uhid: p.uhid || `MV-PAT-${p.id.substring(0, 5).toUpperCase()}`,
            bloodGroup: p.bloodGroup,
            gender: p.gender,
          }));
          setPatients(list);
          setSelectedPatientId(list[0].id);
          return;
        }
      }

      setPatients([]);
      setSelectedPatientId("");
    } catch (err) {
      console.error("Failed to load consented patients:", err);
      setPatients([]);
      setSelectedPatientId("");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const fetchDoctorHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const doctorId = user?.id || "doc-123";
      const res = await fetch(`/api/prescriptions/doctor/history?doctor_id=${doctorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.prescriptions)) {
          setHistoryPrescriptions(data.data.prescriptions);
        }
      }
    } catch (err) {
      console.error("Error fetching doctor history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Search catalog as user types
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setCatalogResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/prescriptions/catalog/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.drugs) {
            setCatalogResults(data.data.drugs);
          }
        }
      } catch (err) {
        console.error("Catalog search error:", err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Run real-time CDS Safety check whenever medicines list changes
  useEffect(() => {
    const validMeds = medicines.filter((m) => m.drug_name.trim().length > 0);
    if (validMeds.length === 0 || !selectedPatientId) {
      setSafetyAlerts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsScreening(true);
      try {
        const res = await fetch("/api/prescriptions/safety-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: selectedPatientId,
            medicines: validMeds.map((m) => ({ name: m.drug_name, dosage: m.strength, frequency: m.frequency })),
            diagnosis,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.alerts) {
            setSafetyAlerts(data.data.alerts);
          }
        }
      } catch (err) {
        console.error("Safety check error:", err);
      } finally {
        setIsScreening(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [medicines, selectedPatientId, diagnosis]);

  const addMedicine = () => {
    const newIdx = medicines.length;
    setMedicines([
      ...medicines,
      {
        drug_name: "",
        generic_name: "",
        dosage_form: "Tablet",
        strength: "",
        frequency: "1-0-1",
        duration: "7 Days",
        food_instructions: "Take after meals",
        quantity: 14,
        refills: 0,
        instructions: "Take with water",
      },
    ]);
    setActiveSearchIndex(newIdx);
    setSearchQuery("");
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  const updateMedicine = (index: number, field: keyof MedicineFormItem, value: any) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleSelectCatalogDrug = (index: number, drug: CatalogDrug) => {
    const updated = [...medicines];
    updated[index] = {
      ...updated[index],
      drug_catalog_id: drug.id,
      drug_name: `${drug.generic_name} ${drug.strength}`,
      generic_name: drug.generic_name,
      dosage_form: drug.dosage_form,
      strength: drug.strength,
      frequency: drug.default_schedule,
      food_instructions: drug.food_instructions,
      instructions: `Take ${drug.dosage_form.toLowerCase()} as directed.`,
    };
    setMedicines(updated);
    setActiveSearchIndex(null);
    setSearchQuery("");
  };

  const handleGeneratePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      showWarning("Validation", "Please select a patient who has granted consent.");
      return;
    }
    const validMeds = medicines.filter((m) => m.drug_name.trim().length > 0);
    if (validMeds.length === 0) {
      showWarning("Validation", "Please enter at least one prescribed medication.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      doctorId: user?.id || "doc-123",
      patientId: selectedPatientId,
      diagnosisText: diagnosis.trim() || "Clinical Consultation & Care Plan",
      recommendedTests: recommendedTests
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      medicines: validMeds.map((m) => ({
        drug_catalog_id: m.drug_catalog_id,
        drug_name: m.drug_name,
        generic_name: m.generic_name,
        dosage_form: m.dosage_form,
        strength: m.strength || "Standard Dose",
        schedule_code: m.frequency,
        food_instructions: m.food_instructions,
        duration_days: parseInt(m.duration) || 7,
        quantity_to_dispense: m.quantity || 14,
        refills_allowed: m.refills || 0,
        special_instructions: m.instructions,
      })),
    };

    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const pName = patients.find((p) => p.id === selectedPatientId)?.fullName || "Consented Patient";
          setGeneratedRx({
            ...data.data,
            patientName: pName,
            date: new Date().toISOString().split("T")[0],
          });
          fetchDoctorHistory();
          setIsSubmitting(false);
          return;
        }
      } else {
        const errData = await res.json();
        showError("Action Failed", errData.message || "Failed to create prescription.");
      }
    } catch (err: any) {
      console.error("Prescription creation error:", err);
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeCancel = async (prescriptionId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Medication discontinued by physician" }),
      });
      if (res.ok) {
        setHistoryPrescriptions((prev) =>
          prev.map((p) => (p.id === prescriptionId ? { ...p, status: "CANCELLED" } : p))
        );
        setDeleteConfirmRx(null);
        setCancelReason("");
      }
    } catch (err) {
      console.error("Revoke error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (prescriptionId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistoryPrescriptions((prev) => prev.filter((p) => p.id !== prescriptionId));
        setDeleteConfirmRx(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchRefillQueue = async () => {
    setRefillQueueLoading(true);
    try {
      const doctorId = user?.id || "doc-123";
      const res = await fetch(`/api/prescriptions/refill/queue?doctor_id=${doctorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.refillRequests)) {
          setRefillQueue(data.data.refillRequests);
        }
      }
    } catch (err) {
      console.error("Failed to load refill queue:", err);
    } finally {
      setRefillQueueLoading(false);
    }
  };

  const handleApproveRefill = async (refillId: string, action: "APPROVED" | "REJECTED") => {
    setRefillActionLoading(refillId);
    try {
      const res = await fetch(`/api/prescriptions/refill/${refillId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Server error ${res.status}`);
      }
      // Update local queue to reflect resolved state
      setRefillQueue((prev) =>
        prev.map((r) => (r.id === refillId ? { ...r, status: action, resolved_at: new Date().toISOString() } : r))
      );
    } catch (err: any) {
      console.error("Refill action error:", err);
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setRefillActionLoading(null);
    }
  };

  const filteredHistory = historyPrescriptions.filter((rx) => {
    const q = historySearch.toLowerCase();
    return (
      (rx.patient_name || "").toLowerCase().includes(q) ||
      (rx.diagnosis_text || "").toLowerCase().includes(q) ||
      (rx.id || "").toLowerCase().includes(q) ||
      (rx.medicines || []).some((m: any) => (m.drug_name || "").toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 font-body pb-16 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-[#0891B2]" /> Clinical Prescription Studio & Notarizer
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Build electronic prescriptions, review historical orders, and cryptographically sign on-chain Rx passes.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("builder");
              setGeneratedRx(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "builder"
                ? "bg-[#0891B2] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Pill className="w-3.5 h-3.5" /> Prescription Studio
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              setGeneratedRx(null);
              fetchDoctorHistory();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-[#0891B2] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Issued Prescriptions ({historyPrescriptions.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("refills");
              setGeneratedRx(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "refills"
                ? "bg-[#0891B2] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refill Queue ({refillQueue.filter((r) => r.status === "PENDING").length})
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: ISSUED PRESCRIPTIONS HISTORY & DELETION / REVOKE     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "history" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/70 text-xs text-[#0F172A]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#0891B2]" />
              <span>Prescriptions issued and notarized by you. You can review, re-print passes, or revoke/delete orders.</span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search patient, diagnosis, drug..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-cyan-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">
              Loading prescription records...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">No Prescriptions Found</h3>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                {historySearch ? "No prescriptions match your search term." : "You haven't issued any digital prescriptions yet. Use the Prescription Studio tab to build and notarize one."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHistory.map((rx) => (
                <div
                  key={rx.id}
                  className={`p-6 rounded-3xl bg-white border shadow-xs space-y-4 flex flex-col justify-between transition-all ${
                    rx.status === "CANCELLED"
                      ? "border-rose-200 bg-rose-50/20"
                      : "border-slate-200/80"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          Rx ID
                        </span>
                        <span className="font-heading font-black text-base text-[#0891B2]">{rx.id}</span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(rx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          rx.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : rx.status === "FULLY_DISPENSED"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {rx.status === "CANCELLED" ? <Ban className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {rx.status}
                      </span>
                    </div>

                    {/* Patient & Diagnosis */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#0F172A]">{rx.patient_name}</span>
                        {rx.patient_blood_group && rx.patient_blood_group !== "N/A" && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                            {rx.patient_blood_group}
                          </span>
                        )}
                      </div>
                      <div className="text-[#475569]">
                        <strong>Diagnosis:</strong> {rx.diagnosis_text}
                      </div>
                    </div>

                    {/* Medications List */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider block">
                        Prescribed Drugs ({(rx.medicines || []).length})
                      </span>
                      {(rx.medicines || []).map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between font-medium text-[#0F172A]">
                          <span>{m.drug_name}</span>
                          <span className="text-[#0891B2] font-bold">{m.schedule_code} ({m.duration_days}d)</span>
                        </div>
                      ))}
                    </div>

                    {rx.blockchain_tx_hash && (
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        On-Chain Tx: {rx.blockchain_tx_hash}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
                    <button
                      onClick={() =>
                        setGeneratedRx({
                          ...rx,
                          patientName: rx.patient_name,
                          date: new Date(rx.created_at).toISOString().split("T")[0],
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] text-xs font-bold flex items-center justify-center gap-1.5 min-h-[36px]"
                    >
                      <Printer className="w-3.5 h-3.5" /> View / Print Pass
                    </button>

                    <Link
                      href={`/verify/rx/${rx.id}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 min-h-[36px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Verify
                    </Link>

                    {rx.status !== "CANCELLED" && (
                      <button
                        onClick={() => setDeleteConfirmRx(rx)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 min-h-[36px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke / Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "refills" ? (
        /* Refill Queue Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/70 text-xs text-[#0F172A] flex items-center justify-between">
            <span>Review patient medication renewal requests with verified adherence compliance.</span>
          </div>

          {refillQueueLoading ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center shadow-xs">
              <div className="w-8 h-8 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-3">Loading refill requests from database…</p>
            </div>
          ) : refillQueue.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">No Pending Refill Requests</h3>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                When consented patients reach their last week of medication and request renewals from their patient portal, they will appear here for 1-click approval.
              </p>
              <button onClick={fetchRefillQueue} className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" /> Refresh Queue
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {refillQueue.map((item) => (
                <div key={item.id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-heading font-bold text-sm text-[#0F172A]">{item.patient_name || "Patient"}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Rx: {item.prescription_id?.slice(0, 8)}… • Requested {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      {item.diagnosis_text && <span className="text-xs text-slate-500 block">{item.diagnosis_text}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        Adherence: {item.adherence_rate ?? "—"}%
                      </span>
                      {item.status === "APPROVED" ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : item.status === "REJECTED" ? (
                        <span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveRefill(item.id, "APPROVED")}
                            disabled={refillActionLoading === item.id}
                            className="px-4 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {refillActionLoading === item.id ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproveRefill(item.id, "REJECTED")}
                            disabled={refillActionLoading === item.id}
                            className="px-4 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    {item.patient_notes && <div className="text-slate-500 italic">"{item.patient_notes}"</div>}
                    {item.doctor_notes && <div className="text-slate-600"><strong>Your note:</strong> {item.doctor_notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : generatedRx ? (
        /* Printable Prescription PDF Preview Modal View */
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl space-y-6 border border-slate-200/80">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-heading font-extrabold text-xl text-[#0891B2]">MEDIVAULT HEALTH CLINICAL NETWORK</h2>
                <p className="text-xs text-slate-600">Digital Health Informatics & Cryptographic Ledger</p>
                <p className="text-xs text-slate-500 font-mono">Reg # NMC-994820 | Verified Physician</p>
              </div>
              <div className="text-right">
                <span className="font-heading font-extrabold text-2xl text-[#0891B2]">Rx</span>
                <p className="text-xs text-slate-500 font-mono">ID: {generatedRx.id}</p>
                <p className="text-xs text-slate-500 font-mono">Date: {generatedRx.date}</p>
              </div>
            </div>

            {/* Patient Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between font-bold text-[#0F172A]">
              <span>Patient: {generatedRx.patientName || generatedRx.patient_name}</span>
              <span>Diagnosis: {generatedRx.diagnosis || generatedRx.diagnosis_text}</span>
            </div>

            {/* Medicines List */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-[#0891B2] uppercase tracking-wider">Prescribed Medications</h3>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[#475569]">
                    <th className="py-2">Medicine Name & Strength</th>
                    <th className="py-2">Frequency</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2">Qty / Refills</th>
                  </tr>
                </thead>
                <tbody>
                  {(generatedRx.medicines || []).map((m: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2.5 font-bold text-[#0F172A]">
                        {m.drug_name || m.name}
                        {(m.food_instructions || m.instructions) && (
                          <span className="block text-[10px] text-[#475569] font-normal">
                            {m.food_instructions || m.instructions}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-bold text-[#0891B2]">{m.frequency || m.schedule_code}</td>
                      <td className="py-2.5 text-[#475569]">{m.duration || `${m.duration_days} Days`}</td>
                      <td className="py-2.5 text-[#475569]">{m.quantity || m.quantity_to_dispense} ({m.refills || m.refills_allowed} Refills)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recommended Tests */}
            {((generatedRx.recommendedTests && generatedRx.recommendedTests.length > 0) ||
              (generatedRx.recommended_tests && generatedRx.recommended_tests.length > 0)) && (
              <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-100 text-xs">
                <span className="font-bold text-[#0891B2] block mb-1">Recommended Diagnostic / Lab Tests:</span>
                <p className="text-slate-700">
                  {(generatedRx.recommendedTests || generatedRx.recommended_tests).join(", ")}
                </p>
              </div>
            )}

            {/* Notarization Pass / QR Code Footer */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                      typeof window !== "undefined"
                        ? `${window.location.origin}/verify/rx/${generatedRx.id}`
                        : `https://medivault.app/verify/rx/${generatedRx.id}`
                    )}`}
                    alt="Prescription QR Verification"
                    className="w-16 h-16"
                  />
                </div>
                <div className="text-[11px] space-y-0.5">
                  <div className="font-bold text-[#0F172A] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cryptographically Signed On-Chain Rx</span>
                  </div>
                  <div className="font-mono text-slate-500 text-[10px] truncate max-w-xs">
                    Digest: {generatedRx.qr_code_hash || "SHA-256 Verified"}
                  </div>
                  <div className="font-mono text-slate-400 text-[9px] truncate max-w-xs">
                    Tx: {generatedRx.blockchain_tx_hash || "0x98f2a17b8c..."}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-heading font-black text-xs text-[#0F172A]">Dr. Sarah Jenkins, MD</div>
                <div className="text-[10px] text-slate-500">Authorized Digital Signature</div>
                <div className="font-mono text-[9px] text-[#0891B2]">{generatedRx.digital_signature || "SIG-DR-VERIFIED"}</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
              <button
                onClick={() => setGeneratedRx(null)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Prescription Studio Builder Form */
        <form onSubmit={handleGeneratePrescription} className="space-y-6">
          {/* Top Patient & Diagnosis Selection */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0F172A]">
                  Select Consented Patient
                </label>
                {patients.length > 0 && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Consent
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={patients.length === 0}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                >
                  {patients.length === 0 ? (
                    <option value="">No patients with active consent found</option>
                  ) : (
                    patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.uhid}){p.bloodGroup ? ` • ${p.bloodGroup}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Primary Clinical Diagnosis
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Type 2 Diabetes Mellitus, Acute Bronchitis..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
              />
            </div>
          </div>

          {/* Clinical Decision Support (CDS) Safety Alerts Panel */}
          {safetyAlerts.length > 0 && (
            <div className="space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 px-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>AI Clinical Decision Support (CDS): Safety Screen Alerts</span>
              </div>
              {safetyAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    alert.severity === "CRITICAL"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : alert.severity === "MAJOR"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-cyan-50 border-cyan-200 text-cyan-900"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      alert.severity === "CRITICAL"
                        ? "text-rose-600"
                        : alert.severity === "MAJOR"
                        ? "text-amber-600"
                        : "text-cyan-600"
                    }`}
                  />
                  <div className="space-y-1">
                    <div className="font-bold">{alert.title}</div>
                    <p className="text-[11px] leading-relaxed">{alert.description}</p>
                    <div className="text-[11px] font-semibold text-slate-700">
                      💡 Advice: {alert.management_advice}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Medicines Line Items Section */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0F172A]">Prescribed Drugs & Dosages</h3>
                <span className="text-[11px] text-[#475569]">Integrated RxNorm & WHO Essential Medicines</span>
              </div>
              <button
                type="button"
                onClick={addMedicine}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] text-xs font-bold flex items-center gap-1.5 min-h-[34px]"
              >
                <Plus className="w-4 h-4" /> Add Drug
              </button>
            </div>

            <div className="space-y-4">
              {medicines.map((med, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                  {/* First line: Drug Search, Strength, Frequency, Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    {/* Autocomplete Input */}
                    <div className="sm:col-span-5 relative">
                      <label className="block text-[#475569] font-semibold mb-1">
                        Drug Name (Generic / Commercial Brand)
                      </label>
                      <input
                        type="text"
                        value={med.drug_name}
                        onChange={(e) => {
                          updateMedicine(idx, "drug_name", e.target.value);
                          setSearchQuery(e.target.value);
                          setActiveSearchIndex(idx);
                        }}
                        onFocus={() => {
                          setActiveSearchIndex(idx);
                          setSearchQuery(med.drug_name);
                        }}
                        placeholder="Type 'Metformin', 'Augmentin', 'Dolo'..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                      />

                      {/* Dropdown Menu */}
                      {activeSearchIndex === idx && catalogResults.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {catalogResults.map((drug) => (
                            <div
                              key={drug.id}
                              onClick={() => handleSelectCatalogDrug(idx, drug)}
                              className="p-3 hover:bg-cyan-50/60 cursor-pointer text-xs space-y-0.5"
                            >
                              <div className="font-bold text-[#0F172A] flex items-center justify-between">
                                <span>{drug.generic_name} ({drug.strength})</span>
                                {drug.is_nlem && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                    NLEM / WHO
                                  </span>
                                )}
                              </div>
                              {drug.brand_name && (
                                <div className="text-[11px] text-slate-500">Brands: {drug.brand_name}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Strength */}
                    <div className="sm:col-span-2">
                      <label className="block text-[#475569] font-semibold mb-1">Strength</label>
                      <input
                        type="text"
                        value={med.strength}
                        onChange={(e) => updateMedicine(idx, "strength", e.target.value)}
                        placeholder="e.g. 500 mg"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="sm:col-span-3">
                      <label className="block text-[#475569] font-semibold mb-1">Frequency</label>
                      <select
                        value={med.frequency}
                        onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                      >
                        <option value="1-0-1">1-0-1 (Twice daily)</option>
                        <option value="1-0-0">1-0-0 (Once morning)</option>
                        <option value="0-0-1">0-0-1 (Bedtime)</option>
                        <option value="1-1-1">1-1-1 (Thrice daily)</option>
                        <option value="0-1-0">0-1-0 (Afternoon)</option>
                        <option value="PRN">PRN (As needed for pain/fever)</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="sm:col-span-2">
                      <label className="block text-[#475569] font-semibold mb-1">Duration</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                        placeholder="7 Days"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Second line: Food instructions, Qty, Refills */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs pt-1">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={med.food_instructions}
                        onChange={(e) => updateMedicine(idx, "food_instructions", e.target.value)}
                        placeholder="Food instructions (e.g. Take with or after meals)"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        value={med.quantity}
                        onChange={(e) => updateMedicine(idx, "quantity", parseInt(e.target.value) || 14)}
                        placeholder="Dispense Qty"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A]"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={med.refills}
                        onChange={(e) => updateMedicine(idx, "refills", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A]"
                      >
                        <option value={0}>0 Refills (No refills)</option>
                        <option value={1}>1 Refill (+30 days)</option>
                        <option value={2}>2 Refills (+60 days)</option>
                        <option value={3}>3 Refills (+90 days)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 flex items-center justify-end">
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(idx)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Recommended Lab / Diagnostic Tests (Optional, comma-separated)
              </label>
              <input
                type="text"
                value={recommendedTests}
                onChange={(e) => setRecommendedTests(e.target.value)}
                placeholder="e.g. Fasting Blood Sugar (FBS), HbA1c, Serum Creatinine..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || patients.length === 0}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                patients.length === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-[#0891B2] hover:bg-[#0e7490] text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
              <span>
                {isSubmitting
                  ? "Cryptographically Signing & Notarizing Rx..."
                  : patients.length === 0
                  ? "Consent Required to Prescribe"
                  : "Generate Signed Digital Rx & Notarize Pass"}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: REVOKE / DELETE PRESCRIPTION CONFIRMATION           */}
      {/* ────────────────────────────────────────────────────────── */}
      {deleteConfirmRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-heading font-bold text-sm text-[#0F172A]">Revoke or Delete Prescription</span>
              <button onClick={() => setDeleteConfirmRx(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold">Prescription ID: {deleteConfirmRx.id}</div>
              <div>Patient: {deleteConfirmRx.patient_name}</div>
              <div>Diagnosis: {deleteConfirmRx.diagnosis_text}</div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-[#0F172A]">
                Reason for Revocation / Modification
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Dosage adjusted, drug discontinued, created in error..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRevokeCancel(deleteConfirmRx.id)}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> Revoke (Mark as Cancelled)
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handlePermanentDelete(deleteConfirmRx.id)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Permanently Delete from Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
