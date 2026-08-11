"use client";

import React from "react";
import { TrendingDown, TrendingUp, Minus, FlaskConical, Eye, Calendar } from "lucide-react";
import type { LabTrend, TrendDirection } from "@/types/timeline";

interface LabTrendCardProps {
  trend: LabTrend;
  onViewEvidence?: (eventId: string) => void;
}

const TREND_CONFIG: Record<TrendDirection, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  IMPROVING: {
    label: "↓ Improving",
    icon: TrendingDown,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  WORSENING: {
    label: "↑ Worsening",
    icon: TrendingUp,
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
  },
  STABLE: {
    label: "→ Stable",
    icon: Minus,
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
  },
  CHANGE_DETECTED: {
    label: "Change detected",
    icon: FlaskConical,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  INSUFFICIENT_DATA: {
    label: "1 measurement",
    icon: FlaskConical,
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-200",
  },
};

function MiniSparkline({ measurements }: { measurements: Array<{ value_numeric: number | null }> }) {
  const values = measurements
    .map((m) => m.value_numeric)
    .filter((v): v is number => v !== null);

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 80;
  const H = 32;
  const pad = 4;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / range) * (H - 2 * pad);
    return `${x},${y}`;
  });

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#0891B2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {points.length > 0 && (() => {
        const lastPt = points[points.length - 1].split(",");
        return (
          <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill="#0891B2" />
        );
      })()}
    </svg>
  );
}

export default function LabTrendCard({ trend, onViewEvidence }: LabTrendCardProps) {
  const config = TREND_CONFIG[trend.trend] || TREND_CONFIG.INSUFFICIENT_DATA;
  const TrendIcon = config.icon;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

  const changeText = (() => {
    if (trend.absolute_change === null) return null;
    const sign = trend.absolute_change >= 0 ? "+" : "";
    const pct = trend.percentage_change !== null ? ` (${trend.percentage_change >= 0 ? "+" : ""}${trend.percentage_change}%)` : "";
    return `${sign}${trend.absolute_change}${trend.unit ? " " + trend.unit : ""}${pct}`;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
            <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{trend.test_name}</p>
            {trend.unit && (
              <p className="text-[10px] text-slate-400">{trend.unit}</p>
            )}
          </div>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${config.color} ${config.bg}`}
          aria-label={`Trend: ${config.label}`}
        >
          {config.label}
        </span>
      </div>

      {/* Current + Previous Values */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Current</p>
          <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">
            {trend.current?.value_raw ?? "—"}
            {trend.unit && <span className="text-xs font-normal text-slate-400 ml-1">{trend.unit}</span>}
          </p>
          {trend.current?.event_date && (
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" aria-hidden="true" />
              {formatDate(trend.current.event_date)}
            </p>
          )}
        </div>

        {trend.previous && (
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Previous</p>
            <p className="text-base font-bold text-slate-500 tabular-nums">
              {trend.previous.value_raw}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" aria-hidden="true" />
              {formatDate(trend.previous.event_date)}
            </p>
          </div>
        )}

        {/* Mini sparkline */}
        <div className="ml-auto">
          <MiniSparkline measurements={trend.measurements} />
        </div>
      </div>

      {/* Change */}
      {changeText && (
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`w-3.5 h-3.5 ${config.color}`} aria-hidden="true" />
          <span className={`text-xs font-semibold ${config.color}`}>{changeText}</span>
          <span className="text-[10px] text-slate-400">
            across {trend.measurements.length} measurements
          </span>
        </div>
      )}

      {/* Reference range */}
      {trend.reference_range && (
        <p className="text-[11px] text-slate-400">
          Reference: <span className="font-semibold text-slate-500">{trend.reference_range}</span>
        </p>
      )}

      {/* View Evidence */}
      {trend.current?.event_id && onViewEvidence && (
        <button
          onClick={() => onViewEvidence(trend.current!.event_id)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#0891B2] hover:text-[#0e7490] transition-colors cursor-pointer"
          aria-label={`View source documents for ${trend.test_name}`}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          View Evidence ({trend.measurements.length} report{trend.measurements.length !== 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}
