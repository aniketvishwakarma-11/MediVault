"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, 
  Upload, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Activity, 
  Sparkles,
  Bot,
  Key,
  ShieldAlert,
  Lock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Heart,
  TrendingUp,
  UserCheck,
  Download,
  Plus
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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

  const heightVal = parseFloat(heightStr.split(" ")[0]);
  const heightUnit = heightStr.includes("ft") ? "ft" : "cm";
  const weightVal = parseFloat(weightStr.split(" ")[0]);
  const weightUnit = weightStr.includes("lbs") ? "lbs" : "kg";

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
  const { user } = useAuth();

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

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        const docsRes = await fetch(`${API_BASE_URL}/documents/search?limit=5`);
        if (!docsRes.ok) {
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
          setApiError("Backend API server is offline. Run 'npm run dev' inside backend folder for live sync.");
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
        const { data: patientRow } = await supabase
          .from("patients")
          .select("blood_group, height, weight, allergies, chronic_conditions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (isMounted && patientRow) {
          const { bmi, status } = calculateRealBmi(patientRow.height, patientRow.weight);
          setPatientVitals({
            blood_group: patientRow.blood_group || "Not recorded",
            height: patientRow.height || "Not recorded",
            weight: patientRow.weight || "Not recorded",
            bmi: bmi,
            bmiStatus: status,
            allergies: patientRow.allergies || "No known allergies",
            chronic_conditions: patientRow.chronic_conditions || "None reported",
          });
        }
      } catch (err) {
        console.warn("Failed to fetch patient vitals:", err);
      }
    }

    fetchDashboardData();
    fetchRealPatientVitals();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* ================= GREETING HEADER ================= */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-600/15 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Health Vault Online • Zero-Knowledge Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to Your MediVault Portal
          </h1>
          <p className="text-sky-100 text-xs sm:text-sm leading-relaxed">
            Your medical records are fully encrypted and synchronized with IPFS storage and ZKP verification proofs.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <Link
            href="/patient/reports"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-sky-900 font-bold text-xs shadow-md hover:bg-sky-50 transition-all"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Upload Record</span>
          </Link>
          <Link
            href="/patient/emergency"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs backdrop-blur-md transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency QR</span>
          </Link>
        </div>
      </div>

      {/* API Notice Banner if backend is offline */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{apiError}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-colors flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3 h-3" /> Retry Sync
          </button>
        </div>
      )}

      {/* ================= METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Records</span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalDocuments}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Encrypted on IPFS Network</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Proofs</span>
            <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.verifiedBlockchain}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              <CheckCircle2 className="w-3 h-3" /> ZKP Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Polygon Blockchain Verified</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Consents</span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.activeConsents}</span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {stats.activeConsents} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Doctor Access Permissions</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Copilot</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">Ready</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Instant Health Insights</p>
        </div>
      </div>

      {/* ================= VITALS & QUICK ASSIST ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Vitals Overview Tile */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Patient Medical Identity & Vitals</h3>
            </div>
            <Link href="/patient/profile" className="text-[11px] font-bold text-sky-600 hover:text-sky-700">
              Edit Profile
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">Blood Group</div>
              <div className="text-xl font-extrabold text-slate-900">{patientVitals?.blood_group || "No data"}</div>
              <div className="text-[10px] font-bold text-teal-600">Recorded</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">Height</div>
              <div className="text-xl font-extrabold text-slate-900">{patientVitals?.height || "No data"}</div>
              <div className="text-[10px] font-bold text-sky-600">Patient Vitals</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">Weight</div>
              <div className="text-xl font-extrabold text-slate-900">{patientVitals?.weight || "No data"}</div>
              <div className="text-[10px] font-bold text-sky-600">Patient Vitals</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">Calculated BMI</div>
              <div className="text-xl font-extrabold text-slate-900">{patientVitals?.bmi || "No data"}</div>
              <div className={`text-[10px] font-bold ${patientVitals?.bmiStatus === "Healthy" ? "text-emerald-600" : "text-amber-600"}`}>
                {patientVitals?.bmiStatus || "Requires Ht & Wt"}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 font-medium">
              <span className="font-bold text-amber-900">Known Allergies: </span>
              <span className="text-amber-800">{patientVitals?.allergies || "No known allergies reported"}</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 font-medium">
              <span className="font-bold text-purple-900">Chronic Conditions: </span>
              <span className="text-purple-800">{patientVitals?.chronic_conditions || "None reported"}</span>
            </div>
          </div>
        </div>

        {/* AI Copilot Quick Assistant Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-sky-50 to-teal-50/70 p-6 rounded-3xl border border-sky-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sky-950 text-base">AI Medical Copilot</h3>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Have questions about a lab result or prescription? Ask the AI Copilot for clinical explanations and symptom analysis.
            </p>
          </div>

          <Link
            href="/patient/ai-copilot"
            className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open AI Chat Assistant</span>
          </Link>
        </div>

      </div>

      {/* ================= RECENT MEDICAL RECORDS TABLE ================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Recent Medical Documents</h3>
            <p className="text-xs text-slate-500">Encrypted files uploaded to your private vault</p>
          </div>
          <Link
            href="/patient/reports"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
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
            <p className="text-sm font-semibold text-slate-700">No medical records uploaded yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your lab reports, prescriptions, or discharge summaries to store them securely.
            </p>
            <Link
              href="/patient/reports"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-700 transition-all"
            >
              <Plus className="w-4 h-4" /> Upload Document Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="pb-3 px-2">Document Name</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Doctor / Facility</th>
                  <th className="pb-3 px-2">Size</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-2 font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.document_name || doc.original_filename}</span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {doc.document_category || "General"}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-600">
                      {doc.doctor_name || doc.hospital_name || "Self Uploaded"}
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-mono">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                        <Lock className="w-3 h-3 text-teal-600" /> IPFS Encrypted
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <Link
                        href="/patient/reports"
                        className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 inline-flex items-center gap-1 font-bold text-xs"
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

    </div>
  );
}
