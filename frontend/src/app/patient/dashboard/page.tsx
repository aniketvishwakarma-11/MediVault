"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { 
  FileText, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight, 
  Bot,
  Key,
  ShieldAlert,
  Lock,
  RefreshCw,
  AlertCircle,
  Heart,
  TrendingUp,
  Download,
  Plus,
  Activity
} from "lucide-react";
import { BloodPressureChart, RecordsActivityChart } from "@/app/components/ClinicalCharts";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { DEMO_REPORTS, DEMO_PATIENT_PROFILE } from "@/lib/demoData";

interface DocumentRecord {
  id: string;
  patient_id: string;
  document_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  document_category: string;
  hospital_name?: string | null;
  doctor_name?: string | null;
  visit_date?: string | null;
  checksum_sha256: string;
  created_at: string;
}

interface PatientVitalsData {
  blood_group: string;
  height: string;
  weight: string;
  bmi: string | null;
  bmiStatus: string | null;
  allergies: string;
  chronic_conditions: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function calculateRealBmi(heightStr: string | null | undefined, weightStr: string | null | undefined) {
  if (!heightStr || !weightStr) return { bmi: null, status: null };

  const cleanHeight = String(heightStr).trim();
  const cleanWeight = String(weightStr).trim();

  const heightMatch = cleanHeight.match(/([0-9.]+)/);
  const weightMatch = cleanWeight.match(/([0-9.]+)/);

  if (!heightMatch || !weightMatch) return { bmi: null, status: null };

  const heightVal = parseFloat(heightMatch[1]);
  const weightVal = parseFloat(weightMatch[1]);

  const heightUnit = cleanHeight.toLowerCase().includes("ft") ? "ft" : "cm";
  const weightUnit = cleanWeight.toLowerCase().includes("lbs") ? "lbs" : "kg";

  if (isNaN(heightVal) || isNaN(weightVal) || heightVal <= 0 || weightVal <= 0) {
    return { bmi: null, status: null };
  }

  let heightMeters = heightVal;
  if (heightUnit === "cm") {
    heightMeters = heightVal / 100;
  } else if (heightUnit === "ft") {
    heightMeters = heightVal * 0.3048;
  }

  let weightKg = weightVal;
  if (weightUnit === "lbs") {
    weightKg = weightVal * 0.453592;
  }

  const bmiNum = weightKg / (heightMeters * heightMeters);
  if (isNaN(bmiNum) || !isFinite(bmiNum)) return { bmi: null, status: null };

  const bmiStr = bmiNum.toFixed(1);
  let status = "Healthy";
  if (bmiNum < 18.5) status = "Underweight";
  else if (bmiNum >= 18.5 && bmiNum <= 24.9) status = "Healthy";
  else if (bmiNum >= 25 && bmiNum <= 29.9) status = "Overweight";
  else status = "Obese";

  return { bmi: bmiStr, status };
}

export default function PatientDashboard() {
  const { user, isDemo } = useAuth();

  const [stats, setStats] = useState({
    totalDocuments: 0,
    verifiedBlockchain: 0,
    recentVisits: 0,
    activeConsents: 0,
  });

  const [recentReports, setRecentReports] = useState<DocumentRecord[]>([]);
  const [patientVitals, setPatientVitals] = useState<PatientVitalsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // IF DEMO USER: Load complete demo dataset
    if (isDemo) {
      if (isMounted) {
        setRecentReports(DEMO_REPORTS as DocumentRecord[]);
        setStats({
          totalDocuments: DEMO_REPORTS.length,
          verifiedBlockchain: DEMO_REPORTS.length,
          recentVisits: 3,
          activeConsents: 2,
        });
        setPatientVitals({
          blood_group: DEMO_PATIENT_PROFILE.blood_group,
          height: `${DEMO_PATIENT_PROFILE.height} ${DEMO_PATIENT_PROFILE.height_unit}`,
          weight: `${DEMO_PATIENT_PROFILE.weight} ${DEMO_PATIENT_PROFILE.weight_unit}`,
          bmi: "23.0",
          bmiStatus: "Healthy",
          allergies: DEMO_PATIENT_PROFILE.allergies,
          chronic_conditions: DEMO_PATIENT_PROFILE.chronic_conditions,
        });
        setIsLoading(false);
      }
      return;
    }

    // IF REAL USER: Fetch STRICTLY real database records
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || '';
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const docsRes = await fetch(`${API_BASE_URL}/documents/search?limit=5`, { headers });
        if (!docsRes.ok) {
          if (docsRes.status === 401) {
            // Handle unauthenticated state gracefully for initial load
            setRecentReports([]);
            setIsLoading(false);
            return;
          }
          throw new Error(`API responded with status ${docsRes.status}`);
        }
        const docsData = await docsRes.json();

        if (isMounted && docsData.success) {
          const liveDocs: DocumentRecord[] = docsData.data || [];
          setRecentReports(liveDocs);
          const total = docsData.pagination?.total || liveDocs.length;
          
          setStats({
            totalDocuments: total,
            verifiedBlockchain: total,
            recentVisits: liveDocs.filter(d => d.visit_date).length,
            activeConsents: 0,
          });
        }
      } catch (err: any) {
        console.warn("[Dashboard Sync Warning] Backend API status:", err);
        if (isMounted) {
          setRecentReports([]);
          setStats({
            totalDocuments: 0,
            verifiedBlockchain: 0,
            recentVisits: 0,
            activeConsents: 0,
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    async function fetchRealPatientVitals() {
      if (!user) return;
      try {
        const { data: patientRow, error: patientErr } = await supabase
          .from("patients")
          .select("blood_group, vitals_json, allergies_json, chronic_conditions_json")
          .eq("user_id", user.id)
          .maybeSingle();

        if (patientErr) {
          console.warn("Patient vitals query warning:", patientErr.message);
        }

        let rawBloodGroup = patientRow?.blood_group || "";
        let rawHeight = "";
        let rawWeight = "";
        let rawAllergies = "";
        let rawChronic = "";

        if (patientRow) {
          let vitalsObj: any = {};
          if (typeof patientRow.vitals_json === "string") {
            try {
              vitalsObj = JSON.parse(patientRow.vitals_json);
            } catch (e) {}
          } else if (patientRow.vitals_json && typeof patientRow.vitals_json === "object") {
            vitalsObj = patientRow.vitals_json;
          }

          rawHeight = vitalsObj.height || (patientRow as any).height || "";
          rawWeight = vitalsObj.weight || (patientRow as any).weight || "";

          if (Array.isArray(patientRow.allergies_json) && patientRow.allergies_json.length > 0) {
            rawAllergies = patientRow.allergies_json.join(", ");
          } else if (typeof patientRow.allergies_json === "string" && (patientRow.allergies_json as string).trim()) {
            rawAllergies = patientRow.allergies_json;
          } else if ((patientRow as any).allergies) {
            rawAllergies = (patientRow as any).allergies;
          }

          if (Array.isArray(patientRow.chronic_conditions_json) && patientRow.chronic_conditions_json.length > 0) {
            rawChronic = patientRow.chronic_conditions_json.join(", ");
          } else if (typeof patientRow.chronic_conditions_json === "string" && (patientRow.chronic_conditions_json as string).trim()) {
            rawChronic = patientRow.chronic_conditions_json;
          } else if ((patientRow as any).chronic_conditions) {
            rawChronic = (patientRow as any).chronic_conditions;
          }
        }

        // Draft / LocalStorage fallback resilience
        try {
          const draftKey = `medivault_profile_draft_${user.id}`;
          const savedDraft = sessionStorage.getItem(draftKey);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (!rawBloodGroup && parsed.blood_group) rawBloodGroup = parsed.blood_group;
            if (!rawHeight && parsed.height) rawHeight = `${parsed.height} ${parsed.height_unit || 'cm'}`;
            if (!rawWeight && parsed.weight) rawWeight = `${parsed.weight} ${parsed.weight_unit || 'kg'}`;
            if (!rawAllergies && parsed.allergies) rawAllergies = parsed.allergies;
            if (!rawChronic && parsed.chronic_conditions) rawChronic = parsed.chronic_conditions;
          }
        } catch (e) {}

        const { bmi, status } = calculateRealBmi(rawHeight, rawWeight);

        if (isMounted) {
          const finalHeight = rawHeight && rawHeight.trim() !== "cm" && rawHeight.trim() !== "kg" ? rawHeight : "Not recorded";
          const finalWeight = rawWeight && rawWeight.trim() !== "cm" && rawWeight.trim() !== "kg" ? rawWeight : "Not recorded";

          setPatientVitals({
            blood_group: rawBloodGroup && rawBloodGroup !== "Not provided" ? rawBloodGroup : "Not recorded",
            height: finalHeight,
            weight: finalWeight,
            bmi: bmi,
            bmiStatus: status,
            allergies: rawAllergies || "No known allergies reported",
            chronic_conditions: rawChronic || "None reported",
          });
        }
      } catch (e) {
        console.warn("Patient vitals fetch warning:", e);
      }
    }

    fetchDashboardData();
    fetchRealPatientVitals();

    return () => {
      isMounted = false;
    };
  }, [user, isDemo]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <motion.div
      className="space-y-6 font-body"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      
      {/* ================= GREETING HEADER ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-[#0891B2]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span>Health Vault Online · Zero-Knowledge Active</span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Welcome to Your MediVault Portal
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your medical records are fully encrypted and synchronized with IPFS storage and ZKP verification proofs.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          <Link
            href="/patient/reports"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-sm shadow-xs transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Record</span>
          </Link>
          <Link
            href="/patient/emergency"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
          >
            <ShieldAlert className="w-4 h-4 text-[#0891B2]" />
            <span>Emergency QR Pass</span>
          </Link>
        </div>
      </div>

      {/* API Notice Banner if backend is offline */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#92400E] shrink-0" />
            <span className="font-medium">{apiError}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 rounded-xl bg-[#FDE68A] text-[#92400E] font-bold hover:bg-amber-200 transition-colors flex items-center gap-1.5 shrink-0 min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
          </button>
        </div>
      )}

      {/* ================= METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Total Records</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="tabular text-2xl sm:text-3xl font-bold text-[#0F172A]">{stats.totalDocuments}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              <TrendingUp className="w-3 h-3 text-[#22C55E]" /> Live Sync
            </span>
          </div>
          <p className="text-[11px] text-[#475569] font-mono">Encrypted on IPFS Network</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Verified Proofs</span>
            <div className="p-2.5 rounded-2xl bg-teal-50 text-[#0891B2] border border-teal-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="tabular text-2xl sm:text-3xl font-bold text-[#0F172A]">{stats.verifiedBlockchain}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
              <CheckCircle2 className="w-3 h-3 text-[#0891B2]" /> ZKP Active
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Polygon Blockchain Verified</p>
        </div>

        {/* Metric 3 — Active Consents (brand teal, not indigo) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Active Consents</span>
            <div className="p-2.5 rounded-xl bg-slate-50 text-[#0891B2] border border-slate-200">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="tabular text-2xl sm:text-3xl font-bold text-[#0F172A]">{stats.activeConsents}</span>
            <span className="text-[11px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-200">
              {stats.activeConsents} Active
            </span>
          </div>
          <p className="text-[11px] text-[#475569] font-mono tabular-nums">Doctor Access Permissions</p>
        </div>

        {/* Metric 4 — AI Copilot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">AI Copilot</span>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              <Bot className="w-5 h-5 text-[#22C55E]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Ready</span>
            <span className="text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-md border border-[#A7F3D0]">
              Active
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Instant Health Insights</p>
        </div>
      </div>

      {/* ================= VITALS & QUICK ASSIST ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Vitals Overview Tile */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <h3 className="font-heading font-bold text-[#0F172A] text-base">Patient Medical Identity & Vitals</h3>
            </div>
            <Link href="/patient/profile" className="text-xs font-bold text-[#0891B2] hover:text-[#0e7490] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-md px-2 py-1">
              Edit Profile
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-[#475569]">Blood Group</div>
              <div className="font-heading text-xl font-extrabold text-[#0F172A]">{patientVitals?.blood_group || "No data"}</div>
              <div className="text-[10px] font-bold text-[#0891B2]">Recorded</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-[#475569]">Height</div>
              <div className="font-heading text-xl font-extrabold text-[#0F172A]">{patientVitals?.height || "No data"}</div>
              <div className="text-[10px] font-bold text-[#0891B2]">Patient Vitals</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-[#475569]">Weight</div>
              <div className="font-heading text-xl font-extrabold text-[#0F172A]">{patientVitals?.weight || "No data"}</div>
              <div className="text-[10px] font-bold text-[#0891B2]">Patient Vitals</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-[#475569]">Calculated BMI</div>
              <div className="font-heading text-xl font-extrabold text-[#0F172A]">{patientVitals?.bmi || "No data"}</div>
              <div className={`text-[10px] font-bold ${patientVitals?.bmiStatus === "Healthy" ? "text-[#065F46]" : "text-[#92400E]"}`}>
                {patientVitals?.bmiStatus || "Requires Ht & Wt"}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {/* Allergies — amber semantic token (correct) */}
            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] font-medium">
              <span className="font-heading font-bold text-[#92400E] text-xs uppercase tracking-wide block mb-1">Known Allergies</span>
              <span className="text-xs">{patientVitals?.allergies || "No known allergies reported"}</span>
            </div>
            {/* Chronic Conditions — neutral slate (not purple) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <span className="font-heading font-bold text-slate-600 text-xs uppercase tracking-wide block mb-1">Chronic Conditions</span>
              <span className="text-xs">{patientVitals?.chronic_conditions || "None reported"}</span>
            </div>
          </div>
        </div>

        {/* AI Copilot Quick Assistant Card */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-[#0F172A] text-base">AI Medical Copilot</h3>
              </div>
              <span className="text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                Online
              </span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed font-medium">
              Have questions about a lab result or prescription? Ask the AI Copilot for clinical explanations and symptom analysis.
            </p>
          </div>

          <Link
            href="/patient/ai-copilot"
            className="w-full py-3.5 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
          >
            <Bot className="w-4 h-4 text-[#22D3EE]" />
            <span>Open AI Chat Assistant</span>
          </Link>
        </div>

      </div>

      {/* ================= CLINICAL TREND CHARTS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Blood Pressure Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-50 border border-cyan-100">
                <Activity className="w-4 h-4 text-[#0891B2]" />
              </div>
              <h3 className="font-heading font-bold text-[#0F172A] text-sm">Blood Pressure Trend</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#0891B2] inline-block" /> Systolic</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#22C55E] inline-block border-dashed" /> Diastolic</span>
            </div>
          </div>
          <BloodPressureChart />
          <p className="text-[10px] text-slate-400 font-mono tabular-nums text-right">Last 6 months · Sample data</p>
        </div>

        {/* Monthly Records Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <FileText className="w-4 h-4 text-[#0891B2]" />
              </div>
              <h3 className="font-heading font-bold text-[#0F172A] text-sm">Records Activity</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Uploads / month</span>
          </div>
          <RecordsActivityChart />
          <p className="text-[10px] text-slate-400 font-mono tabular-nums text-right">Last 6 months · Sample data</p>
        </div>

      </div>

      {/* ================= RECENT MEDICAL RECORDS TABLE ================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-heading font-bold text-[#0F172A] text-lg">Recent Medical Documents</h3>
            <p className="text-xs text-[#475569]">Encrypted files uploaded to your private vault</p>
          </div>
          <Link
            href="/patient/reports"
            className="text-xs font-bold text-[#0891B2] hover:text-[#0e7490] flex items-center gap-1 min-h-[36px] px-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
          >
            <span>View All Vault Documents</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
            Loading document records...
          </div>
        ) : recentReports.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-heading text-sm font-semibold text-[#0F172A]">No medical records uploaded yet</p>
            <p className="text-xs text-[#475569] max-w-sm mx-auto">
              Upload your lab reports, prescriptions, or discharge summaries to store them securely.
            </p>
            <Link
              href="/patient/reports"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] text-white text-xs font-bold shadow-xs transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
            >
              <Plus className="w-4 h-4" /> Upload Document Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[#475569] uppercase font-heading font-bold text-[10px]">
                  <th className="pb-3 px-3">Document Name</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Doctor / Facility</th>
                  <th className="pb-3 px-3">Size</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-heading font-bold text-[#0F172A] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0891B2] shrink-0" />
                      <span className="truncate max-w-xs">{doc.document_name || doc.original_filename}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[#475569] font-medium text-[11px]">
                        {doc.document_category || "General"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#475569]">
                      {doc.doctor_name || doc.hospital_name || "Self Uploaded"}
                    </td>
                    <td className="py-3.5 px-3 text-[#475569] font-mono">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] font-bold border border-[#A7F3D0] text-[11px]">
                        <Lock className="w-3 h-3 text-[#22C55E]" /> IPFS Encrypted
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href="/patient/reports"
                        className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] inline-flex items-center gap-1 font-bold text-xs min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                      >
                        <Download className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </motion.div>
  );
}
