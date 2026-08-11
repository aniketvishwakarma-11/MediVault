"use client";

import React from "react";
import { Filter } from "lucide-react";
import type { TimelineFilter } from "@/types/timeline";

interface TimelineFiltersProps {
  activeFilter: TimelineFilter;
  onChange: (filter: TimelineFilter) => void;
}

const filters: { id: TimelineFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "CONSULTATION", label: "Consultations" },
  { id: "DIAGNOSIS", label: "Diagnoses" },
  { id: "LAB_TEST", label: "Labs" },
  { id: "IMAGING", label: "Imaging" },
  { id: "PRESCRIPTION", label: "Medications" },
  { id: "PROCEDURE", label: "Procedures" },
  { id: "HOSPITALIZATION", label: "Hospitalizations" },
  { id: "VACCINATION", label: "Vaccinations" },
];

export default function TimelineFilters({ activeFilter, onChange }: TimelineFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filter clinical events by type"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider flex items-center gap-1 shrink-0">
        <Filter className="w-3 h-3" aria-hidden="true" />
        Filter:
      </span>
      {filters.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={activeFilter === id}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            activeFilter === id
              ? "bg-[#0891B2] text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
