"use client";

import React, { useState } from "react";
import { Pill, Calendar, ChevronDown, ChevronUp, Clock, RefreshCw } from "lucide-react";
import type { MedicationHistory } from "@/types/timeline";

interface MedicationJourneyProps {
  medication: MedicationHistory;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  last_recorded: { label: "Last Recorded", color: "text-amber-700 bg-amber-50 border-amber-200" },
  discontinued: { label: "Discontinued", color: "text-slate-600 bg-slate-50 border-slate-200" },
};

export default function MedicationJourney({ medication }: MedicationJourneyProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[medication.current_status] || STATUS_CONFIG.last_recorded;
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const sortedDoses = medication.dose_timeline.slice().sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        aria-expanded={expanded}
        aria-controls={`med-${medication.normalized_name}`}
      >
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
          <Pill className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{medication.medication_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" aria-hidden="true" />
              First: {formatDate(medication.first_recorded)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {medication.dose_changes > 0 && (
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-slate-400" aria-hidden="true" />
                {medication.dose_changes}
              </p>
              <p className="text-[10px] text-slate-400">dose change{medication.dose_changes !== 1 ? "s" : ""}</p>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Dose Timeline */}
      {expanded && (
        <div id={`med-${medication.normalized_name}`} className="px-5 pb-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">
            Dose History
          </p>
          <div className="space-y-3">
            {sortedDoses.map((point, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-emerald-200 mt-1" aria-hidden="true" />
                  {i < sortedDoses.length - 1 && (
                    <div className="w-0.5 h-6 bg-slate-100 mt-1" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <time
                    dateTime={point.event_date}
                    className="text-[10px] font-mono text-slate-400 flex items-center gap-1"
                  >
                    <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                    {formatDate(point.event_date)}
                  </time>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {point.dosage && (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                        {point.dosage}
                      </span>
                    )}
                    {point.frequency && (
                      <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        {point.frequency}
                      </span>
                    )}
                    {point.route && (
                      <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        {point.route}
                      </span>
                    )}
                  </div>
                  {point.purpose && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{point.purpose}</p>
                  )}
                  {point.doctor_name && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Prescribed by {point.doctor_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {medication.current_status === "last_recorded" && (
            <p className="text-[10px] text-amber-600 mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              "Last recorded" indicates this medication appeared in the most recent relevant document. Actual discontinuation cannot be inferred from absence of records alone.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
