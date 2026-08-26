"use client";

import React from "react";
import { CheckCircle2, Loader2, AlertTriangle, Clock, Sparkles, ClipboardCheck, FileCheck } from "lucide-react";

type JobStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "OCR_COMPLETE"
  | "EXTRACTION_COMPLETE"
  | "NEEDS_REVIEW"
  | "VERIFIED"
  | "FAILED";

interface PrescriptionOCRStatusProps {
  status: JobStatus;
  errorMessage?: string | null;
  imageQualityScore?: number | null;
  qualityIssues?: string[];
  processingTimeMs?: number | null;
}

const STEPS: Array<{ key: JobStatus[]; label: string; desc: string; icon: React.ElementType }> = [
  { key: ["UPLOADED", "PROCESSING", "OCR_COMPLETE", "EXTRACTION_COMPLETE", "NEEDS_REVIEW", "VERIFIED"], label: "Securely Uploaded", desc: "Image encrypted and stored in MediVault", icon: FileCheck },
  { key: ["PROCESSING", "OCR_COMPLETE", "EXTRACTION_COMPLETE", "NEEDS_REVIEW", "VERIFIED"], label: "OCR Analysis", desc: "chinmays18/medical-prescription-ocr running", icon: Sparkles },
  { key: ["OCR_COMPLETE", "EXTRACTION_COMPLETE", "NEEDS_REVIEW", "VERIFIED"], label: "Medicine Extraction", desc: "Parsing medicines, doses, and instructions", icon: ClipboardCheck },
  { key: ["NEEDS_REVIEW", "VERIFIED"], label: "Ready for Review", desc: "Verify extracted data before saving", icon: CheckCircle2 },
];

export default function PrescriptionOCRStatus({
  status,
  errorMessage,
  imageQualityScore,
  qualityIssues = [],
  processingTimeMs,
}: PrescriptionOCRStatusProps) {
  if (status === "FAILED") {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-red-800 text-sm">Analysis Failed</div>
              <div className="text-xs text-red-600">{errorMessage || "The prescription could not be analyzed."}</div>
            </div>
          </div>

          {qualityIssues.length > 0 && (
            <div className="text-xs text-red-700 space-y-1 pl-1">
              <div className="font-bold">Detected issues:</div>
              {qualityIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {issue.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-red-700 font-medium">
            Please try again with a clearer, better-lit photo of your prescription.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(status === "PROCESSING" || status === "OCR_COMPLETE" || status === "EXTRACTION_COMPLETE") && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-indigo-50 border border-cyan-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#0891B2]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="font-bold text-[#0F172A] text-sm">
                {status === "PROCESSING" ? "Running OCR Analysis..." :
                  status === "OCR_COMPLETE" ? "Extracting medicines..." :
                  "Matching drug catalog..."}
              </div>
              <div className="text-xs text-[#475569] mt-0.5">
                This typically takes 15-60 seconds. You can stay on this page.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {STEPS.map((step, idx) => {
          const isComplete = step.key.includes(status) && status !== "UPLOADED" && status !== "PROCESSING";
          const isActive = (status === "UPLOADED" && idx === 0) ||
            (status === "PROCESSING" && idx === 1) ||
            (status === "OCR_COMPLETE" && idx === 2) ||
            (status === "EXTRACTION_COMPLETE" && idx === 2);

          return (
            <div
              key={idx}
              className={`flex items-center gap-3.5 p-3 rounded-xl transition-all ${
                isComplete ? "bg-emerald-50 border border-emerald-200/60" :
                isActive ? "bg-cyan-50 border border-cyan-200/60 animate-pulse" :
                "bg-slate-50 border border-slate-200/60 opacity-50"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isComplete ? "bg-emerald-500 text-white" :
                isActive ? "bg-[#0891B2] text-white" :
                "bg-slate-200 text-slate-400"
              }`}>
                {isComplete ? <CheckCircle2 className="w-4 h-4" /> :
                  isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  React.createElement(step.icon, { className: "w-4 h-4" })}
              </div>
              <div>
                <div className={`text-xs font-bold ${isComplete ? "text-emerald-800" : isActive ? "text-[#0F172A]" : "text-slate-500"}`}>
                  {step.label}
                </div>
                <div className="text-[10px] text-[#64748B]">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {imageQualityScore !== null && imageQualityScore !== undefined && (
        <div className="flex items-center gap-2 text-xs text-[#475569]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Image quality score: <span className={`font-bold ${imageQualityScore > 0.7 ? "text-emerald-600" : imageQualityScore > 0.4 ? "text-amber-600" : "text-red-600"}`}>{Math.round(imageQualityScore * 100)}%</span></span>
          {processingTimeMs && <span className="ml-2">- Processed in {(processingTimeMs / 1000).toFixed(1)}s</span>}
        </div>
      )}
    </div>
  );
}