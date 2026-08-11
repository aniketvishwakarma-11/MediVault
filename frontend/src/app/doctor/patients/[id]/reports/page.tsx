"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { mockDoctorPatients, mockDoctorReports, DoctorDemoReport } from "@/lib/doctorDemoData";

export default function DoctorReportsComparePage() {
  const params = useParams();
  const patientId = (params?.id as string) || "pat-1001";
  const patient = mockDoctorPatients.find((p) => p.id === patientId) || mockDoctorPatients[0];

  const [reports] = useState<DoctorDemoReport[]>(mockDoctorReports);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<DoctorDemoReport>(mockDoctorReports[0]);

  const filteredReports = reports.filter(
    (r) => selectedCategory === "ALL" || r.category === selectedCategory
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

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#475569] mb-1 font-medium">
            <Link href={`/doctor/patients/${patient.id}`} className="hover:text-[#0891B2]">
              {patient.fullName}
            </Link>{" "}
            / <span className="text-[#0F172A] font-bold">Reports & Lab Comparison</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#0891B2]" /> Medical Reports & Parameter Analytics
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Inspect extracted clinical entities, AI summaries, and compare historical lab values.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 min-h-[42px] ${
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
        {["ALL", "LABORATORY", "RADIOLOGY", "PRESCRIPTION", "DISCHARGE"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] ${
              selectedCategory === cat
                ? "bg-cyan-50 text-[#0891B2] border border-cyan-200 shadow-xs font-bold"
                : "bg-white border border-slate-200 text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {compareMode ? (
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
                    {report.entities.map((ent, idx) => (
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
              const isActive = activeReport.id === report.id;

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
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-6 shadow-xs">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-[#0F172A]">{activeReport.title}</h2>
                  <p className="text-xs text-[#475569] font-medium mt-0.5">
                    {activeReport.date} • Facility: {activeReport.hospital} • Doctor: {activeReport.doctorName}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                  98% AI CONFIDENCE
                </span>
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
                  {activeReport.entities.map((ent, idx) => (
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
        </div>
      )}
    </div>
  );
}
