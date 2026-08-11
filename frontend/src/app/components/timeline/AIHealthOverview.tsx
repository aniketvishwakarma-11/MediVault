"use client";

import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, AlertCircle, FileText } from "lucide-react";
import type { HealthInsights } from "@/types/timeline";

interface AIHealthOverviewProps {
  insights: HealthInsights | null;
  isLoading: boolean;
}

function SkeletonOverview() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-100 rounded w-3/4" />
      <div className="h-4 bg-slate-100 rounded w-full" />
      <div className="h-4 bg-slate-100 rounded w-5/6" />
      <div className="h-4 bg-slate-100 rounded w-2/3" />
    </div>
  );
}

export default function AIHealthOverview({ insights, isLoading }: AIHealthOverviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="region"
      aria-label="AI Health Overview"
      className="bg-white border border-[#0891B2]/20 rounded-3xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">AI Health Overview</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Based on your available records only</p>
          </div>
        </div>
        {!isLoading && insights && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              <FileText className="w-3 h-3 inline mr-1" aria-hidden="true" />
              {insights.evidence_count} records
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {isLoading ? (
          <SkeletonOverview />
        ) : insights ? (
          <>
            <p className="text-sm text-slate-700 leading-relaxed">
              {insights.overview}
            </p>

            {/* Disclaimer (collapsed by default) */}
            <div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-expanded={expanded}
                aria-controls="ai-disclaimer"
              >
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Important disclaimer</span>
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
              {expanded && (
                <p
                  id="ai-disclaimer"
                  className="mt-2 text-[11px] text-slate-500 leading-relaxed p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  {insights.disclaimer}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 leading-relaxed">
            Clinical insights will appear as more structured records become available. Upload and analyze your medical documents to build your health journey.
          </p>
        )}
      </div>
    </div>
  );
}
