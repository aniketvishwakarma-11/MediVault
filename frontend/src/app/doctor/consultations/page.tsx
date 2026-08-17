"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  HeartPulse,
  Activity,
  ArrowRight,
  Pill,
  User,
} from "lucide-react";
import { mockDoctorPatients, mockDoctorConsultations } from "@/lib/doctorDemoData";

export default function DoctorConsultationsPage() {
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState("pat-1001");
  const [symptoms, setSymptoms] = useState("Cough, Mild Fever, Lethargy");
  const [bp, setBp] = useState("120/80");
  const [hr, setHr] = useState("74");
  const [temp, setTemp] = useState("98.4");
  const [spo2, setSpo2] = useState("99");
  const [observations, setObservations] = useState("Throat mildly erythematous. Chest clear bilaterally.");
  const [diagnosis, setDiagnosis] = useState("Acute Upper Respiratory Infection");
  const [treatmentPlan, setTreatmentPlan] = useState("Hydration, 5 days rest, symptomatic treatment.");
  const [advice, setAdvice] = useState("Return if fever exceeds 101°F.");
  const [followUpDate, setFollowUpDate] = useState("2026-08-20");

  const [created, setCreated] = useState(false);

  const handleCreateConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    setCreated(true);
  };

  const handleGeneratePrescription = () => {
    router.push(`/doctor/prescriptions?patientId=${selectedPatientId}&diagnosis=${encodeURIComponent(diagnosis)}`);
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#0891B2]" /> Structured Consultation Studio
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Record clinical encounters, vitals, observations, and structured diagnostic notes.
          </p>
        </div>
      </div>

      {created ? (
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-6 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-[#22C55E]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading font-bold text-xl text-[#0F172A]">Consultation Note Saved</h2>
            <p className="text-xs text-[#475569]">
              Encrypted clinical note stored in patient's health profile.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 text-[#0F172A]">
            <div><strong className="text-[#475569]">Diagnosis:</strong> <span className="font-bold text-[#0891B2]">{diagnosis}</span></div>
            <div><strong className="text-[#475569]">Treatment Plan:</strong> {treatmentPlan}</div>
            <div><strong className="text-[#475569]">Follow-up Date:</strong> {followUpDate}</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleGeneratePrescription}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Pill className="w-4 h-4 text-[#22D3EE]" />
              <span>Auto-Generate Digital Prescription</span>
            </button>

            <button
              onClick={() => setCreated(false)}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors min-h-[44px]"
            >
              New Consultation Note
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateConsultation} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
              <h2 className="font-heading font-bold text-base text-[#0F172A]">Clinical Note Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Select Patient</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  >
                    {mockDoctorPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.uhid})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Chief Complaints / Symptoms</label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Clinical Observations</label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0891B2] mb-1.5">Clinical Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200 text-[#0891B2] font-bold text-sm focus:border-[#0891B2] focus:outline-none min-h-[42px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Treatment Plan & Advice</label>
                <textarea
                  rows={3}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Col: Vitals Recorder */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
              <h2 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#0891B2]" /> Vital Signs Recorder
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Blood Pressure (mmHg)</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono font-bold focus:border-[#0891B2] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={hr}
                    onChange={(e) => setHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono font-bold focus:border-[#0891B2] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Temperature (°F)</label>
                  <input
                    type="text"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono font-bold focus:border-[#0891B2] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#475569] font-semibold mb-1">SpO2 Oxygen (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono font-bold focus:border-[#0891B2] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Save Consultation Record</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
