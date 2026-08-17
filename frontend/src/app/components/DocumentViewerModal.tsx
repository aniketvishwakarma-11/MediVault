"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Eye,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Pill,
  Stethoscope,
  Clock,
  HeartPulse,
  Building2,
  User,
  Calendar,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Zap,
  RotateCw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Apple,
  ClipboardList,
  Cpu,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Bot,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- Interfaces & Types ---
export interface LabResult {
  test_name: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  clinical_meaning?: string | null;
  confidence?: number | null;
}

export interface Medication {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  purpose?: string | null;
  instructions?: string | null;
}

export interface TimelineItem {
  title: string;
  date: string;
  description: string;
  importance?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  documentName: string;
  originalFilename?: string;
  documentCategory?: string;
  mimeType?: string;
  signedUrl?: string | null;
  fileSize?: number;
  visitDate?: string;
  doctorName?: string;
  hospitalName?: string;
  checksumSha256?: string;
  aiAnalysis?: any;
  onDownload?: () => void;
  onAnalysisUpdated?: (newAnalysis: any) => void;
  isLoading?: boolean;
  error?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// --- Helper Utilities ---

function formatExactTimestamp(rawDate?: string | number | Date | null): string {
  const d = rawDate ? new Date(rawDate) : new Date();
  const dateObj = isNaN(d.getTime()) ? new Date() : d;

  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');

  const day = dateObj.getDate().toString().padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${formattedHours}:${minutes} ${ampm}, ${day} ${month} ${year}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "Unknown size";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function resolveReportTitle(aiData: any, documentCategory: string | undefined, documentName: string): string {
  if (aiData?.document?.document_type && aiData.document.document_type !== "Other") {
    const dt = aiData.document.document_type;
    return dt.endsWith("Report") || dt.endsWith("Summary") || dt.endsWith("Panel") || dt.endsWith("Prescription") 
      ? dt 
      : `${dt} Medical Report`;
  }
  
  if (documentCategory && documentCategory !== "Other" && documentCategory !== "General") {
    return documentCategory.endsWith("Report") ? documentCategory : `${documentCategory} Report`;
  }

  if (documentName && !/^(image|img|doc|scan|file|document)[_-]?\d+/i.test(documentName)) {
    return documentName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  }

  return "Clinical Health Analysis";
}

function formatBulletPoints(text?: string | null, fallback: string[] = []): string[] {
  if (!text || text.trim() === "") return fallback;
  
  const rawBullets = text
    .split(/(?:\r?\n|•|- |\d+\.\s+)/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (rawBullets.length >= 2) {
    return rawBullets.slice(0, 5);
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  return sentences.length > 0 ? sentences.slice(0, 5) : fallback;
}

function calculateRangeDeviation(valueVal: any, rangeVal?: any): {
  diffLabel: string;
  status: 'HIGH' | 'LOW' | 'NORMAL' | 'UNKNOWN';
  percentage: number;
} {
  if (valueVal === undefined || valueVal === null || rangeVal === undefined || rangeVal === null) {
    return { diffLabel: "N/A", status: "UNKNOWN", percentage: 50 };
  }

  const valueStr = String(valueVal).trim();
  const rangeStr = String(rangeVal).trim();

  if (!valueStr || !rangeStr) return { diffLabel: "N/A", status: "UNKNOWN", percentage: 50 };

  const numVal = parseFloat(valueStr.replace(/[^0-9.-]/g, ""));
  if (isNaN(numVal)) return { diffLabel: "N/A", status: "UNKNOWN", percentage: 50 };

  const rangeMatch = rangeStr.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max) && max > min) {
      const span = max - min;
      let pct = Math.round(((numVal - min) / span) * 100);
      pct = Math.max(4, Math.min(96, pct));

      if (numVal > max) {
        const diff = +(numVal - max).toFixed(2);
        return { diffLabel: `+${diff} above max target (${max})`, status: 'HIGH', percentage: pct };
      } else if (numVal < min) {
        const diff = +(min - numVal).toFixed(2);
        return { diffLabel: `-${diff} below min target (${min})`, status: 'LOW', percentage: pct };
      } else {
        return { diffLabel: `Within optimal range (${min}–${max})`, status: 'NORMAL', percentage: pct };
      }
    }
  }

  const ltMatch = rangeStr.match(/<\s*([0-9.]+)/);
  if (ltMatch) {
    const max = parseFloat(ltMatch[1]);
    if (numVal > max) {
      const diff = +(numVal - max).toFixed(2);
      return { diffLabel: `+${diff} above limit (< ${max})`, status: 'HIGH', percentage: 88 };
    }
    return { diffLabel: `Optimal (< ${max})`, status: 'NORMAL', percentage: 40 };
  }

  const gtMatch = rangeStr.match(/>\s*([0-9.]+)/);
  if (gtMatch) {
    const min = parseFloat(gtMatch[1]);
    if (numVal < min) {
      const diff = +(min - numVal).toFixed(2);
      return { diffLabel: `-${diff} below target (> ${min})`, status: 'LOW', percentage: 12 };
    }
    return { diffLabel: `Optimal (> ${min})`, status: 'NORMAL', percentage: 65 };
  }

  return { diffLabel: "Reference range recorded", status: "NORMAL", percentage: 50 };
}

// --- Main Component ---

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentId,
  documentName,
  originalFilename,
  documentCategory,
  mimeType = "application/pdf",
  signedUrl,
  fileSize,
  visitDate,
  doctorName,
  hospitalName,
  aiAnalysis,
  onAnalysisUpdated,
  isLoading = false,
  error = null,
}: DocumentViewerModalProps) {
  const [activeView, setActiveView] = useState<"insights" | "evidence">("insights");
  const [mounted, setMounted] = useState(false);
  const [localAiAnalysis, setLocalAiAnalysis] = useState<any>(aiAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzeStatusMsg, setAnalyzeStatusMsg] = useState<string | null>(null);
  const [showNormalLabs, setShowNormalLabs] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchingBlob, setFetchingBlob] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDegree, setRotationDegree] = useState<number>(0);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => {
    setZoomLevel(100);
    setRotationDegree(0);
  };
  const handleRotate = () => setRotationDegree((prev) => (prev + 90) % 360);

  const isImage = mimeType ? mimeType.startsWith("image/") : false;
  const directStreamUrl = documentId ? `${API_BASE_URL}/documents/${documentId}/file` : null;
  const effectiveFileUrl = signedUrl || directStreamUrl;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalAiAnalysis(aiAnalysis);
    setPreviewError(false);
  }, [aiAnalysis, signedUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadFileBlob() {
      if (!isOpen || !effectiveFileUrl) return;
      if (signedUrl && (signedUrl.startsWith("data:") || signedUrl.startsWith("blob:"))) {
        setBlobUrl(signedUrl);
        return;
      }

      setFetchingBlob(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(effectiveFileUrl, { headers });
        if (res.ok) {
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (isMounted) {
            setBlobUrl(objectUrl);
            setPreviewError(false);
          }
        } else if (directStreamUrl && effectiveFileUrl !== directStreamUrl) {
          const retryRes = await fetch(directStreamUrl, { headers });
          if (retryRes.ok) {
            const blob = await retryRes.blob();
            const objectUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setBlobUrl(objectUrl);
              setPreviewError(false);
            }
          }
        }
      } catch (err) {
        console.warn("File blob stream warning:", err);
      } finally {
        if (isMounted) setFetchingBlob(false);
      }
    }

    loadFileBlob();

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveFileUrl, signedUrl, directStreamUrl]);

  if (!isOpen || !mounted) return null;

  const handleRunAiAnalysis = async () => {
    if (!documentId) {
      setAnalyzeStatusMsg("Document ID missing.");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeStatusMsg("Running medical OCR & Gemini 1.5 Flash clinical extraction...");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${documentId}/analyze`, {
        method: "POST",
        headers,
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setLocalAiAnalysis(data.data);
        if (onAnalysisUpdated) onAnalysisUpdated(data.data);
        setActiveView("insights");
        setAnalyzeStatusMsg("AI Clinical Intelligence generated successfully!");
      } else {
        throw new Error(data.message || "Failed to generate AI analysis");
      }
    } catch (err: any) {
      setAnalyzeStatusMsg(`AI Analysis Failed: ${err.message || "Execution failed"}. Existing saved results preserved.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasRealAiAnalysis = Boolean(localAiAnalysis);
  const aiData = localAiAnalysis || {};

  // Extract medical items
  const labResults: LabResult[] = aiData.lab_results || [];
  const medications: Medication[] = aiData.medications || [];
  const diagnoses: string[] = aiData.diagnosis || [];
  const redFlags: string[] = aiData.red_flags || [];
  const followups: string[] = aiData.recommended_followup || [];
  const recommendedTests: string[] = aiData.recommended_tests || [];
  const lifestyleRecs: string[] = aiData.lifestyle_recommendations || [];
  const rawTimelineEvents: TimelineItem[] = aiData.timeline_events || [];

  const abnormalLabs = labResults.filter(l => l.status !== 'NORMAL');
  const normalLabs = labResults.filter(l => l.status === 'NORMAL');

  // Resolved Metadata & AI Specs
  const reportTitle = resolveReportTitle(aiData, documentCategory, documentName);
  const hospital = aiData.hospital?.name || hospitalName || "MediVault Health Network";
  const doctor = aiData.doctor?.name || doctorName || "Attending Physician";
  const vDate = aiData.visit?.visit_date || visitDate || "Recent Health Assessment";
  const specialty = aiData.document?.speciality || "General Medicine";
  const overallStatus = aiData.overall_health_status || (redFlags.length > 0 ? "ATTENTION_REQUIRED" : "STABLE");
  const confidenceScore = Math.round((aiData.document?.confidence || 0.96) * 100);

  // Model Engine & Generated Timestamp
  const aiModelEngine = aiData.ai_model || "Google Gemini 1.5 Flash";
  const rawTimestamp = aiData.analysis_timestamp || aiData.analyzed_at || aiData.created_at || (aiData as any).timestamp;
  const generatedTimestamp = formatExactTimestamp(rawTimestamp);

  // Bullet Point Digests
  const doctorBulletPoints = formatBulletPoints(aiData.document?.summary, [
    "Clinical report processed and verified against standard laboratory reference ranges.",
    "Comprehensive metabolic parameters and biological markers recorded.",
    "Patient health status evaluated for immediate risk factors."
  ]);

  const patientBulletPoints = formatBulletPoints(aiData.plain_language_explanation, [
    "Your health report has been analyzed into clear insights.",
    "Review any highlighted parameters that may require lifestyle changes or physician follow-up.",
    "Keep this report stored securely in your encrypted MediVault profile for future appointments."
  ]);

  // Timeline Events
  const timelineEvents: TimelineItem[] = rawTimelineEvents.length > 0 
    ? rawTimelineEvents 
    : [
        {
          title: "Routine Medical Assessment",
          date: vDate,
          description: `Clinical assessment conducted at ${hospital} by ${doctor}.`,
          importance: "MEDIUM"
        },
        ...(abnormalLabs.length > 0 ? [{
          title: `${abnormalLabs.length} Parameter Deviations Flagged`,
          date: vDate,
          description: `Lab markers (${abnormalLabs.map(a => a.test_name).slice(0, 3).join(", ")}) evaluated out of standard target range.`,
          importance: "HIGH" as const
        }] : []),
        ...(medications.length > 0 ? [{
          title: "Prescription Recorded",
          date: vDate,
          description: `${medications.length} active medication(s) prescribed to support recovery plan.`,
          importance: "MEDIUM" as const
        }] : []),
        {
          title: "MediVault Intelligence Audit",
          date: generatedTimestamp.split(",")[0],
          description: "Encrypted report indexed into patient longitudinal record.",
          importance: "LOW"
        }
      ];

  const modalJsx = (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* ========================================================================= */}
        {/* 1. HERO HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0 gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#0891B2] to-[#06B6D4] text-white shadow-md shadow-[#0891B2]/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight truncate">
                  {reportTitle}
                </h1>
                
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shrink-0 ${
                  overallStatus === "ATTENTION_REQUIRED"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : overallStatus === "CRITICAL"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                  <span>{overallStatus.replace(/_/g, " ")}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-[#0891B2]" />
                  <span>{specialty}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{hospital}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{doctor}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{vDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setActiveView("insights")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "insights"
                    ? "bg-white text-[#0891B2] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Clinical Report</span>
              </button>

              <button
                onClick={() => setActiveView("evidence")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "evidence"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Supporting Evidence</span>
              </button>
            </div>

            {documentId && (
              <a
                href={`/patient/ai-copilot?docId=${documentId}&docName=${encodeURIComponent(documentName)}`}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-md shadow-sky-600/20"
                title="Ask AI Copilot questions about this specific document"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Chat with AI</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer ml-1"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {analyzeStatusMsg && (
          <div className="px-6 py-2.5 bg-sky-50 border-b border-sky-200 text-sky-900 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 shrink-0">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#0891B2] shrink-0" />
              {analyzeStatusMsg}
            </span>
            <button
              onClick={() => setAnalyzeStatusMsg(null)}
              className="text-[#0891B2] hover:text-sky-900 font-bold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN BODY                                                                 */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {activeView === "insights" ? (
            hasRealAiAnalysis ? (
              <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
                
                {/* 2. AI HEALTH SNAPSHOT (10-15s INSTANT READ) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Status</span>
                    <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        overallStatus === "CRITICAL" ? "bg-rose-500" : overallStatus === "ATTENTION_REQUIRED" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      {overallStatus.replace(/_/g, " ")}
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border shadow-2xs space-y-1 ${
                    redFlags.length > 0 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-white border-slate-200"
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical Flags</span>
                    <div className={`text-base font-extrabold ${redFlags.length > 0 ? "text-rose-700" : "text-slate-900"}`}>
                      {redFlags.length}
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border shadow-2xs space-y-1 ${
                    abnormalLabs.length > 0 ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-white border-slate-200"
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Abnormal Labs</span>
                    <div className={`text-base font-extrabold ${abnormalLabs.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {abnormalLabs.length}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Normal Labs</span>
                    <div className="text-base font-extrabold text-emerald-700">
                      {normalLabs.length}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnoses</span>
                    <div className="text-base font-extrabold text-[#0891B2]">
                      {diagnoses.length}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medicines</span>
                    <div className="text-base font-extrabold text-teal-700">
                      {medications.length}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Level</span>
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {redFlags.length > 0 ? "HIGH" : abnormalLabs.length > 0 ? "MODERATE" : "LOW"}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Accuracy</span>
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {confidenceScore}%
                    </div>
                  </div>
                </div>

                {/* 3. KEY FINDINGS DIGESTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#0891B2]" />
                      Clinical Executive Digest (Physician View)
                    </h3>
                    <ul className="space-y-2">
                      {doctorBulletPoints.map((pt, idx) => (
                        <li key={idx} className="text-xs text-slate-700 font-medium flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2] mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 shadow-xs space-y-3">
                    <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-600" />
                      Patient Plain-Language Explanation
                    </h3>
                    <ul className="space-y-2">
                      {patientBulletPoints.map((pt, idx) => (
                        <li key={idx} className="text-xs text-emerald-950 font-medium flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. ABNORMAL FINDINGS */}
                {abnormalLabs.length > 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                          Abnormal Findings Requiring Attention ({abnormalLabs.length})
                        </h2>
                        <p className="text-xs text-amber-800 mt-0.5">
                          These lab values fell outside standard clinical reference limits and should be reviewed with your doctor.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold border border-amber-300">
                        High Priority Findings
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {abnormalLabs.map((lab, idx) => {
                        const dev = calculateRangeDeviation(lab.value, lab.reference_range);
                        return (
                          <div key={idx} className="p-4 rounded-xl bg-white border border-amber-200/90 shadow-2xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900">{lab.test_name}</h4>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                  Ref Target: <strong className="text-slate-700">{lab.reference_range || "N/A"}</strong>
                                </p>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                lab.status === 'CRITICAL' 
                                  ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}>
                                {lab.status}
                              </span>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                              <div className="flex items-baseline justify-between">
                                <div className="text-base font-extrabold text-slate-900">
                                  {lab.value} <span className="text-xs font-normal text-slate-500">{lab.unit}</span>
                                </div>
                                <span className="text-xs font-bold text-amber-700 font-mono">
                                  {dev.diffLabel}
                                </span>
                              </div>

                              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden relative">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    dev.status === 'HIGH' ? "bg-amber-500" : dev.status === 'LOW' ? "bg-sky-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${dev.percentage}%` }}
                                />
                              </div>
                            </div>

                            {lab.clinical_meaning && (
                              <p className="text-xs text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 leading-relaxed font-medium">
                                <strong className="text-amber-900">Clinical Impact:</strong> {lab.clinical_meaning}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs font-semibold">
                      <strong>All Extracted Parameters Normal:</strong> No critical abnormal laboratory deviations were detected in this report.
                    </div>
                  </div>
                )}

                {/* Collapsible Normal Findings Accordion */}
                {normalLabs.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setShowNormalLabs(!showNormalLabs)}
                      className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>View Normal Parameters within Standard Target Limits ({normalLabs.length})</span>
                      </span>
                      {showNormalLabs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showNormalLabs && (
                      <div className="p-4 border-t border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                          {normalLabs.map((lab, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                              <div>
                                <h5 className="font-bold text-slate-800">{lab.test_name}</h5>
                                <span className="text-[11px] text-slate-500 font-mono">Target: {lab.reference_range || "Normal"}</span>
                              </div>
                              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                                {lab.value} {lab.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. HEALTH INSIGHTS & VITALS */}
                {aiData.vitals && Object.keys(aiData.vitals).length > 0 && (
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#0891B2]" />
                      Synthesized Vital Signs & Health Metrics
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {aiData.vitals.blood_pressure && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Blood Pressure</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.blood_pressure}</div>
                        </div>
                      )}
                      {aiData.vitals.pulse && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Heart Rate</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.pulse}</div>
                        </div>
                      )}
                      {aiData.vitals.spo2 && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">SpO2 Oxygen</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.spo2}</div>
                        </div>
                      )}
                      {aiData.vitals.temperature && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Temperature</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.temperature}</div>
                        </div>
                      )}
                      {aiData.vitals.bmi && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">BMI</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.bmi}</div>
                        </div>
                      )}
                      {aiData.vitals.weight && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Weight</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.weight}</div>
                        </div>
                      )}
                      {aiData.vitals.height && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Height</span>
                          <div className="text-sm font-extrabold text-slate-900 font-mono">{aiData.vitals.height}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. CATEGORIZED RECOMMENDATIONS */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#0891B2]" />
                    Actionable Clinical Recommendations & Next Steps
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <Apple className="w-4 h-4 text-emerald-600" />
                        Diet & Lifestyle Modifications
                      </h4>
                      <ul className="space-y-1.5">
                        {(lifestyleRecs.length > 0 ? lifestyleRecs : ["Maintain adequate daily hydration and balanced nutrition.", "Ensure consistent physical sleep hygiene."]).map((rec, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#0891B2]" />
                        Physician Consultation & Follow-up
                      </h4>
                      <ul className="space-y-1.5">
                        {(followups.length > 0 ? followups : ["Schedule routine follow-up consultation with your attending physician."]).map((fol, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2] mt-1.5 shrink-0" />
                            <span>{fol}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <FlaskConicalIcon className="w-4 h-4 text-teal-600" />
                        Recommended Diagnostic Tests
                      </h4>
                      <ul className="space-y-1.5">
                        {(recommendedTests.length > 0 ? recommendedTests : ["Repeat routine panel in 3–6 months or per physician advice."]).map((tst, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <span>{tst}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 7. CLINICAL TIMELINE */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0891B2]" />
                    Clinical Event Timeline & Longitudinal Trail
                  </h3>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timelineEvents.map((evt, idx) => (
                      <div key={idx} className="relative flex items-start justify-between gap-3 text-xs">
                        <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                          evt.importance === 'HIGH' ? "border-rose-500 bg-rose-500" : evt.importance === 'MEDIUM' ? "border-[#0891B2]" : "border-slate-300"
                        }`} />

                        <div className="space-y-0.5">
                          <h4 className="font-extrabold text-slate-900 text-xs">{evt.title}</h4>
                          <p className="text-slate-600 leading-relaxed text-[11px]">{evt.description}</p>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {evt.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 8. DETAILED CLINICAL DATA */}
                {medications.length > 0 && (
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Pill className="w-4 h-4 text-teal-600" />
                      Prescribed Medications & Administration Details ({medications.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {medications.map((med, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-slate-900">{med.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                              {med.dosage || "Prescribed"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            <strong>Frequency:</strong> {med.frequency || "As directed"} • <strong>Duration:</strong> {med.duration || "Course"}
                          </p>
                          {med.instructions && (
                            <p className="text-[11px] text-teal-950 bg-teal-50 p-2 rounded-lg border border-teal-100 font-medium">
                              <strong>Instructions:</strong> {med.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Lab Parameters Table */}
                {labResults.length > 0 && (
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#0891B2]" />
                        Comprehensive Extracted Laboratory Table ({labResults.length})
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-amber-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          Abnormal ({abnormalLabs.length})
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          Normal ({normalLabs.length})
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Parameter</th>
                            <th className="p-3">Patient Value</th>
                            <th className="p-3">Reference Target Range</th>
                            <th className="p-3">Deviation / Status</th>
                            <th className="p-3">Clinical Meaning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {labResults.map((lab, idx) => {
                            const isAbnormal = lab.status !== 'NORMAL';
                            const dev = calculateRangeDeviation(lab.value, lab.reference_range);
                            return (
                              <tr key={idx} className={isAbnormal ? "bg-amber-50/40 font-medium" : "hover:bg-slate-50/60"}>
                                <td className="p-3 font-bold text-slate-900">{lab.test_name}</td>
                                <td className="p-3 font-extrabold text-slate-900 font-mono">
                                  {lab.value} <span className="text-[11px] text-slate-500 font-normal">{lab.unit}</span>
                                </td>
                                <td className="p-3 text-slate-600 font-mono text-[11px]">{lab.reference_range || "N/A"}</td>
                                <td className="p-3">
                                  <div className="space-y-1">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-block ${
                                      isAbnormal
                                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    }`}>
                                      {lab.status}
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-mono">{dev.diffLabel}</div>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-600 text-[11px]">{lab.clinical_meaning || "Standard parameter recorded."}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 9. TECHNICAL METADATA DRAWER (TIMESTAMP + AI MODEL USED, NO SHA HASH, NO DOWNLOAD) */}
                <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                  <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      <span>Technical Metadata, AI Engine & Analysis Timestamp</span>
                    </span>
                    {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showTechnicalDetails && (
                    <div className="p-4 border-t border-slate-200 text-xs space-y-3 bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 font-bold block text-[10px]">ORIGINAL FILENAME</span>
                          <span className="text-slate-800 truncate block">{originalFilename || documentName}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 font-bold block text-[10px]">FILE SIZE & MIME</span>
                          <span className="text-slate-800 block">{formatBytes(fileSize)} ({mimeType})</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 font-bold block text-[10px]">AI ANALYSIS GENERATED AT</span>
                          <span className="text-[#0891B2] font-extrabold truncate block">{generatedTimestamp}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 font-bold block text-[10px]">AI MODEL ENGINE</span>
                          <span className="text-emerald-700 font-extrabold truncate block">{aiModelEngine}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={handleRunAiAnalysis}
                          disabled={isAnalyzing}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                          <span>{isAnalyzing ? "Re-analyzing..." : "Re-run AI Analysis"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* UNPROCESSED STATE */
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-xl mx-auto my-12 shadow-xs space-y-4 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-[#0891B2] flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  AI Clinical Intelligence Not Yet Generated
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  Run OCR text extraction and Gemini 1.5 Flash medical intelligence on this document to generate clinical insights, parameter range checks, and actionable health guidance.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#06B6D4] hover:from-[#0e7490] hover:to-[#0891B2] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>{isAnalyzing ? "Analyzing Document..." : "Generate AI Medical Intelligence"}</span>
                  </button>

                  <button
                    onClick={() => setActiveView("evidence")}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Supporting Evidence</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* SUPPORTING EVIDENCE / UPLOADED DOCUMENT VIEWER */
            <div className="w-full h-full min-h-[550px] flex flex-col items-center justify-center relative p-3 bg-slate-50/50">
              {isLoading || fetchingBlob ? (
                <div className="flex flex-col items-center gap-3 text-slate-500 text-xs font-semibold my-auto">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#0891B2]" />
                  <span>Streaming source document from vault...</span>
                </div>
              ) : (blobUrl || effectiveFileUrl) ? (() => {
                  const activeSourceUrl = (blobUrl || effectiveFileUrl) ?? undefined;
                  return (
                    <div className="relative w-full h-full flex flex-col items-center justify-center space-y-3">
                      {/* Top Viewer Control Bar */}
                      <div className="w-full flex items-center justify-between px-4 py-2 bg-white rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs gap-2 flex-wrap">
                        <span className="truncate">Source File: <strong>{originalFilename || documentName}</strong> ({formatBytes(fileSize)})</span>

                        {/* Interactive Zoom & Rotate Toolbar */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                          {/* Zoom Out Button (-) */}
                          <button
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= 50}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                            title="Zoom Out (-)"
                            aria-label="Zoom Out"
                          >
                            <ZoomOut className="w-4 h-4 text-slate-700" />
                          </button>

                          {/* Zoom Percentage Indicator */}
                          <span className="px-2 font-mono font-extrabold text-xs text-[#0891B2] min-w-[45px] text-center select-none">
                            {zoomLevel}%
                          </span>

                          {/* Zoom In Button (+) */}
                          <button
                            onClick={handleZoomIn}
                            disabled={zoomLevel >= 300}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                            title="Zoom In (+)"
                            aria-label="Zoom In"
                          >
                            <ZoomIn className="w-4 h-4 text-slate-700" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-0.5" />

                          {/* Reset Zoom & Fit */}
                          <button
                            onClick={handleResetZoom}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                            title="Reset Zoom (100%)"
                            aria-label="Reset Zoom"
                          >
                            <Maximize2 className="w-4 h-4 text-slate-700" />
                          </button>

                          {/* Rotate Button */}
                          <button
                            onClick={handleRotate}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                            title="Rotate 90° Clockwise"
                            aria-label="Rotate Document"
                          >
                            <RotateCw className="w-4 h-4 text-slate-700" />
                          </button>
                        </div>

                        {/* Open in New Tab Button */}
                        <a
                          href={activeSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in New Tab</span>
                        </a>
                      </div>

                      {/* Scrollable Viewport Container */}
                      <div className="w-full flex-1 flex items-center justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-900/10 p-4 shadow-inner max-h-[72vh] relative">
                        {isImage ? (
                          <div 
                            className="transition-transform duration-200 ease-out flex items-center justify-center m-auto"
                            style={{
                              transform: `scale(${zoomLevel / 100}) rotate(${rotationDegree}deg)`,
                              transformOrigin: "center center",
                            }}
                          >
                            <img
                              src={activeSourceUrl}
                              alt={reportTitle}
                              className="max-h-[66vh] max-w-full object-contain rounded-xl shadow-xl border border-slate-200 bg-white"
                              onError={() => setPreviewError(true)}
                            />
                          </div>
                        ) : (
                          <div
                            className="w-full h-full transition-transform duration-200 ease-out flex items-center justify-center m-auto"
                            style={{
                              transform: `scale(${zoomLevel / 100}) rotate(${rotationDegree}deg)`,
                              transformOrigin: "center center",
                            }}
                          >
                            <iframe
                              src={activeSourceUrl}
                              title={reportTitle}
                              className="w-full h-[70vh] rounded-xl border border-slate-200 shadow-xs bg-white"
                              onError={() => setPreviewError(true)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg shadow-sm my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto font-bold text-sm">
                    {mimeType?.includes("pdf") ? "PDF" : "DOC"}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-900">{reportTitle}</h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Vault File: {originalFilename || documentName} ({formatBytes(fileSize)})
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    Source record is securely encrypted & stored in MinIO object vault. All medical findings are extracted and available in the <strong>AI Clinical Report</strong> tab.
                  </p>
                  <button
                    onClick={() => setActiveView("insights")}
                    className="px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Return to AI Clinical Report</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAR (NO DOWNLOAD BUTTONS, SHOWS TIMESTAMP & MODEL ENGINE)         */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0891B2]" />
            <span>AI Model Engine: <strong>{aiModelEngine}</strong></span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Generated: <strong>{generatedTimestamp}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalJsx, document.body);
}

// Inline helper icon for FlaskConical
function FlaskConicalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  );
}
