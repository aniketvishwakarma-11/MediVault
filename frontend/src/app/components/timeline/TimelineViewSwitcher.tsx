"use client";

import React from "react";
import { Clock, Stethoscope, FlaskConical, Image, Pill, Scissors, ShieldCheck, User, Syringe } from "lucide-react";
import type { TimelineView } from "@/types/timeline";

interface TimelineViewSwitcherProps {
  activeView: TimelineView;
  onChange: (view: TimelineView) => void;
}

const views: { id: TimelineView; label: string; icon: React.ElementType }[] = [
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "conditions", label: "Conditions", icon: Stethoscope },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "labs", label: "Lab Trends", icon: FlaskConical },
];

export default function TimelineViewSwitcher({ activeView, onChange }: TimelineViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Timeline view switcher"
      className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto"
    >
      {views.map(({ id, label, icon: Icon }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            id={`timeline-tab-${id}`}
            aria-controls={`timeline-panel-${id}`}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none justify-center ${
              isActive
                ? "bg-white text-[#0891B2] shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
