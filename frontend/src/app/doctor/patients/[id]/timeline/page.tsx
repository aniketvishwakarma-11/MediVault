"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  Eye,
  Stethoscope,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI } from "@/lib/consent-api";
import { TimelineAPI } from "@/lib/timeline-api";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DoctorPatientTimelinePage() {
  const params = useParams();
  const patientId = (params?.id as string) || "";
  const { user } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Document viewer modal
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | undefined>(undefined);
  const [viewerDocName, setViewerDocName] = useState<string>("Medical Document");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: sessionData } = await (await import("@/lib/supabase")).supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [patientRes, eventsData] = await Promise.all([
        fetch(`${API_BASE_URL}/doctor/patients/${patientId}`, { headers })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        TimelineAPI.getEvents("ALL", 1, 50, patientId),
      ]);

      if (patientRes?.data) {
        setPatient(patientRes.data);
      }

      if (eventsData?.events) {
        const formatted = eventsData.events.map((e) => ({
          id: e.id,
          patientId: patientId,
          date: e.event_date ? new Date(e.event_date).toLocaleDateString() : "Recent",
          type: e.event_type || "EVENT",
          title: e.title,
          summary: e.summary || "Clinical milestone documented.",
          hospital: e.facility_name || "Medical Care Facility",
          doctorName: e.doctor_name || "Attending Physician",
          details: e.summary || "Extracted longitudinal clinical parameter recorded.",
          severity: e.severity,
          structuredData: e.structured_data,
          documentId: e.document_id,
          documentName: e.document_name,
        }));
        setEvents(formatted);
        if (formatted.length > 0) setExpandedEventId(formatted[0].id);
      }
    } catch (err) {
      console.warn("Failed to load doctor patient timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvents = events.filter(
    (e) => filterType === "ALL" || e.type === filterType || (e.severity && e.severity === filterType)
  );

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-[#0891B2] animate-spin mx-auto" />
        <p className="text-xs text-[#475569] mt-3 font-mono animate-pulse">Loading clinical timeline...</p>
      </div>
    );
  }

  const patientName = patient?.fullName || "Patient";

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#475569] mb-1 font-medium">
            <Link href={`/doctor/patients/${patientId}`} className="hover:text-[#0891B2]">
              {patientName}
            </Link>{" "}
            / <span className="text-[#0F172A] font-bold">Clinical Timeline</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#0891B2]" /> Longitudinal Clinical Event Tree ({events.length})
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
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] focus:border-[#0891B2] focus:outline-none min-h-[38px] cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            <option value="DIAGNOSIS">Diagnoses</option>
            <option value="LAB_TEST">Lab Results</option>
            <option value="PRESCRIPTION">Prescriptions</option>
            <option value="CONSULTATION">Consultations</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length > 0 ? (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 my-6">
          {filteredEvents.map((event) => {
            const isExpanded = expandedEventId === event.id;

            return (
              <div key={event.id} className="relative group">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[31px] top-2 w-4 h-4 rounded-full ring-4 ring-white shadow-xs ${
                    event.severity === "CRITICAL"
                      ? "bg-[#0891B2]"
                      : event.severity === "MONITOR" || event.severity === "HIGH"
                      ? "bg-slate-400"
                      : "bg-[#0891B2]"
                  }`}
                />

                {/* Event Card */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all space-y-4 shadow-xs">
                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                    className="flex items-start justify-between cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            event.severity === "CRITICAL"
                              ? "bg-cyan-100 text-[#0891B2] border border-cyan-300"
                              : "bg-cyan-50 text-[#0891B2] border border-cyan-200"
                          }`}
                        >
                          {event.type}
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-medium">{event.date}</span>
                        <span className="text-xs text-[#475569] font-medium">• {event.hospital}</span>
                      </div>
                      <h3 className="font-heading font-bold text-base text-[#0F172A]">{event.title}</h3>
                      <p className="text-xs text-[#475569] font-medium">{event.summary}</p>
                    </div>

                    <button className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-[#0F172A] transition-colors cursor-pointer">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Detailed Breakdown */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-[#0F172A]">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="font-bold text-[#0891B2]">Clinical Summary & Parameters:</div>
                        <p className="leading-relaxed text-[#475569] font-medium">{event.details}</p>
                        {event.doctorName && (
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            <span>Physician / Facility: {event.doctorName}</span>
                          </div>
                        )}
                      </div>

                      {/* Structured Lab Data if present */}
                      {event.structuredData?.lab_results && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {event.structuredData.lab_results.map((l: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                              <span className="text-slate-700 font-medium">{l.test_name}</span>
                              <span className="font-bold text-[#0891B2] font-mono">
                                {l.value} {l.unit} ({l.status})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {event.documentId && (
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setViewerDocId(event.documentId);
                              setViewerDocName(event.documentName || event.title);
                              setIsViewerOpen(true);
                            }}
                            className="px-4 py-2 bg-[#0891B2] text-white rounded-xl text-xs font-bold hover:bg-[#0e7490] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect Linked Evidence Document
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">No Clinical Events Recorded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No clinical timeline events match the selected criteria for this patient.
          </p>
        </div>
      )}

      {/* Document Viewer Modal */}
      {isViewerOpen && viewerDocId && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          documentId={viewerDocId}
          documentName={viewerDocName}
        />
      )}
    </div>
  );
}
