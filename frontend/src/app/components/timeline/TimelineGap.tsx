"use client";

import React from "react";
import { Clock, AlertCircle } from "lucide-react";
import type { RecordGap } from "@/types/timeline";

interface TimelineGapProps {
  gap: RecordGap;
}

export default function TimelineGap({ gap }: TimelineGapProps) {
  const from = new Date(gap.from_date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const to = new Date(gap.to_date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      role="note"
      aria-label={`Record gap of ${gap.gap_days} days between ${from} and ${to}`}
      className="relative flex items-start gap-3 px-4 py-3 my-2 rounded-xl bg-slate-50 border border-slate-200 border-dashed"
    >
      <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-[11px] font-bold text-slate-600">No records in MediVault</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          <time dateTime={gap.from_date}>{from}</time>
          {" — "}
          <time dateTime={gap.to_date}>{to}</time>
          {" "}({gap.gap_days} days)
        </p>
        <p className="text-[10px] text-slate-400 mt-1.5">
          This gap indicates no documents were uploaded for this period. It does not necessarily mean no care occurred.
        </p>
      </div>
    </div>
  );
}
