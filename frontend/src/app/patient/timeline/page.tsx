"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Plus,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  GitBranch,
  Pill,
  Activity,
  Stethoscope,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { DEMO_TIMELINE } from "@/lib/demoData";
import { TimelineAPI } from "@/lib/timeline-api";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";

import HealthSnapshot from "@/app/components/timeline/HealthSnapshot";
import AIHealthOverview from "@/app/components/timeline/AIHealthOverview";
import TimelineViewSwitcher from "@/app/components/timeline/TimelineViewSwitcher";
import TimelineFilters from "@/app/components/timeline/TimelineFilters";
import TimelineEventCard from "@/app/components/timeline/TimelineEventCard";
import ClinicalEpisodeCard from "@/app/components/timeline/ClinicalEpisodeCard";
import LabTrendCard from "@/app/components/timeline/LabTrendCard";
import ConditionJourneyComponent from "@/app/components/timeline/ConditionJourney";
import MedicationJourney from "@/app/components/timeline/MedicationJourney";
import TimelineGap from "@/app/components/timeline/TimelineGap";

import type {
  TimelineSummary,
  NotableChange,
  RecordGap,
  ClinicalEvent,
  ClinicalEpisode,
  LabTrend,
  MedicationHistory,
  ConditionJourney,
  HealthInsights,
  TimelineView,
  TimelineFilter,
} from "@/types/timeline";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Demo data shim ──────────────────────────────────────────────────────────
// When in demo mode, we map existing DEMO_TIMELINE entries to ClinicalEvent shape.
function mapDemoToClinicalEvents(demo: any[]): ClinicalEvent[] {
  return demo.map((d) => ({
    id: d.id,
    event_type: "CONSULTATION" as const,
    event_date: d.date,
    title: d.title,
    summary: d.description,
    severity: "NORMAL" as const,
    status: "UNKNOWN",
    doctor_name: d.doctor,
    facility_name: d.facility,
    department: null,
    is_milestone: false,
    structured_data: {},
    document_id: d.document_id || d.id,
    analysis_id: null,
    document_name: d.document_name || d.title,
    document_category: d.category || null,
    checksum_sha256: null,
    file_extension: null,
    mime_type: "application/pdf",
    created_at: d.date,
  }));
}

export default function PatientTimelinePage() {
  const { user, isDemo } = useAuth();

  // ── View State ─────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<TimelineView>("timeline");
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("ALL");

  // ── Summary ────────────────────────────────────────────────────
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [notableChanges, setNotableChanges] = useState<NotableChange[]>([]);
  const [recordGaps, setRecordGaps] = useState<RecordGap[]>([]);
  const [insights, setInsights] = useState<HealthInsights | null>(null);

  // ── Timeline Events ────────────────────────────────────────────
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  // ── Specialized Views ──────────────────────────────────────────
  const [episodes, setEpisodes] = useState<ClinicalEpisode[]>([]);
  const [labTrends, setLabTrends] = useState<LabTrend[]>([]);
  const [medications, setMedications] = useState<MedicationHistory[]>([]);
  const [conditions, setConditions] = useState<ConditionJourney[]>([]);

  // ── Loading States ─────────────────────────────────────────────
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Document Viewer Modal ──────────────────────────────────────
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | null>(null);
  const [viewerDocName, setViewerDocName] = useState<string | null>(null);
  const [viewerSignedUrl, setViewerSignedUrl] = useState<string | null>(null);
  const [viewerAiAnalysis, setViewerAiAnalysis] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDocCategory, setViewerDocCategory] = useState<string | null>(null);
  const [viewerMimeType, setViewerMimeType] = useState<string>("application/pdf");
  const [viewerVisitDate, setViewerVisitDate] = useState<string | null>(null);
  const [viewerDoctorName, setViewerDoctorName] = useState<string | null>(null);
  const [viewerHospitalName, setViewerHospitalName] = useState<string | null>(null);

  // ── Evidence Viewer ────────────────────────────────────────────
  const openEvidence = useCallback(async (event: ClinicalEvent) => {
    if (!event.document_id) return;
    setViewerDocId(event.document_id);
    setViewerDocName(event.document_name || event.title);
    setViewerDocCategory(event.document_category || event.event_type);
    setViewerMimeType(event.mime_type || "application/pdf");
    setViewerVisitDate(event.event_date);
    setViewerDoctorName(event.doctor_name);
    setViewerHospitalName(event.facility_name);
    setViewerSignedUrl(null);
    setViewerAiAnalysis(null);
    setViewerLoading(true);
    setViewerError(null);
    setIsViewerOpen(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${event.document_id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.data?.signedDownloadUrl) setViewerSignedUrl(data.data.signedDownloadUrl);
          if (data.data?.ai_analysis) setViewerAiAnalysis(data.data.ai_analysis);
        }
      }
    } catch (err: any) {
      setViewerError("Unable to load document preview.");
    } finally {
      setViewerLoading(false);
    }
  }, []);

  // ── Fetch Summary ──────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    if (isDemo) {
      setSummary({
        total_documents: DEMO_TIMELINE.length,
        total_clinical_events: DEMO_TIMELINE.length,
        total_episodes: 3,
        active_conditions: 2,
        active_medications: 4,
        last_activity_date: DEMO_TIMELINE[0]?.date || null,
        milestone_events: 2,
      });
      setLoadingSummary(false);
      setLoadingInsights(false);
      return;
    }

    setLoadingSummary(true);
    const data = await TimelineAPI.getSummary();
    if (data) {
      setSummary(data.summary);
      setNotableChanges(data.notable_changes || []);
      setRecordGaps(data.record_gaps || []);
    }
    setLoadingSummary(false);

    // Load insights separately (slower)
    const insightsData = await TimelineAPI.getInsights();
    if (insightsData) setInsights(insightsData);
    setLoadingInsights(false);
  }, [isDemo]);

  // ── Fetch Events ───────────────────────────────────────────────
  const fetchEvents = useCallback(async (filter: TimelineFilter, pg: number) => {
    setLoadingEvents(true);
    setErrorMsg(null);

    if (isDemo) {
      setEvents(mapDemoToClinicalEvents(DEMO_TIMELINE as any[]));
      setTotalPages(1);
      setTotalEvents(DEMO_TIMELINE.length);
      setLoadingEvents(false);
      return;
    }

    const data = await TimelineAPI.getEvents(filter, pg, 15);
    if (data) {
      setEvents(data.events);
      setTotalPages(data.totalPages);
      setTotalEvents(data.total);
    } else {
      setEvents([]);
      setErrorMsg("Unable to load timeline events.");
    }
    setLoadingEvents(false);
  }, [isDemo]);

  // ── Fetch Specialized View Data ────────────────────────────────
  const fetchViewData = useCallback(async (view: TimelineView) => {
    if (isDemo) return;
    setLoadingView(true);
    try {
      switch (view) {
        case "conditions": {
          const data = await TimelineAPI.getConditions();
          if (data) setConditions(data.conditions);
          break;
        }
        case "medications": {
          const data = await TimelineAPI.getMedications();
          if (data) setMedications(data.medications);
          break;
        }
        case "labs": {
          const data = await TimelineAPI.getLabTrends();
          if (data) setLabTrends(data.trends);
          break;
        }
        case "timeline": {
          const data = await TimelineAPI.getEpisodes();
          if (data) setEpisodes(data.episodes);
          break;
        }
      }
    } catch {
      // Non-critical — timeline still works without specialized data
    } finally {
      setLoadingView(false);
    }
  }, [isDemo]);

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeView === "timeline") {
      fetchEvents(activeFilter, page);
    }
  }, [activeView, activeFilter, page, fetchEvents]);

  useEffect(() => {
    fetchViewData(activeView);
  }, [activeView, fetchViewData]);

  const handleFilterChange = (filter: TimelineFilter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handleViewChange = (view: TimelineView) => {
    setActiveView(view);
    setPage(1);
  };

  // ── Empty State ────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-sm">
      <div className="p-4 rounded-2xl bg-sky-50 text-sky-600 w-16 h-16 mx-auto flex items-center justify-center">
        <Clock className="w-8 h-8" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">No Clinical Events Yet</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        Upload and analyze your medical documents to automatically build your longitudinal health timeline.
      </p>
      <Link
        href="/patient/reports"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0891B2] text-white text-xs font-bold shadow-sm hover:bg-[#0e7490] transition-all"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Upload Document
      </Link>
    </div>
  );

  // ── Loading Skeleton ───────────────────────────────────────────
  const EventSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 animate-pulse space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 bg-slate-100 rounded-full" />
            <div className="h-5 w-20 bg-slate-100 rounded-full ml-auto" />
          </div>
          <div className="h-5 w-3/5 bg-slate-100 rounded" />
          <div className="h-4 w-4/5 bg-slate-50 rounded" />
          <div className="h-4 w-2/3 bg-slate-50 rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-[#0891B2] to-teal-500 text-white shadow-sm">
              <Activity className="w-5 h-5" aria-hidden="true" />
            </span>
            Clinical Timeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Longitudinal health intelligence built from your verified medical records
          </p>
        </div>
        <Link
          href="/patient/reports"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0891B2] to-teal-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Upload Document
        </Link>
      </div>

      {/* ── Health Snapshot ─────────────────────────────────────── */}
      <HealthSnapshot
        summary={summary}
        notable_changes={notableChanges}
        record_gaps={recordGaps}
        isLoading={loadingSummary}
      />

      {/* ── AI Health Overview ──────────────────────────────────── */}
      <AIHealthOverview insights={insights} isLoading={loadingInsights} />

      {/* ── View Switcher + Filters ─────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 space-y-4">
        <TimelineViewSwitcher activeView={activeView} onChange={handleViewChange} />
        {activeView === "timeline" && (
          <TimelineFilters activeFilter={activeFilter} onChange={handleFilterChange} />
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          {errorMsg}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TIMELINE VIEW
      ═══════════════════════════════════════════════════════════ */}
      {activeView === "timeline" && (
        <section
          role="tabpanel"
          id="timeline-panel-timeline"
          aria-labelledby="timeline-tab-timeline"
          className="space-y-4"
        >
          {loadingEvents ? (
            <EventSkeleton />
          ) : events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Episode Summary Strip */}
              {episodes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
                    Clinical Episodes ({episodes.length})
                  </p>
                  <div className="space-y-2">
                    {episodes.slice(0, 3).map((ep) => (
                      <ClinicalEpisodeCard key={ep.id} episode={ep} />
                    ))}
                    {episodes.length > 3 && (
                      <button
                        onClick={() => handleViewChange("conditions")}
                        className="text-[11px] font-bold text-[#0891B2] hover:text-[#0e7490] flex items-center gap-1.5 px-2 cursor-pointer transition-colors"
                      >
                        View all {episodes.length} episodes →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Record Gaps interspersed */}
              {recordGaps.length > 0 && recordGaps[0].gap_days > 180 && (
                <TimelineGap gap={recordGaps[0]} />
              )}

              {/* Event Cards */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  {totalEvents} Clinical Event{totalEvents !== 1 ? "s" : ""}
                  {activeFilter !== "ALL" ? ` · ${activeFilter}` : ""}
                </p>
                {events.map((event) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    onViewEvidence={openEvidence}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CONDITIONS VIEW
      ═══════════════════════════════════════════════════════════ */}
      {activeView === "conditions" && (
        <section
          role="tabpanel"
          id="timeline-panel-conditions"
          aria-labelledby="timeline-tab-conditions"
          className="space-y-4"
        >
          {loadingView ? (
            <EventSkeleton />
          ) : conditions.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center shadow-sm">
              <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600">No conditions documented yet.</p>
              <p className="text-xs text-slate-400 mt-1">Upload diagnosis reports to see condition journeys here.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                {conditions.length} Condition Thread{conditions.length !== 1 ? "s" : ""}
              </p>
              {conditions.map((journey) => (
                <ConditionJourneyComponent
                  key={journey.normalized_name}
                  journey={journey}
                  onViewEvidence={(eventId, docId) => {
                    if (docId) {
                      const fakeEvent: ClinicalEvent = {
                        id: eventId,
                        event_type: "CONSULTATION",
                        event_date: "",
                        title: "",
                        summary: null,
                        severity: "NORMAL",
                        status: "UNKNOWN",
                        doctor_name: null,
                        facility_name: null,
                        department: null,
                        is_milestone: false,
                        structured_data: {},
                        document_id: docId,
                        analysis_id: null,
                        document_name: null,
                        document_category: null,
                        checksum_sha256: null,
                        file_extension: null,
                        mime_type: "application/pdf",
                        created_at: "",
                      };
                      openEvidence(fakeEvent);
                    }
                  }}
                />
              ))}
            </>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MEDICATIONS VIEW
      ═══════════════════════════════════════════════════════════ */}
      {activeView === "medications" && (
        <section
          role="tabpanel"
          id="timeline-panel-medications"
          aria-labelledby="timeline-tab-medications"
          className="space-y-4"
        >
          {loadingView ? (
            <EventSkeleton />
          ) : medications.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center shadow-sm">
              <Pill className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600">No medication history documented yet.</p>
              <p className="text-xs text-slate-400 mt-1">Upload prescriptions to see your medication timeline here.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Pill className="w-3.5 h-3.5" aria-hidden="true" />
                {medications.length} Medication{medications.length !== 1 ? "s" : ""} Tracked
              </p>
              {medications.map((med) => (
                <MedicationJourney key={med.normalized_name} medication={med} />
              ))}
            </>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LAB TRENDS VIEW
      ═══════════════════════════════════════════════════════════ */}
      {activeView === "labs" && (
        <section
          role="tabpanel"
          id="timeline-panel-labs"
          aria-labelledby="timeline-tab-labs"
          className="space-y-4"
        >
          {loadingView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse space-y-3 h-36" />
              ))}
            </div>
          ) : labTrends.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center shadow-sm">
              <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600">No lab trends available yet.</p>
              <p className="text-xs text-slate-400 mt-1">Upload lab reports to see longitudinal trends here.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                {labTrends.length} Lab Test{labTrends.length !== 1 ? "s" : ""} Tracked
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {labTrends.map((trend) => (
                  <LabTrendCard
                    key={trend.normalized_name}
                    trend={trend}
                    onViewEvidence={(eventId) => {
                      const fakeEvent: ClinicalEvent = {
                        id: eventId,
                        event_type: "LAB_TEST",
                        event_date: trend.current?.event_date || "",
                        title: trend.test_name,
                        summary: null,
                        severity: "NORMAL",
                        status: "UNKNOWN",
                        doctor_name: trend.current?.facility_name || null,
                        facility_name: trend.current?.facility_name || null,
                        department: null,
                        is_milestone: false,
                        structured_data: {},
                        document_id: trend.current?.document_id || null,
                        analysis_id: null,
                        document_name: null,
                        document_category: null,
                        checksum_sha256: null,
                        file_extension: null,
                        mime_type: "application/pdf",
                        created_at: "",
                      };
                      openEvidence(fakeEvent);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Document Viewer Modal ──────────────────────────────── */}
      {viewerDocId && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          documentId={viewerDocId}
          documentName={viewerDocName || "Medical Document"}
          originalFilename={viewerDocName || "Medical Document"}
          documentCategory={viewerDocCategory || "General"}
          mimeType={viewerMimeType}
          signedUrl={viewerSignedUrl}
          visitDate={viewerVisitDate || undefined}
          doctorName={viewerDoctorName || undefined}
          hospitalName={viewerHospitalName || undefined}
          aiAnalysis={viewerAiAnalysis}
          isLoading={viewerLoading}
          error={viewerError}
          onDownload={() => {
            if (viewerSignedUrl) window.open(viewerSignedUrl, "_blank");
          }}
        />
      )}

    </div>
  );
}
