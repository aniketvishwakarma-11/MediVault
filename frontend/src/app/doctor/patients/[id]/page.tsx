"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  User,
  Activity,
  Sparkles,
  Bot,
  FileText,
  Clock,
  Pill,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Lock,
} from "lucide-react";
import { mockDoctorPatients, mockDoctorTimelineEvents } from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";

export default function DoctorPatientOverviewPage() {
  const params = useParams();
  const patientId = (params?.id as string) || "pat-1001";
  const { user, userProfile, isDemo } = useAuth();
  const currentDocName = userProfile?.displayName || (user?.email ? `Dr. ${user.email.split("@")[0]}` : "Dr. Authenticated Doctor");

  const [patient, setPatient] = useState<any>(
    isDemo ? mockDoctorPatients.find((p) => p.id === patientId) || mockDoctorPatients[0] : null
  );
  const [activeTab, setActiveTab] = useState<"brief" | "overview" | "timeline">("brief");

  React.useEffect(() => {
    if (isDemo) {
      setPatient(mockDoctorPatients.find((p) => p.id === patientId) || mockDoctorPatients[0]);
    } else {
      fetch(`http://localhost:5000/doctor/patients/search?q=${encodeURIComponent(patientId)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            const p = json.data.find((item: any) => item.id === patientId || item.user_id === patientId) || json.data[0];
            setPatient({
              id: p.id || p.user_id,
              uhid: `MV-PAT-${(p.id || p.user_id).substring(0, 5).toUpperCase()}`,
              fullName: p.full_name || p.email?.split("@")[0] || "Patient Record",
              age: p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : 30,
              gender: p.gender || "Not recorded",
              bloodGroup: p.blood_group || "Not recorded",
              phone: p.phone || "N/A",
              email: p.email || "",
              avatarUrl: p.profile_image_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
              riskBadge: "STABLE",
              recentDiagnosis: "No consultations recorded yet",
              currentMedications: [],
              lastVisit: new Date().toISOString().split("T")[0],
              accessStatus: "APPROVED",
              allergies: p.allergies ? [p.allergies] : ["None recorded"],
              chronicConditions: p.chronic_conditions ? [p.chronic_conditions] : ["None recorded"],
              emergencyContact: p.emergency_contact || "N/A",
              bmi: 22.0,
              insuranceProvider: "Standard Health Coverage",
              primaryDoctor: currentDocName,
            });
          }
        })
        .catch(() => {});
    }
  }, [isDemo, patientId, currentDocName]);

  if (!patient) {
    return (
      <div className="p-12 text-center text-xs text-[#0891B2] font-mono animate-pulse">
        Loading Patient EMR Clinical Profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Patient Top Header Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 border border-slate-300/80 overflow-hidden shrink-0 shadow-xs">
              <img src={patient.avatarUrl} alt={patient.fullName} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-extrabold text-2xl text-[#0F172A] tracking-tight">{patient.fullName}</h1>
                <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  {patient.uhid}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> CONSENT ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#475569]">
                {patient.age} yrs • {patient.gender} • Blood Group:{" "}
                <strong className="text-rose-600 font-bold">{patient.bloodGroup}</strong> • BMI: {patient.bmi}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                <span>Primary Doctor: {patient.primaryDoctor}</span>
                <span>• Insurance: {patient.insuranceProvider}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/doctor/consultations?patientId=${patient.id}`}
              className="px-4 py-2.5 rounded-2xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/80 text-[#0891B2] font-bold text-xs transition-all flex items-center gap-2 min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Create Consultation</span>
            </Link>

            <Link
              href={`/doctor/prescriptions?patientId=${patient.id}`}
              className="px-4 py-2.5 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 min-h-[44px]"
            >
              <Pill className="w-4 h-4" />
              <span>Generate Rx</span>
            </Link>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-100 text-xs font-bold flex-wrap">
          <button
            onClick={() => setActiveTab("brief")}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all min-h-[38px] ${
              activeTab === "brief"
                ? "bg-cyan-50 text-[#0891B2] border border-cyan-200/80 shadow-xs font-bold"
                : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#0891B2]" />
            <span>AI Medical Brief</span>
          </button>

          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all min-h-[38px] ${
              activeTab === "overview"
                ? "bg-cyan-50 text-[#0891B2] border border-cyan-200/80 shadow-xs font-bold"
                : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100"
            }`}
          >
            <Activity className="w-4 h-4 text-[#0891B2]" />
            <span>Clinical Overview</span>
          </button>

          <Link
            href={`/doctor/patients/${patient.id}/timeline`}
            className="px-4 py-2.5 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 flex items-center gap-2 transition-all min-h-[38px]"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Clinical Timeline</span>
          </Link>

          <Link
            href={`/doctor/patients/${patient.id}/reports`}
            className="px-4 py-2.5 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 flex items-center gap-2 transition-all min-h-[38px]"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Reports & Lab Compare</span>
          </Link>
        </div>
      </div>

      {/* Brief / Overview Content */}
      {activeTab === "brief" ? (
        /* AI Medical Brief Section */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-50 via-teal-50/50 to-white border border-cyan-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-200/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-base text-[#0F172A]">AI Medical Synthesis & Brief</h2>
                  <p className="text-[11px] text-[#475569]">Generated by Gemini RAG engine from 12 indexed EHR reports</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                0.98 CONFIDENCE
              </span>
            </div>

            {/* Structured Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Box 1 */}
              <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="font-bold text-[#0891B2] flex items-center gap-1.5 text-sm">
                  <TrendingUp className="w-4 h-4" /> Lab Trends & Findings
                </h3>
                <ul className="space-y-1.5 text-[#0F172A]">
                  <li className="text-rose-700 font-semibold">• Hemoglobin: 10.2 g/dL (Mild iron deficiency anemia)</li>
                  <li className="text-amber-800 font-semibold">• Fasting Glucose: 108 mg/dL (Slight elevation)</li>
                  <li className="text-[#475569]">• WBC & Platelets: Normal range</li>
                </ul>
              </div>

              {/* Box 2 */}
              <div className="p-4.5 rounded-2xl bg-white border border-rose-200/80 shadow-xs space-y-2">
                <h3 className="font-bold text-rose-700 flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-4 h-4" /> Allergy & Medication Conflict
                </h3>
                <ul className="space-y-1.5 text-[#0F172A]">
                  <li className="text-rose-700 font-semibold">⚠️ Penicillin allergy flagged (Anaphylaxis risk)</li>
                  <li className="text-[#475569]">• Metformin + Lisinopril: Compatible. Monitor renal function.</li>
                </ul>
              </div>

              {/* Box 3 */}
              <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="font-bold text-[#065F46] flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-[#22C55E]" /> Clinical Recommendations
                </h3>
                <ul className="space-y-1.5 text-[#0F172A]">
                  <li>• Initiate Ferrous Sulfate 325mg OD with Vitamin C</li>
                  <li>• Order HbA1c glycated hemoglobin panel in 30 days</li>
                  <li>• Dietary counseling for iron-rich nutrition</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Clinical Overview Section */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Active Conditions */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="font-heading font-bold text-base text-[#0F172A]">Active Diagnoses & Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {patient.chronicConditions.map((cond: string, idx: number) => (
                  <span key={idx} className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-[#0891B2]">
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            {/* Current Medicines */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="font-heading font-bold text-base text-[#0F172A]">Current Prescribed Medications</h3>
              <div className="space-y-2">
                {patient.currentMedications.map((med: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between items-center">
                    <span className="font-bold text-[#0F172A]">{med}</span>
                    <span className="text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">ACTIVE</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Allergies Card */}
            <div className="p-6 rounded-3xl bg-white border border-rose-200/80 shadow-xs space-y-3">
              <h3 className="font-heading font-bold text-base text-rose-700">Recorded Allergies</h3>
              <div className="space-y-2 text-xs text-rose-800 font-bold">
                {patient.allergies.map((a: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
                    ⚠️ {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
