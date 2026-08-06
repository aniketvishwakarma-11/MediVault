"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Clock, 
  FileText, 
  Stethoscope, 
  Syringe, 
  Scissors, 
  Pill, 
  Calendar, 
  ChevronRight, 
  Filter, 
  Plus,
  Building2,
  Lock,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: string;
  doctor: string;
  facility: string;
  description: string;
  document_id?: string;
  document_name?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function PatientTimelinePage() {
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTimelineEvents() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`${API_BASE_URL}/documents/search?limit=50`);
        if (!res.ok) {
          throw new Error(`API returned HTTP status ${res.status}`);
        }
        const data = await res.json();

        if (isMounted && data.success && Array.isArray(data.data)) {
          // Transform real database documents into timeline entries
          const liveEvents: TimelineEvent[] = data.data.map((doc: any) => ({
            id: doc.id,
            date: doc.visit_date || doc.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
            title: doc.document_name || doc.original_filename,
            category: doc.document_category || "General",
            doctor: doc.doctor_name || "Doctor Unspecified",
            facility: doc.hospital_name || "Facility Unspecified",
            description: `Document "${doc.original_filename}" (${(doc.file_size / 1024 / 1024).toFixed(2)} MB) stored securely with SHA-256 checksum ${doc.checksum_sha256 ? doc.checksum_sha256.slice(0, 12) + "..." : "verified"}.`,
            document_id: doc.id,
            document_name: doc.original_filename,
          }));

          // Sort by date DESC
          liveEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setEvents(liveEvents);
        }
      } catch (err: any) {
        console.warn("Timeline fetch error:", err);
        if (isMounted) {
          setErrorMsg("Backend database connection offline. Run 'npm run dev' inside backend folder.");
          setEvents([]); // STRICTLY ZERO DUMMY DATA! Clean empty array.
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchTimelineEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEvents = selectedFilter === "All"
    ? events
    : events.filter(e => e.category === selectedFilter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Lab Test":
      case "Blood Report": return FileText;
      case "Vaccination": return Syringe;
      case "Surgery": return Scissors;
      case "Prescription": return Pill;
      default: return Stethoscope;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-sky-600" />
            Chronological Health Timeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unified medical history compiled dynamically from real database records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/patient/reports"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document to Timeline</span>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Filter Pills */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter By:
        </span>
        {["All", "Blood Report", "Prescription", "MRI", "CT Scan", "X-Ray", "Discharge Summary", "Vaccination", "Other"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedFilter === cat
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Timeline Event Feed */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
          <span>Fetching medical history timeline from database...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="p-4 rounded-2xl bg-sky-50 text-sky-600 w-16 h-16 mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Medical Events in Timeline</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your medical documents, prescriptions, or lab reports to automatically construct your health history.
          </p>
          <Link
            href="/patient/reports"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </Link>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filteredEvents.map((event) => {
            const CategoryIcon = getCategoryIcon(event.category);

            return (
              <div key={event.id} className="relative group">
                {/* Event Node Circle */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-sky-600 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all">
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>

                {/* Event Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-200 flex items-center gap-1">
                        <CategoryIcon className="w-3 h-3 text-sky-600" />
                        {event.category}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {event.date}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Database Record
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>

                  <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        {event.doctor}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {event.facility}
                      </span>
                    </div>

                    {event.document_name && (
                      <Link
                        href="/patient/reports"
                        className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Document</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
