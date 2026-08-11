"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock,
  FileText,
  FileSpreadsheet,
  Pill,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
} from "lucide-react";
import { mockDoctorPatients, mockDoctorTimelineEvents } from "@/lib/doctorDemoData";

export default function DoctorPatientTimelinePage() {
  const params = useParams();
  const patientId = (params?.id as string) || "pat-1001";
  const patient = mockDoctorPatients.find((p) => p.id === patientId) || mockDoctorPatients[0];

  const [expandedEventId, setExpandedEventId] = useState<string | null>("TL-102");
  const [filterType, setFilterType] = useState<string>("ALL");

  const events = mockDoctorTimelineEvents.filter(
    (e) => filterType === "ALL" || e.type === filterType
  );

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#475569] mb-1 font-medium">
            <Link href={`/doctor/patients/${patient.id}`} className="hover:text-[#0891B2]">
              {patient.fullName}
            </Link>{" "}
            / <span className="text-[#0F172A] font-bold">Clinical Timeline</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#0891B2]" /> Longitudinal Clinical Event Tree
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Chronological medical history with integrated lab values, clinical diagnosis, and prescription details.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <Filter className="w-3.5 h-3.5 text-[#0891B2]" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            <option value="ALL">All Event Types</option>
            <option value="CONSULTATION">Consultations</option>
            <option value="LAB_RESULT">Lab Results</option>
            <option value="PRESCRIPTION">Prescriptions</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 my-6">
        {events.map((event) => {
          const isExpanded = expandedEventId === event.id;

          return (
            <div key={event.id} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-2 w-4 h-4 rounded-full bg-[#0891B2] ring-4 ring-white shadow-xs" />

              {/* Event Card */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all space-y-4 shadow-xs">
                <div
                  onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                  className="flex items-start justify-between cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-[#0891B2] border border-cyan-200">
                        {event.type}
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-medium">{event.date}</span>
                      <span className="text-xs text-[#475569] font-medium">• {event.hospital}</span>
                    </div>
                    <h3 className="font-heading font-bold text-base text-[#0F172A]">{event.title}</h3>
                    <p className="text-xs text-[#475569] font-medium">{event.summary}</p>
                  </div>

                  <button className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-[#0F172A] transition-colors">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-[#0F172A]">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="font-bold text-[#0891B2]">Clinical Narrative & Action Plan:</div>
                      <p className="leading-relaxed text-[#475569] font-medium">{event.details}</p>
                      <div className="text-[11px] text-slate-500 font-medium">Attending Physician: {event.doctorName}</div>
                    </div>

                    {event.documents && event.documents.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[#475569] font-bold block text-[11px]">Attached Medical Records:</span>
                        {event.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#0891B2]" />
                              <span className="font-bold text-[#0F172A]">{doc.name}</span>
                            </div>
                            <button className="text-[#0891B2] hover:underline text-[11px] flex items-center gap-1 font-bold">
                              <Download className="w-3.5 h-3.5" /> Download
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
