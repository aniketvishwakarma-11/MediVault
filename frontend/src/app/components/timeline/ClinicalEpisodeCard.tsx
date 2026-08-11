"use client";

import React, { useState } from "react";
import { GitBranch, ChevronDown, ChevronUp, Calendar, Activity } from "lucide-react";
import type { ClinicalEpisode } from "@/types/timeline";

interface ClinicalEpisodeCardProps {
  episode: ClinicalEpisode;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "text-emerald-700 bg-emerald-50 border-emerald-200",
  IMPROVING: "text-teal-700 bg-teal-50 border-teal-200",
  STABLE: "text-sky-700 bg-sky-50 border-sky-200",
  RESOLVED: "text-slate-600 bg-slate-50 border-slate-200",
  ONGOING: "text-amber-700 bg-amber-50 border-amber-200",
  UNKNOWN: "text-slate-500 bg-slate-50 border-slate-100",
};

const STATUS_ICON: Record<string, string> = {
  ACTIVE: "→ Active",
  IMPROVING: "↓ Improving",
  STABLE: "→ Stable",
  RESOLVED: "✓ Resolved",
  ONGOING: "→ Ongoing",
  UNKNOWN: "? Unknown",
};

export default function ClinicalEpisodeCard({ episode }: ClinicalEpisodeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[episode.status] || STATUS_STYLES.UNKNOWN;
  const statusText = STATUS_ICON[episode.status] || episode.status;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Episode Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        aria-expanded={expanded}
        aria-controls={`episode-${episode.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-indigo-600 shrink-0">
            <GitBranch className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{episode.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}
                aria-label={`Episode status: ${episode.status}`}
              >
                {statusText}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" aria-hidden="true" />
                {formatDate(episode.start_date)}
                {episode.end_date && episode.end_date !== episode.start_date
                  ? ` — ${formatDate(episode.end_date)}`
                  : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{episode.event_count}</p>
            <p className="text-[10px] text-slate-400">events</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expanded Episode Details */}
      {expanded && (
        <div id={`episode-${episode.id}`} className="px-5 pb-4 border-t border-slate-100">
          {episode.description && (
            <p className="text-xs text-slate-500 leading-relaxed pt-3 pb-2">
              {episode.description}
            </p>
          )}
          {episode.primary_condition && (
            <div className="flex items-center gap-2 mt-2">
              <Activity className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-600">
                Primary condition: {episode.primary_condition}
              </span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-3">
            {episode.event_count} clinical event{episode.event_count !== 1 ? "s" : ""} associated with this episode.
          </p>
        </div>
      )}
    </div>
  );
}
