"use client";

import React, { useState } from "react";
import { Activity, Calendar, ChevronDown, ChevronUp, Eye, FlaskConical, Pill } from "lucide-react";
import type { ConditionJourney, ConditionEvent } from "@/types/timeline";

interface ConditionJourneyProps {
  journey: ConditionJourney;
  onViewEvidence: (eventId: string, documentId: string | null) => void;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DIAGNOSIS: { label: "Diagnosed", color: "bg-rose-100 text-rose-700 border-rose-200" },
  CONSULTATION: { label: "Consultation", color: "bg-sky-100 text-sky-700 border-sky-200" },
  LAB_TEST: { label: "Lab Test", color: "bg-violet-100 text-violet-700 border-violet-200" },
  FOLLOW_UP: { label: "Follow-up", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  PRESCRIPTION: { label: "Prescription", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  IMAGING: { label: "Imaging", color: "bg-blue-100 text-blue-700 border-blue-200" },
  PROCEDURE: { label: "Procedure", color: "bg-orange-100 text-orange-700 border-orange-200" },
  HOSPITALIZATION: { label: "Hospitalized", color: "bg-red-100 text-red-700 border-red-200" },
};

function ConditionEventRow({
  event,
  onViewEvidence,
}: {
  event: ConditionEvent;
  onViewEvidence: (eventId: string, documentId: string | null) => void;
}) {
  const typeConfig = EVENT_TYPE_LABELS[event.event_type] || {
    label: event.event_type,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div
          className={`w-2.5 h-2.5 rounded-full border-2 ${
            event.is_milestone ? "bg-amber-400 border-amber-500" : "bg-[#0891B2] border-[#0891B2]/30"
          }`}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.color}`}
          >
            {typeConfig.label}
          </span>
          <time
            dateTime={event.event_date}
            className="text-[10px] font-mono text-slate-400"
          >
            {new Date(event.event_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
        </div>
        <p className="text-xs font-semibold text-slate-800 mt-1 leading-snug">{event.title}</p>
        {event.summary && (
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
            {event.summary}
          </p>
        )}
        {event.document_id && (
          <button
            onClick={() => onViewEvidence(event.event_id, event.document_id)}
            className="text-[11px] font-bold text-[#0891B2] hover:text-[#0e7490] mt-1.5 flex items-center gap-1 cursor-pointer"
            aria-label={`View evidence for ${event.title}`}
          >
            <Eye className="w-3 h-3" aria-hidden="true" />
            View Evidence
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConditionJourneyComponent({
  journey,
  onViewEvidence,
}: ConditionJourneyProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? journey.events : journey.events.slice(0, 3);
  const hasMore = journey.events.length > 3;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
            <Activity className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{journey.condition_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span
                className="text-[10px] font-semibold text-slate-500"
              >
                First seen: {formatDate(journey.first_seen)}
              </span>
              {journey.first_seen !== journey.last_seen && (
                <span className="text-[10px] text-slate-400">·</span>
              )}
              {journey.first_seen !== journey.last_seen && (
                <span className="text-[10px] font-semibold text-slate-500">
                  Last seen: {formatDate(journey.last_seen)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-900">{journey.events.length}</p>
            <p className="text-[10px] text-slate-400">events</p>
          </div>
        </div>

        {/* Related tags */}
        {(journey.related_lab_tests.length > 0 || journey.related_medications.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {journey.related_lab_tests.slice(0, 2).map((lab, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 flex items-center gap-1"
              >
                <FlaskConical className="w-2.5 h-2.5" aria-hidden="true" />
                {lab}
              </span>
            ))}
            {journey.related_medications.slice(0, 2).map((med, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1"
              >
                <Pill className="w-2.5 h-2.5" aria-hidden="true" />
                {med}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Events Timeline */}
      <div className="px-5 py-1">
        {visibleEvents.map((event) => (
          <ConditionEventRow
            key={event.event_id}
            event={event}
            onViewEvidence={onViewEvidence}
          />
        ))}
      </div>

      {/* Show More */}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-5 py-3 text-[11px] font-bold text-[#0891B2] hover:bg-sky-50/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-t border-slate-100"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              Show {journey.events.length - 3} more events
            </>
          )}
        </button>
      )}
    </div>
  );
}
