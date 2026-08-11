"use client";

import React from "react";
import {
  Stethoscope,
  FlaskConical,
  Image,
  Pill,
  Scissors,
  ShieldCheck,
  Hospital,
  Syringe,
  UserCheck,
  AlertTriangle,
  Activity,
  Calendar,
  Building2,
  Eye,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Star,
} from "lucide-react";
import type { ClinicalEvent, ClinicalEventType } from "@/types/timeline";

interface TimelineEventCardProps {
  event: ClinicalEvent;
  onViewEvidence: (event: ClinicalEvent) => void;
}

const EVENT_CONFIG: Record<
  ClinicalEventType,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    label: string;
    darkBg: string;
  }
> = {
  CONSULTATION: {
    icon: Stethoscope,
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    label: "Consultation",
    darkBg: "bg-sky-600",
  },
  DIAGNOSIS: {
    icon: Activity,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    label: "Diagnosis",
    darkBg: "bg-rose-600",
  },
  LAB_TEST: {
    icon: FlaskConical,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    label: "Lab Test",
    darkBg: "bg-violet-600",
  },
  IMAGING: {
    icon: Image,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "Imaging",
    darkBg: "bg-blue-600",
  },
  PRESCRIPTION: {
    icon: Pill,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Prescription",
    darkBg: "bg-emerald-600",
  },
  MEDICATION_CHANGE: {
    icon: Pill,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Medication Change",
    darkBg: "bg-amber-600",
  },
  PROCEDURE: {
    icon: Scissors,
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    label: "Procedure",
    darkBg: "bg-orange-600",
  },
  HOSPITALIZATION: {
    icon: Hospital,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Hospitalization",
    darkBg: "bg-red-600",
  },
  DISCHARGE: {
    icon: ShieldCheck,
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    label: "Discharge",
    darkBg: "bg-teal-600",
  },
  VACCINATION: {
    icon: Syringe,
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    label: "Vaccination",
    darkBg: "bg-cyan-600",
  },
  FOLLOW_UP: {
    icon: UserCheck,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    label: "Follow-up",
    darkBg: "bg-indigo-600",
  },
  SYMPTOM: {
    icon: AlertTriangle,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    label: "Symptom",
    darkBg: "bg-yellow-600",
  },
  OTHER: {
    icon: Activity,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    label: "Other",
    darkBg: "bg-slate-600",
  },
};

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "NORMAL") return null;
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        severity === "CRITICAL"
          ? "text-rose-700 bg-rose-50 border-rose-200"
          : "text-amber-700 bg-amber-50 border-amber-200"
      }`}
      aria-label={`Severity: ${severity}`}
    >
      {severity === "CRITICAL" ? "⚠ Critical" : "Monitor"}
    </span>
  );
}

function LabResultsPreview({ structured_data }: { structured_data: Record<string, any> }) {
  const labs: any[] = structured_data?.lab_results || [];
  if (labs.length === 0) return null;
  const abnormal = labs.filter((l) => l.status !== "NORMAL");
  const preview = abnormal.length > 0 ? abnormal.slice(0, 3) : labs.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {preview.map((lab, i) => (
        <span
          key={i}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
            lab.status === "CRITICAL"
              ? "text-rose-700 bg-rose-50 border-rose-200"
              : lab.status === "HIGH"
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : lab.status === "LOW"
              ? "text-sky-700 bg-sky-50 border-sky-200"
              : "text-slate-600 bg-slate-50 border-slate-200"
          }`}
        >
          {lab.test_name}: {lab.value}
          {lab.unit ? ` ${lab.unit}` : ""} · {lab.status}
        </span>
      ))}
      {labs.length > 3 && (
        <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1">
          +{labs.length - 3} more
        </span>
      )}
    </div>
  );
}

function MedsPreview({ structured_data }: { structured_data: Record<string, any> }) {
  const meds: any[] = structured_data?.medications || [];
  if (meds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {meds.slice(0, 3).map((med, i) => (
        <span
          key={i}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700"
        >
          {med.name}
          {med.dosage ? ` ${med.dosage}` : ""}
        </span>
      ))}
      {meds.length > 3 && (
        <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1">
          +{meds.length - 3} more
        </span>
      )}
    </div>
  );
}

export default function TimelineEventCard({ event, onViewEvidence }: TimelineEventCardProps) {
  const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.OTHER;
  const Icon = config.icon;
  const isMilestone = event.is_milestone;

  const formattedDate = (() => {
    try {
      return new Date(event.event_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return event.event_date;
    }
  })();

  return (
    <article
      aria-label={`${config.label}: ${event.title}`}
      className={`relative bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group cursor-default ${
        isMilestone
          ? "border-amber-300 shadow-amber-50 ring-1 ring-amber-200/50"
          : "border-slate-200/80"
      }`}
    >
      {/* Milestone indicator */}
      {isMilestone && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-sm"
          aria-label="Milestone event"
        >
          <Star className="w-3 h-3 text-white fill-white" aria-hidden="true" />
        </div>
      )}

      <div className="p-5 space-y-3">
        {/* Header Row */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.color} ${config.bg} ${config.border}`}
            >
              <Icon className="w-3 h-3" aria-hidden="true" />
              {config.label}
            </span>
            <SeverityBadge severity={event.severity} />
          </div>
          <time
            dateTime={event.event_date}
            className="text-xs font-mono font-semibold text-slate-500 flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {formattedDate}
          </time>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 leading-snug">{event.title}</h3>

        {/* Summary */}
        {event.summary && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{event.summary}</p>
        )}

        {/* Inline Clinical Data Preview */}
        {(event.event_type === "LAB_TEST") && (
          <LabResultsPreview structured_data={event.structured_data} />
        )}
        {(event.event_type === "PRESCRIPTION" || event.event_type === "MEDICATION_CHANGE") && (
          <MedsPreview structured_data={event.structured_data} />
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {event.doctor_name && (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {event.doctor_name}
              </span>
            )}
            {event.facility_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {event.facility_name}
              </span>
            )}
          </div>

          {event.document_id && (
            <button
              onClick={() => onViewEvidence(event)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer group-hover:shadow-md"
              aria-label={`View evidence for ${event.title}`}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              View Evidence
            </button>
          )}
        </div>

        {/* Integrity metadata — secondary, not prominent */}
        {event.checksum_sha256 && (
          <details className="text-[10px] text-slate-400">
            <summary className="cursor-pointer hover:text-slate-600 transition-colors">
              Document Integrity
            </summary>
            <p className="mt-1 font-mono break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
              SHA-256: {event.checksum_sha256}
            </p>
          </details>
        )}
      </div>
    </article>
  );
}
