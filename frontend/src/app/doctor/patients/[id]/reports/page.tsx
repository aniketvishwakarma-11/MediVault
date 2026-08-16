"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  Download,
  Building2,
  Calendar,
  User,
} from "lucide-react";
import { mockDoctorPatients, mockDoctorReports, DoctorDemoReport } from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI } from "@/lib/consent-api";
import { supabase } from "@/lib/supabase";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DoctorReportsComparePage() {
  const params = useParams();
  const patientId = (params?.id as string) || "pat-1001";
  const { user, isDemo } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<any>(null);

  // Document Viewer Modal
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    if (isDemo) {
      const demoPatient = mockDoctorPatients.find((p) => p.id === patientId) || mockDoctorPatients[0];
      setPatient(demoPatient);
      setReports(mockDoctorReports);
      setActiveReport(mockDoctorReports[0]);
      setLoading(false);
      return;
    }

    try {
      const [consentRes, profileRes] = await Promise.all([
        ConsentAPI.getConsentStatus(patientId),
        ConsentAPI.getPatientProfile(patientId),
      ]);

      if (profileRes.data) {
        setPatient(profileRes.data);
      }

      if (consentRes.data?.hasAccess) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const docRes = await fetch(
          `${API_BASE_URL}/documents/search?patient_id=${encodeURIComponent(patientId)}&limit=50`,
          { headers }
        );

        if (docRes.ok) {
          const docJson = await docRes.json();
          const docs = docJson.data || [];
          // Map to report structure
          const formattedReports = docs.map((d: any) => {
            const ai = d.ai_analysis || {};
            const labs = ai.lab_results || [];
            const entities = labs.map((l: any) => ({
              key: l.test_name,
              value: `${l.value} ${l.unit || ""}`.trim(),
              status: l.status || "NORMAL",
            }));
            const isAbnormal = labs.some((l: any) => l.status !== "NORMAL");

            return {
              id: d.id,
              title: d.document_name || "Medical Document",
              category: (d.document_category || "GENERAL").toUpperCase(),
              date: d.created_at ? new Date(d.created_at).toLocaleDateString() : "Recent",
              hospital: ai.hospital?.name || "Verified Laboratory",
              doctorName: ai.doctor?.name || "Attending Physician",
              aiSummary: ai.document?.summary || ai.plain_language_explanation || "Clinical report processed and verified.",
              isAbnormal,
              entities: entities.length > 0 ? entities : [{ key: "Document Type", value: d.document_category || "Report", status: "NORMAL" }],
              ocrText: ai.document?.summary || "Full clinical entities extracted and encrypted on MediVault.",
              rawDoc: d,
            };
          });

          setReports(formattedReports);
          if (formattedReports.length > 0) {
            setActiveReport(formattedReports[0]);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load doctor reports:", err);
    } finally {
      setLoading(false);
    }
  }, [isDemo, patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReports = reports.filter(
    (r) => selectedCategory === "ALL" || r.category === selectedCategory || r.category.includes(selectedCategory)
  );

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((i) => i !== id));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare([...selectedForCompare, id]);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-[#0891B2] animate-spin mx-auto" />
        <p className="text-xs text-[#475569] mt-3 font-mono animate-pulse">Loading medical reports...</p>
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
            / <span className="text-[#0F172A] font-bold">Reports & Lab Comparison</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#0891B2]" /> Medical Reports & Parameter Analytics ({reports.length})
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Inspect extracted clinical entities, AI summaries, and compare historical lab values.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 min-h-[42px] cursor-pointer ${
              compareMode
                ? "bg-[#0891B2] text-white shadow-xs"
                : "bg-white border border-slate-200 text-[#0891B2] hover:bg-cyan-50 shadow-xs"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{compareMode ? "Exit Side-by-Side Compare" : "Compare 2 Reports Side-by-Side"}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold">
        {["ALL", "BLOOD REPORT", "LABORATORY", "RADIOLOGY", "PRESCRIPTION", "DISCHARGE"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              selectedCategory === cat
                ? "bg-cyan-50 text-[#0891B2] border border-cyan-200 shadow-xs font-bold"
                : "bg-white border border-slate-200 text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">No Reports Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No medical documents or lab reports found for this patient under the selected category.
          </p>
        </div>
      ) : compareMode ? (
        /* Side-by-Side Comparison Matrix */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-[#0891B2] flex items-center justify-between font-bold">
            <span>Select 2 reports below to perform historical parameter comparison:</span>
            <span className="text-[#0F172A]">{selectedForCompare.length} / 2 Selected</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => {
              const isSelected = selectedForCompare.includes(report.id);

              return (
                <div
                  key={report.id}
                  onClick={() => toggleCompare(report.id)}
                  className={`p-6 rounded-3xl bg-white border cursor-pointer transition-all space-y-4 shadow-xs ${
                    isSelected ? "border-[#0891B2] ring-2 ring-[#0891B2]/20" : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                        {report.category}
                      </span>
                      <h3 className="font-heading font-bold text-base text-[#0F172A] mt-1.5">{report.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">{report.date} • {report.hospital}</p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-5 h-5 rounded accent-[#0891B2]"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] text-[#475569] font-bold">Extracted Entities:</span>
                    {report.entities.map((ent: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between">
                        <span className="text-[#0F172A] font-medium">{ent.key}</span>
                        <strong className={ent.status === "LOW" ? "text-rose-700" : ent.status === "HIGH" ? "text-amber-700" : "text-[#065F46]"}>
                          {ent.value} ({ent.status})
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Report Inspector Matrix */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Report List */}
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const isActive = activeReport?.id === report.id;

              return (
                <div
                  key={report.id}
                  onClick={() => setActiveReport(report)}
                  className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all space-y-2 shadow-xs ${
                    isActive ? "border-[#0891B2] ring-2 ring-[#0891B2]/20" : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                      {report.category}
                    </span>
                    {report.isAbnormal && (
                      <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
                        ABNORMAL
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-sm text-[#0F172A]">{report.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">{report.date} • {report.doctorName}</p>
                </div>
              );
            })}
          </div>

          {/* Right 2 Columns: Detailed Report Inspector */}
          {activeReport && (
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-6 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="font-heading font-bold text-lg text-[#0F172A]">{activeReport.title}</h2>
                    <p className="text-xs text-[#475569] font-medium mt-0.5">
                      {activeReport.date} • Facility: {activeReport.hospital} • Doctor: {activeReport.doctorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                      98% AI CONFIDENCE
                    </span>
                    <button
                      onClick={() => {
                        setViewerDoc(activeReport.rawDoc || activeReport);
                        setIsViewerOpen(true);
                      }}
                      className="px-3 py-1 bg-[#0891B2] text-white rounded-xl text-xs font-bold hover:bg-[#0e7490] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> Full Modal
                    </button>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-2">
                  <h3 className="font-bold text-[#0891B2] text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0891B2]" /> AI Document Interpretation
                  </h3>
                  <p className="text-xs text-[#0F172A] leading-relaxed font-medium">{activeReport.aiSummary}</p>
                </div>

                {/* Extracted Parameter Entities */}
                <div className="space-y-3">
                  <h3 className="font-heading font-bold text-sm text-[#0F172A]">Extracted Clinical Entity Values</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activeReport.entities.map((ent: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex justify-between items-center">
                        <span className="text-[#475569] font-medium">{ent.key}</span>
                        <span className={`font-bold ${ent.status === "LOW" ? "text-rose-700" : ent.status === "HIGH" ? "text-amber-700" : "text-[#065F46]"}`}>
                          {ent.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OCR Raw Text Preview */}
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-xs text-[#475569] uppercase tracking-wider">Raw OCR Text Stream</h3>
                  <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-[#0F172A] whitespace-pre-wrap leading-relaxed">
                    {activeReport.ocrText}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {isViewerOpen && viewerDoc && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          documentId={viewerDoc.id}
          documentName={viewerDoc.document_name || viewerDoc.title || "Medical Document"}
          documentCategory={viewerDoc.document_category || viewerDoc.category || "General"}
          mimeType={viewerDoc.mime_type || "application/pdf"}
          signedUrl={viewerDoc.signedDownloadUrl || null}
          aiAnalysis={viewerDoc.ai_analysis || null}
          visitDate={viewerDoc.created_at || viewerDoc.date}
          onDownload={() => {
            if (viewerDoc.signedDownloadUrl) window.open(viewerDoc.signedDownloadUrl, "_blank");
          }}
        />
      )}
    </div>
  );
}
