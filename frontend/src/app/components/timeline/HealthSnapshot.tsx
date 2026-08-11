"use client";

import React from "react";
import {
  Activity,
  Pill,
  GitBranch,
  FileText,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import type { TimelineSummary, NotableChange, RecordGap } from "@/types/timeline";

interface HealthSnapshotProps {
  summary: TimelineSummary | null;
  notable_changes: NotableChange[];
  record_gaps: RecordGap[];
  isLoading: boolean;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm gap-1 min-w-0">
      <div className={`p-2 rounded-xl ${color} mb-1`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{value}</span>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm gap-1 animate-pulse">
      <div className="w-8 h-8 bg-slate-100 rounded-xl mb-1" />
      <div className="h-7 w-10 bg-slate-100 rounded" />
      <div className="h-3 w-16 bg-slate-100 rounded mt-1" />
    </div>
  );
}

function TrendBadge({ change, testName }: { change: NotableChange; testName: string }) {
  const isHigh = change.status === "HIGH";
  const isCritical = change.status === "CRITICAL";
  const isLow = change.status === "LOW";

  const color = isCritical
    ? "text-rose-700 bg-rose-50 border-rose-200"
    : isHigh
    ? "text-amber-700 bg-amber-50 border-amber-200"
    : isLow
    ? "text-sky-700 bg-sky-50 border-sky-200"
    : "text-slate-600 bg-slate-50 border-slate-200";

  const Icon = isHigh || isCritical ? TrendingUp : isLow ? TrendingDown : Minus;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{testName}</span>
      <span className="font-bold">{change.value}</span>
      <span className="font-normal opacity-70">{change.status}</span>
    </div>
  );
}

export default function HealthSnapshot({
  summary,
  notable_changes,
  record_gaps,
  isLoading,
}: HealthSnapshotProps) {
  const lastActivity = summary?.last_activity_date
    ? (() => {
        const days = Math.floor(
          (Date.now() - new Date(summary.last_activity_date).getTime()) / 86400000
        );
        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        return `${days} days ago`;
      })()
    : null;

  return (
    <div
      role="region"
      aria-label="Health Snapshot"
      className="bg-gradient-to-br from-[#F0FDFA] via-white to-[#E0F2FE] border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0891B2]" aria-hidden="true" />
            Health Snapshot
          </h2>
          {lastActivity && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              Last activity: {lastActivity}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={Activity}
              label="Conditions"
              value={summary?.active_conditions ?? 0}
              color="text-rose-600 bg-rose-50"
            />
            <StatCard
              icon={Pill}
              label="Medications"
              value={summary?.active_medications ?? 0}
              color="text-violet-600 bg-violet-50"
            />
            <StatCard
              icon={GitBranch}
              label="Episodes"
              value={summary?.total_episodes ?? 0}
              color="text-emerald-600 bg-emerald-50"
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value={summary?.total_documents ?? 0}
              color="text-[#0891B2] bg-sky-50"
            />
          </>
        )}
      </div>

      {/* Notable Changes */}
      {!isLoading && notable_changes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Notable Findings
          </p>
          <div className="flex flex-wrap gap-2">
            {notable_changes.slice(0, 5).map((change, i) => (
              <TrendBadge key={i} change={change} testName={change.test_name} />
            ))}
          </div>
        </div>
      )}

      {/* Record Gaps */}
      {!isLoading && record_gaps.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-amber-800">
            <span className="font-bold">Record gap detected:</span> No MediVault records between{" "}
            {new Date(record_gaps[0].from_date).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}{" "}
            and{" "}
            {new Date(record_gaps[0].to_date).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}{" "}
            ({record_gaps[0].gap_days} days). This does not necessarily mean no care occurred during this period.
          </p>
        </div>
      )}
    </div>
  );
}
