"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Volume2,
  VolumeX,
  Languages,
  ShieldCheck,
  QrCode,
  Printer,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Check,
  X,
  Search,
  Inbox,
  FilePlus,
  Loader2,
  Upload,
  ScanLine,
  Camera,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import OfflinePrescriptionUpload from "./components/OfflinePrescriptionUpload";
import PrescriptionOCRStatus from "./components/PrescriptionOCRStatus";
import PrescriptionReviewScreen from "./components/PrescriptionReviewScreen";

interface DoseItem {
  item_id: string;
  prescription_id: string;
  drug_name: string;
  dosage_form: string;
  strength: string;
  food_instructions: string;
  instructions: string;
  status: "PENDING" | "TAKEN" | "SKIPPED";
  taken_at?: string;
}

interface DoseSlot {
  slot: "MORNING" | "AFTERNOON" | "EVENING" | "BEDTIME";
  slot_label: string;
  scheduled_time: string;
  doses: DoseItem[];
}

interface PrescriptionItem {
  id: string;
  drug_name: string;
  generic_name?: string;
  dosage_form: string;
  strength: string;
  schedule_code: string;
  food_instructions: string;
  duration_days: number;
  quantity_to_dispense: number;
  quantity_dispensed: number;
  refills_allowed: number;
  jan_aushadhi_price?: number;
  market_brand_price?: number;
  rxcui?: string;
  atc_code?: string;
}

interface PrescriptionRecord {
  id: string;
  source_type?: string;
  offline_doctor_name?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  hospital_name?: string;
  diagnosis_text: string;
  status: string;
  created_at: string;
  expires_at: string;
  blockchain_tx_hash?: string;
  digital_signature?: string;
  medicines: PrescriptionItem[];
  ai_explanation?: any;
}

export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"schedule" | "cabinet" | "archive">("schedule");
  const [doseSlots, setDoseSlots] = useState<DoseSlot[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<"English" | "Hindi">("English");
  const [speakingIndex, setSpeakingIndex] = useState<string | null>(null);
  const [expandedMedIndex, setExpandedMedIndex] = useState<number | null>(0);
  const [refillModalRx, setRefillModalRx] = useState<PrescriptionRecord | null>(null);
  const [refillNotes, setRefillNotes] = useState("");
  const [refillSuccess, setRefillSuccess] = useState(false);
  const [qrModalRx, setQrModalRx] = useState<PrescriptionRecord | null>(null);

  // ── Offline Upload State Machine ────────────────────────────────────────────
  // Stage: 'idle' | 'polling' | 'review' | 'confirmed'
  type OfflineStage = "idle" | "polling" | "review" | "confirmed";
  const [offlineStage, setOfflineStage] = useState<OfflineStage>("idle");
  const [uploadJob, setUploadJob] = useState<any>(null); // job from /upload-offline
  const [jobStatus, setJobStatus] = useState<any>(null); // from /upload-job/:id
  const [fullAnalysis, setFullAnalysis] = useState<any>(null); // from /ocr/:id/analysis
  const [confirmedPrescriptionId, setConfirmedPrescriptionId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);

  // Load auth token once for upload requests
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data?.session?.access_token);
    });
  }, []);

  // Poll job status every 3s while in 'polling' stage
  const pollJobStatus = useCallback(async () => {
    if (!uploadJob?.jobId) return;
    try {
      const res = await fetch(`/api/prescriptions/upload-job/${uploadJob.jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      const job = data.data;
      if (!job) return;
      setJobStatus(job);

      if (job.status === "NEEDS_REVIEW" || job.status === "VERIFIED") {
        // Fetch full analysis
        const analysisRes = await fetch(`/api/prescriptions/ocr/${uploadJob.jobId}/analysis`);
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          setFullAnalysis(analysisData.data);
        }
        setOfflineStage("review");
      } else if (job.status === "FAILED") {
        // Stay in polling stage to show error
      }
    } catch {}
  }, [uploadJob]);

  useEffect(() => {
    if (offlineStage !== "polling" || !uploadJob?.jobId) return;
    const interval = setInterval(pollJobStatus, 3000);
    pollJobStatus(); // immediate first check
    return () => clearInterval(interval);
  }, [offlineStage, uploadJob, pollJobStatus]);

  const handleUploadStarted = (result: any) => {
    setUploadJob(result);
    setJobStatus(null);
    setFullAnalysis(null);
    setOfflineStage("polling");
  };

  const handleConfirmed = (prescriptionId: string) => {
    setConfirmedPrescriptionId(prescriptionId);
    setOfflineStage("confirmed");
    // Refresh prescriptions list
    fetchPrescriptionData();
  };

  const resetOfflineFlow = () => {
    setOfflineStage("idle");
    setUploadJob(null);
    setJobStatus(null);
    setFullAnalysis(null);
    setConfirmedPrescriptionId(null);
  };

  // Translations Cache Map: { [uniqueKey]: explanationObject }
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [loadingTranslations, setLoadingTranslations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPrescriptionData();
  }, [user]);

  const fetchPrescriptionData = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const patientId = user?.id || "pat-1001";

      // 1. Fetch Today's Adherence Schedule
      const resSchedule = await fetch(`/api/prescriptions/adherence/today?patient_id=${patientId}`, { headers });
      if (resSchedule.ok) {
        const data = await resSchedule.json();
        if (data.success && Array.isArray(data.data?.slots)) {
          setDoseSlots(data.data.slots);
        } else {
          setDoseSlots([]);
        }
      } else {
        setDoseSlots([]);
      }

      // 2. Fetch Active & Historical Prescriptions
      const resRx = await fetch(`/api/prescriptions/patient/${patientId}`, { headers });
      if (resRx.ok) {
        const data = await resRx.json();
        if (data.success && Array.isArray(data.data?.prescriptions)) {
          setPrescriptions(data.data.prescriptions);
        } else {
          setPrescriptions([]);
        }
      } else {
        setPrescriptions([]);
      }
    } catch (err) {
      console.warn("Prescriptions fetch notice:", err);
      setDoseSlots([]);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load rich personalized AI explanations for all medicines
  useEffect(() => {
    if (prescriptions.length > 0) {
      loadExplanations(selectedLanguage);
    }
  }, [selectedLanguage, prescriptions]);

  const loadExplanations = async (lang: string = "English") => {
    for (let rIdx = 0; rIdx < prescriptions.length; rIdx++) {
      const rx = prescriptions[rIdx];
      for (let mIdx = 0; mIdx < (rx.medicines || []).length; mIdx++) {
        const med = rx.medicines[mIdx];
        const cacheKey = `${rIdx}-${mIdx}-${lang}`;

        let existingExpl: any = null;
        if (typeof rx.ai_explanation === "string") {
          try { existingExpl = JSON.parse(rx.ai_explanation); } catch {}
        } else if (rx.ai_explanation && typeof rx.ai_explanation === "object") {
          existingExpl = rx.ai_explanation;
        }

        // If English and prescription has pre-saved rich explanation
        if (lang === "English" && existingExpl && existingExpl.why_prescribed && !existingExpl.why_prescribed.includes("External prescription")) {
          setTranslations((prev) => ({ ...prev, [cacheKey]: existingExpl }));
          continue;
        }

        if (!translations[cacheKey]) {
          setLoadingTranslations((prev) => ({ ...prev, [cacheKey]: true }));
          try {
            const res = await fetch("/api/prescriptions/explain", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                medicine_name: med.drug_name,
                dosage: med.strength,
                frequency: med.schedule_code,
                diagnosis: rx.diagnosis_text && !rx.diagnosis_text.includes("External") ? rx.diagnosis_text : "Targeted Symptom Relief & Care",
                language: lang,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.data) {
                setTranslations((prev) => ({ ...prev, [cacheKey]: data.data }));
              }
            }
          } catch (err) {
            console.error("Explanation loading error:", err);
          } finally {
            setLoadingTranslations((prev) => ({ ...prev, [cacheKey]: false }));
          }
        }
      }
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeletePrescription = async (rxId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this prescription from your records?")) return;
    setDeletingId(rxId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/prescriptions/${rxId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        setPrescriptions((prev) => prev.filter((p) => p.id !== rxId));
        fetchPrescriptionData();
      } else {
        alert("Failed to delete prescription.");
      }
    } catch (err) {
      console.error("Delete prescription error:", err);
      alert("An error occurred while deleting the prescription.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleDose = async (slotIdx: number, doseIdx: number, newStatus: "TAKEN" | "SKIPPED" | "PENDING") => {
    const updated = [...doseSlots];
    const dose = updated[slotIdx].doses[doseIdx];
    dose.status = newStatus;
    dose.taken_at =
      newStatus === "TAKEN"
        ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : undefined;
    setDoseSlots(updated);

    try {
      await fetch("/api/prescriptions/adherence/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: dose.item_id,
          slot: updated[slotIdx].slot,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.error("Adherence log error:", err);
    }
  };

  const handleSpeak = (defaultText: string, id: string) => {
    if ("speechSynthesis" in window) {
      if (speakingIndex === id) {
        window.speechSynthesis.cancel();
        setSpeakingIndex(null);
        return;
      }
      window.speechSynthesis.cancel();

      const isHindi = selectedLanguage === "Hindi";
      const hindiScript =
        translations[id]?.audio_summary_script ||
        `नमस्ते, कृपया अपनी दवा डॉक्टर के निर्देशानुसार समय पर भोजन के बाद लें।`;
      const utteranceText = isHindi ? hindiScript : defaultText;

      const utterance = new SpeechSynthesisUtterance(utteranceText);
      utterance.rate = isHindi ? 0.88 : 0.95;
      utterance.lang = isHindi ? "hi-IN" : "en-US";

      // Select proper Hindi voice from browser TTS voices
      const voices = window.speechSynthesis.getVoices();
      if (isHindi) {
        const hindiVoice = voices.find(
          (v) =>
            v.lang === "hi-IN" ||
            v.lang === "hi_IN" ||
            v.lang.toLowerCase().startsWith("hi") ||
            v.name.toLowerCase().includes("hindi") ||
            v.name.toLowerCase().includes("hemant") ||
            v.name.toLowerCase().includes("kalpana") ||
            v.name.toLowerCase().includes("swara") ||
            v.name.toLowerCase().includes("lekha")
        );
        if (hindiVoice) {
          utterance.voice = hindiVoice;
        }
      } else {
        const engVoice = voices.find(
          (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("US"))
        );
        if (engVoice) utterance.voice = engVoice;
      }

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingIndex(id);
    }
  };

  const handleRequestRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillModalRx) return;
    try {
      await fetch("/api/prescriptions/refill/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: refillModalRx.id,
          notes: refillNotes,
        }),
      });
      setRefillSuccess(true);
      setTimeout(() => {
        setRefillSuccess(false);
        setRefillModalRx(null);
        setRefillNotes("");
      }, 2000);
    } catch (err) {
      console.error("Refill error:", err);
    }
  };

  // Dynamic calculations
  const totalTodayDoses = doseSlots.reduce((acc, s) => acc + (s.doses?.length || 0), 0);
  const takenTodayDoses = doseSlots.reduce(
    (acc, s) => acc + (s.doses?.filter((d) => d.status === "TAKEN").length || 0),
    0
  );
  const adherencePercent = totalTodayDoses > 0 ? Math.round((takenTodayDoses / totalTodayDoses) * 100) : 100;
  const activeMedicinesCount = prescriptions.reduce((acc, rx) => acc + (rx.medicines?.length || 0), 0);

  return (
    <div className="space-y-6 font-body pb-16 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-[#0891B2]" /> Smart Prescriptions & Pill Cabinet
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Track daily medications, explore plain-language AI explanations, verify notarized QR passes, and manage refills.
          </p>
        </div>

        {/* Global Adherence Badge */}
        {totalTodayDoses > 0 && (
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
              <Flame className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Adherence: {adherencePercent}% ({takenTodayDoses}/{totalTodayDoses} Taken)</span>
            </div>
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-200/60 flex items-center justify-center text-[#0891B2]">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-black text-[#0F172A]">{activeMedicinesCount} Active</div>
            <div className="text-xs text-[#475569] font-medium">Prescribed Medications</div>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-black text-[#0F172A]">{takenTodayDoses} / {totalTodayDoses} Taken</div>
            <div className="text-xs text-[#475569] font-medium">Today's Dose Compliance</div>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-black text-[#0F172A]">{prescriptions.length} Notarized</div>
            <div className="text-xs text-[#475569] font-medium">On-Chain Verified Rx Passes</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "schedule"
              ? "border-[#0891B2] text-[#0891B2]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" /> Today's Dosing Schedule
        </button>

        <button
          onClick={() => setActiveTab("cabinet")}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "cabinet"
              ? "border-[#0891B2] text-[#0891B2]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#0891B2]" /> Smart Medicine Cabinet & AI Explainer
        </button>

        <button
          onClick={() => setActiveTab("archive")}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "archive"
              ? "border-[#0891B2] text-[#0891B2]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <QrCode className="w-4 h-4" /> Prescription Passes & QR Verification
        </button>

        {/* Tab 4: Offline Upload */}
        <button
          onClick={() => setActiveTab("upload" as any)}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            (activeTab as any) === "upload"
              ? "border-violet-500 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
          id="tab-offline-upload"
        >
          <Upload className="w-4 h-4" /> Upload Offline Prescription
          {offlineStage === "polling" && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {offlineStage === "confirmed" && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: TODAY'S SCHEDULE & DOSE CHECK-OFF                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/70 flex items-center justify-between text-xs text-[#0F172A]">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#0891B2]" />
              <span className="font-bold">
                Today, {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>
            <span className="text-[#475569]">Tap <strong>Take Now</strong> to log your intake and maintain your streak.</span>
          </div>

          {totalTodayDoses === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center mx-auto">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">No Doses Scheduled for Today</h3>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                When your doctor issues a new digital prescription, your daily morning, afternoon, and evening pill schedule will automatically organize here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {doseSlots
                .filter((slot) => slot.doses && slot.doses.length > 0)
                .map((slot, sIdx) => (
                  <div key={sIdx} className="p-5 rounded-3xl bg-white border border-slate-200/80 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 font-heading font-bold text-sm text-[#0F172A]">
                        <Clock className="w-4 h-4 text-[#0891B2]" />
                        <span>{slot.slot_label}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">{slot.doses.length} Meds</span>
                    </div>

                    <div className="space-y-2.5">
                      {slot.doses.map((dose, dIdx) => (
                        <div
                          key={dIdx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            dose.status === "TAKEN"
                              ? "bg-emerald-50/60 border-emerald-200/70 text-emerald-950"
                              : dose.status === "SKIPPED"
                              ? "bg-slate-50 border-slate-200 text-slate-400"
                              : "bg-slate-50/80 border-slate-200/80 text-[#0F172A]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                dose.status === "TAKEN"
                                  ? "bg-emerald-200/80 text-emerald-800"
                                  : "bg-white border border-slate-200 text-[#0891B2]"
                              }`}
                            >
                              <Pill className="w-4 h-4" />
                            </div>

                            <div>
                              <div className="font-bold text-xs flex items-center gap-2">
                                <span>{dose.drug_name}</span>
                                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white border border-slate-200">
                                  {dose.strength}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#475569] mt-0.5">
                                {dose.food_instructions} {dose.instructions && `• ${dose.instructions}`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {dose.status === "TAKEN" ? (
                              <button
                                onClick={() => handleToggleDose(sIdx, dIdx, "PENDING")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" /> Taken {dose.taken_at && `(${dose.taken_at})`}
                              </button>
                            ) : dose.status === "SKIPPED" ? (
                              <button
                                onClick={() => handleToggleDose(sIdx, dIdx, "PENDING")}
                                className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                              >
                                Skipped (Undo)
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleDose(sIdx, dIdx, "SKIPPED")}
                                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold"
                                >
                                  Skip
                                </button>
                                <button
                                  onClick={() => handleToggleDose(sIdx, dIdx, "TAKEN")}
                                  className="px-4 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-xs flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Take Now
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: SMART MEDICINE CABINET & 5-PART AI EXPLAINER        */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "cabinet" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#0F172A]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>
                {selectedLanguage === "Hindi" ? (
                  <><strong>AI क्लिनिकल जानकारी:</strong> आपकी दवाओं की सरल और स्पष्ट हिंदी में व्याख्या।</>
                ) : (
                  <><strong>AI Clinical Insights</strong> translated into plain language for your prescribed medications.</>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Languages className="w-4 h-4 text-indigo-600" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as "English" | "Hindi")}
                className="px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">हिंदी (Hindi)</option>
              </select>
            </div>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">Your Medicine Cabinet is Empty</h3>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                No active prescriptions recorded. When a doctor writes a prescription for you, AI guidance and audio explanations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.flatMap((rx, rIdx) =>
                (rx.medicines || []).map((med, mIdx) => {
                  const cacheKey = `${rIdx}-${mIdx}-${selectedLanguage}`;
                  const isExpanded = expandedMedIndex === mIdx;
                  const isHindi = selectedLanguage === "Hindi";
                  const isTranslating = loadingTranslations[cacheKey];

                  let explainer: any = translations[cacheKey];
                  if (!explainer) {
                    if (typeof rx.ai_explanation === "string") {
                      try { explainer = JSON.parse(rx.ai_explanation); } catch {}
                    } else if (rx.ai_explanation && typeof rx.ai_explanation === "object" && rx.ai_explanation.why_prescribed) {
                      explainer = rx.ai_explanation;
                    }
                  }

                  const janPrice = med.jan_aushadhi_price != null ? Number(med.jan_aushadhi_price) : null;
                  const marketPrice = med.market_brand_price != null ? Number(med.market_brand_price) : null;
                  const savings =
                    marketPrice && janPrice && marketPrice > janPrice
                      ? Math.round(((marketPrice - janPrice) / marketPrice) * 100)
                      : null;

                  return (
                    <div
                      key={cacheKey}
                      className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 transition-all"
                    >
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-heading font-black text-base text-[#0F172A]">
                              {med.drug_name}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[#0891B2] font-bold text-[11px]">
                              {med.dosage_form} • {med.strength}
                            </span>
                            {med.rxcui && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px]">
                                RxCUI: {med.rxcui}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#475569] mt-1">
                            {isHindi ? (
                              <><strong>{rx.diagnosis_text}</strong> के लिए {rx.doctor_name && `${rx.doctor_name} द्वारा`} निर्धारित।</>
                            ) : (
                              <>Prescribed for <strong>{rx.diagnosis_text}</strong> {rx.doctor_name && `by ${rx.doctor_name}`}</>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            onClick={() => setRefillModalRx(rx)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[34px]"
                          >
                            {isHindi ? "दवा दोबारा मांगें (Refill)" : "Request Refill"}
                          </button>
                          <button
                            onClick={() => handleDeletePrescription(rx.id)}
                            disabled={deletingId === rx.id}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center justify-center min-h-[34px] min-w-[34px]"
                            title="Delete Prescription Record"
                          >
                            {deletingId === rx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setExpandedMedIndex(isExpanded ? null : mIdx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Generic / Jan Aushadhi Cost Savings Pill */}
                      {savings && savings > 0 && janPrice != null && marketPrice != null && (
                        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-amber-600" />
                            <span>
                              <strong>{isHindi ? "सस्ती जेनेरिक दवा उपलब्ध:" : "Generic Equivalent Available:"}</strong> {med.generic_name || med.drug_name} (₹{janPrice.toFixed(2)} vs Branded ₹{marketPrice.toFixed(2)})
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                            {isHindi ? `जन औषधि पर ${savings}% की बचत` : `Save ${savings}% under Jan Aushadhi`}
                          </span>
                        </div>
                      )}

                      {/* 5-Part AI Patient Explainer Accordion */}
                      {isExpanded && (
                        <div className="space-y-3 pt-2">
                          {/* Audio Summary Player */}
                          <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200/70 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-[#0891B2] font-bold">
                              <Sparkles className="w-4 h-4" />
                              <span>
                                {isHindi ? "AI ऑडियो परामर्श सहायक (हिंदी)" : `AI Audio Care Assistant (${selectedLanguage})`}
                              </span>
                              {isTranslating && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0891B2]" />}
                            </div>
                            <button
                              onClick={() =>
                                handleSpeak(
                                  explainer?.audio_summary_script ||
                                    explainer?.why_prescribed ||
                                    `Please take ${med.drug_name} as directed by your doctor.`,
                                  cacheKey
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                speakingIndex === cacheKey
                                  ? "bg-red-600 text-white"
                                  : "bg-[#0891B2] hover:bg-[#0e7490] text-white"
                              }`}
                            >
                              {speakingIndex === cacheKey ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5" /> {isHindi ? "आवाज बंद करें" : "Stop Audio"}
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" /> {isHindi ? "आवाज में सुनें" : "Listen Aloud"}
                                </>
                              )}
                            </button>
                          </div>

                          {/* Clinical Intelligence Badges */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {explainer?.drug_class && (
                              <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
                                💊 {explainer.drug_class}
                              </span>
                            )}
                            {explainer?.expected_onset && (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                                ⚡ {explainer.expected_onset}
                              </span>
                            )}
                            {explainer?.active_ingredient && (
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                                🔬 Salt: {explainer.active_ingredient}
                              </span>
                            )}
                          </div>

                          {/* 5 Modules */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <div className="font-bold text-[#0891B2] flex items-center gap-1.5">
                                <span>{isHindi ? "🎯 दवा देने का मुख्य कारण" : "🎯 Why Prescribed to You"}</span>
                              </div>
                              <p className="text-slate-600 leading-relaxed font-medium">
                                {explainer?.why_prescribed ||
                                  (isHindi
                                    ? `यह दवा आपके ${rx.diagnosis_text} के उपचार और नियंत्रण के लिए दी गई है।`
                                    : `Prescribed to treat and manage ${rx.diagnosis_text}.`)}
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <div className="font-bold text-[#0891B2] flex items-center gap-1.5">
                                <span>{isHindi ? "⚙️ दवा का कार्य (सरल शब्दों में)" : "⚙️ How It Works (Simple Analogy)"}</span>
                              </div>
                              <p className="text-slate-600 leading-relaxed font-medium">
                                {explainer?.how_it_works_simple ||
                                  (isHindi
                                    ? "यह दवा शरीर में आवश्यक संतुलन बनाकर आपके स्वास्थ्य में तेजी से सुधार लाती है।"
                                    : "Helps your body maintain healthy balance and target underlying symptoms.")}
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <div className="font-bold text-[#0891B2] flex items-center gap-1.5">
                                <span>{isHindi ? "⏰ कब और कैसे लें" : "⏰ When & How to Take"}</span>
                              </div>
                              <ul className="text-slate-600 space-y-1 font-medium">
                                <li>• <strong>{isHindi ? "समय:" : "Schedule:"}</strong> {med.schedule_code} ({explainer?.how_to_take?.timing || "नियमित समय पर"})</li>
                                <li>• <strong>{isHindi ? "भोजन का नियम:" : "Food Rule:"}</strong> {explainer?.how_to_take?.food_rule || med.food_instructions || "भोजन के बाद पानी के साथ"}</li>
                                <li>• <strong>{isHindi ? "मात्रा:" : "Quantity:"}</strong> {med.quantity_to_dispense} {isHindi ? "गोलियां" : "units"} ({med.duration_days} {isHindi ? "दिन" : "days"})</li>
                              </ul>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <div className="font-bold text-[#0891B2] flex items-center gap-1.5">
                                <span>{isHindi ? "⚠️ सावधानियां व दुष्प्रभाव" : "⚠️ What to Watch Out For"}</span>
                              </div>
                              <div className="text-slate-600 space-y-1 font-medium">
                                <p className="text-emerald-700">
                                  • <strong>{isHindi ? "सामान्य/हल्के:" : "Normal/Mild:"}</strong>{" "}
                                  {explainer?.side_effects?.common_mild?.join(", ") || (isHindi ? "शुरुआती दिनों में हल्का पाचन परिवर्तन" : "Mild digestive adjustments")}
                                </p>
                                <p className="text-rose-700">
                                  • <strong>{isHindi ? "डॉक्टर से संपर्क करें:" : "Seek Care If:"}</strong>{" "}
                                  {explainer?.side_effects?.seek_help_if?.join(", ") || (isHindi ? "अत्यधिक कमजोरी, सांस लेने में तकलीफ या गंभीर खुजली" : "Severe dizziness or sudden skin rash")}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Pharmacist Lifestyle Tip & Avoidances */}
                          {(explainer?.lifestyle_tip || explainer?.foods_and_habits_to_avoid?.length > 0) && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                              <span className="font-bold flex items-center gap-1 text-emerald-800">
                                💡 {isHindi ? "फार्मासिस्ट रिकवरी व लाइफस्टाइल सलाह" : "Pharmacist Care & Recovery Advice"}
                              </span>
                              {explainer?.lifestyle_tip && (
                                <p className="text-[11px] leading-relaxed text-emerald-900 font-medium">
                                  • {explainer.lifestyle_tip}
                                </p>
                              )}
                              {explainer?.foods_and_habits_to_avoid?.length > 0 && (
                                <p className="text-[11px] leading-relaxed text-rose-800 font-medium">
                                  • <strong>{isHindi ? "परहेज करें:" : "Avoid:"}</strong> {explainer.foods_and_habits_to_avoid.join(" • ")}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Missed Dose Box */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                            <span className="font-bold">{isHindi ? "यदि खुराक लेना भूल जाएं?" : "What if I forget a dose?"}</span>
                            <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                              {explainer?.missed_dose_guidance ||
                                (isHindi
                                  ? "याद आते ही लें, लेकिन यदि अगली खुराक का समय हो गया हो तो पिछली खुराक छोड़ दें। दो खुराक एक साथ कभी न लें।"
                                  : "Take as soon as remembered unless it is almost time for your next scheduled dose. Never take two doses at once.")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: PRESCRIPTION ARCHIVE & SCANNABLE QR CODES           */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "archive" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-[#0F172A] flex items-center justify-between">
            <span>Show these scannable QR passes at any pharmacy for digital authenticity verification.</span>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">No Digital Prescription Passes Yet</h3>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                When your doctor notarizes a prescription, your secure digital QR pass will be available here for pharmacy verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          Prescription ID
                        </span>
                        <span className="font-heading font-black text-lg text-[#0891B2]">{rx.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rx.source_type === "PATIENT_UPLOADED" && (
                          <span className="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold flex items-center gap-1">
                            <Pill className="w-3 h-3 text-violet-600" /> EXTERNAL (PATIENT UPLOADED)
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> {rx.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-bold text-[#0F172A]">
                        {rx.source_type === "PATIENT_UPLOADED"
                          ? (rx.doctor_name && rx.doctor_name !== "Dr. Sarah Jenkins, MD" && rx.doctor_name !== "No doctor provided" ? rx.doctor_name : "Doctor: No data provided")
                          : (rx.doctor_name || "Prescribing Physician")}
                      </div>
                      <div className="text-[#475569]">
                        {rx.source_type === "PATIENT_UPLOADED"
                          ? (rx.hospital_name && rx.hospital_name !== "MediVault Healthcare" && rx.hospital_name !== "No hospital provided" ? rx.hospital_name : "Hospital / Clinic: No data provided")
                          : (rx.hospital_name || "MediVault Healthcare")}
                      </div>
                      <div className="text-[#475569] pt-1">
                        <strong>Diagnosis:</strong> {rx.diagnosis_text || "No diagnosis provided"}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider block">
                        Prescribed Medications ({rx.medicines?.length || 0})
                      </span>
                      {rx.medicines?.map((m, idx) => (
                        <div key={idx} className="flex justify-between font-medium text-[#0F172A]">
                          <span>{m.drug_name}</span>
                          <span className="text-[#0891B2] font-bold">{m.schedule_code} ({m.duration_days}d)</span>
                        </div>
                      ))}
                    </div>

                    {rx.blockchain_tx_hash && (
                      <div className="pt-2 text-[10px] font-mono text-slate-400 truncate">
                        Tx: {rx.blockchain_tx_hash}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setQrModalRx(rx)}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] text-xs font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                    >
                      <QrCode className="w-4 h-4" /> Show QR Pass
                    </button>
                    <Link
                      href={`/verify/rx/${rx.id}`}
                      target="_blank"
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 min-h-[38px]"
                      title="Verify On-Chain"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeletePrescription(rx.id)}
                      disabled={deletingId === rx.id}
                      className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center min-h-[38px]"
                      title="Delete Prescription"
                    >
                      {deletingId === rx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: OFFLINE PRESCRIPTION UPLOAD & AI OCR INTELLIGENCE   */}
      {/* ────────────────────────────────────────────────────────── */}
      {(activeTab as any) === "upload" && (
        <div className="space-y-6">
          {/* Stage 1: Upload Dropzone */}
          {offlineStage === "idle" && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <OfflinePrescriptionUpload
                patientId={user?.id || "pat-1001"}
                token={authToken}
                onUploadStarted={handleUploadStarted}
              />
            </div>
          )}

          {/* Stage 2: OCR & Extraction Status (Polling) */}
          {offlineStage === "polling" && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-heading font-black text-lg text-[#0F172A] flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#0891B2]" />
                    Analyzing Offline Prescription
                  </h2>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Job ID: <span className="font-mono">{uploadJob?.jobId}</span>
                  </p>
                </div>
                <button
                  onClick={resetOfflineFlow}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel / Start Over
                </button>
              </div>

              <PrescriptionOCRStatus
                status={jobStatus?.status || "PROCESSING"}
                errorMessage={jobStatus?.error_message}
                imageQualityScore={jobStatus?.ocr_result?.image_quality_score}
                qualityIssues={jobStatus?.ocr_result?.quality_issues}
                processingTimeMs={jobStatus?.processing_time_ms}
              />
            </div>
          )}

          {/* Stage 3: Verification & Review Screen */}
          {offlineStage === "review" && fullAnalysis && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <PrescriptionReviewScreen
                jobId={uploadJob?.jobId}
                imageUrl={fullAnalysis?.image_url}
                rawOcrText={fullAnalysis?.raw_ocr_text}
                structuredExtraction={fullAnalysis?.structured_extraction || { medications: [] }}
                patientId={user?.id || "pat-1001"}
                token={authToken}
                onConfirmed={handleConfirmed}
                onClose={resetOfflineFlow}
              />
            </div>
          )}

          {/* Stage 4: Confirmed Success State */}
          {offlineStage === "confirmed" && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-heading font-black text-xl text-[#0F172A]">
                  Prescription Verified & Added!
                </h3>
                <p className="text-xs text-[#475569]">
                  Your external prescription has been notarized into your longitudinal health record. It is now tracked in your Daily Dosing Schedule and visible on your Clinical Timeline.
                </p>
                {confirmedPrescriptionId && (
                  <div className="pt-2">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs">
                      Rx ID: {confirmedPrescriptionId}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("schedule")}
                  className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-xs flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" /> View Daily Doses
                </button>
                <Link
                  href="/patient/timeline"
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Go to Clinical Timeline
                </Link>
                <button
                  onClick={resetOfflineFlow}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: QR CODE DISPLAY FOR PHARMACIST SCANNING             */}
      {/* ────────────────────────────────────────────────────────── */}
      {qrModalRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-heading font-bold text-sm text-[#0F172A]">Digital Rx QR Pass</span>
              <button onClick={() => setQrModalRx(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Visual */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  typeof window !== "undefined"
                    ? `${window.location.origin}/verify/rx/${qrModalRx.id}`
                    : `https://medivault.app/verify/rx/${qrModalRx.id}`
                )}`}
                alt="Prescription QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <div className="text-xs space-y-1">
              <div className="font-bold text-[#0F172A]">{qrModalRx.id}</div>
              <p className="text-[11px] text-[#475569]">
                Pharmacists can scan this with any smartphone camera to verify validity and doctor notarization.
              </p>
            </div>

            <Link
              href={`/verify/rx/${qrModalRx.id}`}
              target="_blank"
              className="w-full py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" /> Open Public Verification Page
            </Link>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: 1-CLICK REFILL REQUEST                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {refillModalRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-heading font-bold text-sm text-[#0F172A]">Request Prescription Refill</span>
              <button onClick={() => setRefillModalRx(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {refillSuccess ? (
              <div className="p-6 text-center space-y-2 text-emerald-800">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Refill Request Sent!</div>
                <p className="text-xs text-slate-500">Your doctor has received your renewal request.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestRefillSubmit} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-[#0F172A]">Prescription: {refillModalRx.id}</div>
                  <div className="text-slate-500">
                    Doctor: {refillModalRx.source_type === "PATIENT_UPLOADED"
                      ? (refillModalRx.doctor_name && refillModalRx.doctor_name !== "No doctor provided" ? refillModalRx.doctor_name : "No data provided")
                      : (refillModalRx.doctor_name || "Prescribing Physician")}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Note to Doctor (Optional)</label>
                  <textarea
                    value={refillNotes}
                    onChange={(e) => setRefillNotes(e.target.value)}
                    placeholder="e.g. Taking medications regularly, symptoms well managed, requesting 30-day renewal."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0891B2] min-h-[80px]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs"
                >
                  Confirm & Submit Refill Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
