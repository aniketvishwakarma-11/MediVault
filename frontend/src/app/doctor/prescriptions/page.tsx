"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Lock,
  ArrowRight,
} from "lucide-react";
import { mockDoctorPatients, mockDoctorPrescriptions } from "@/lib/doctorDemoData";

export default function DoctorPrescriptionsPage() {
  const [selectedPatientId, setSelectedPatientId] = useState("pat-1001");
  const [diagnosis, setDiagnosis] = useState("Type 2 Diabetes Mellitus & Iron Deficiency Anemia");
  const [medicines, setMedicines] = useState([
    {
      name: "Metformin Hydrochloride 500mg",
      dosage: "1 Tablet",
      frequency: "1-0-1 (Twice daily)",
      duration: "30 Days",
      instructions: "Take after principal meals with water.",
    },
    {
      name: "Ferrous Sulfate 325mg",
      dosage: "1 Tablet",
      frequency: "0-1-0 (Once daily)",
      duration: "30 Days",
      instructions: "Take with Vitamin C / Orange juice for optimal absorption.",
    },
  ]);
  const [recommendedTests, setRecommendedTests] = useState("Fasting Blood Sugar (FBS), HbA1c Panel");
  const [generatedRx, setGeneratedRx] = useState<any>(null);

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        name: "",
        dosage: "1 Tablet",
        frequency: "1-0-1",
        duration: "7 Days",
        instructions: "Take after food",
      },
    ]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    (updated[index] as any)[field] = value;
    setMedicines(updated);
  };

  const handleGeneratePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const rx = {
      id: `RX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      patientName: mockDoctorPatients.find((p) => p.id === selectedPatientId)?.fullName || "Alex Morgan",
      date: new Date().toISOString().split("T")[0],
      diagnosis,
      medicines,
      recommendedTests: recommendedTests.split(",").map((t) => t.trim()),
      digitalSignature: "SIG-DR-JENKINS-882410",
      blockchainTxHash: "0xa7f83b2d194c5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
      aiExplanation: "Metformin manages blood glucose levels. Ferrous Sulfate replenishes iron stores to improve hemoglobin levels.",
    };
    setGeneratedRx(rx);
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-[#0891B2]" /> Digital Prescription Generator & Notarizer
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Build electronic prescriptions, verify drug interactions, and cryptographically sign Rx hashes on-chain.
          </p>
        </div>
      </div>

      {generatedRx ? (
        /* Printable Prescription PDF Preview Modal View */
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl space-y-6 border border-slate-200/80">
            {/* Header Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-heading font-extrabold text-xl text-[#0891B2]">JENKINS MEDICAL ASSOCIATES</h2>
                <p className="text-xs text-slate-600">St. Jude Memorial Health Plaza, Suite 300, Boston MA</p>
                <p className="text-xs text-slate-500 font-mono">Tel: +1 (555) 345-6789 | Reg # MD-994820-US</p>
              </div>
              <div className="text-right">
                <span className="font-heading font-extrabold text-2xl text-[#0891B2]">Rx</span>
                <p className="text-xs text-slate-500 font-mono">ID: {generatedRx.id}</p>
                <p className="text-xs text-slate-500 font-mono">Date: {generatedRx.date}</p>
              </div>
            </div>

            {/* Patient Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between font-bold text-[#0F172A]">
              <span>Patient: {generatedRx.patientName}</span>
              <span>Diagnosis: {generatedRx.diagnosis}</span>
            </div>

            {/* Medicines List */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-[#0891B2] uppercase tracking-wider">Prescribed Medications</h3>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[#475569]">
                    <th className="py-2">Medicine Name</th>
                    <th className="py-2">Dosage</th>
                    <th className="py-2">Frequency</th>
                    <th className="py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedRx.medicines.map((m: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2.5 font-bold text-[#0F172A]">
                        {m.name}
                        {m.instructions && <span className="block text-[10px] text-[#475569] font-normal">{m.instructions}</span>}
                      </td>
                      <td className="py-2.5">{m.dosage}</td>
                      <td className="py-2.5 font-bold text-[#0891B2]">{m.frequency}</td>
                      <td className="py-2.5">{m.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Explanation Banner */}
            <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-[#0F172A] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#0891B2]">
                <Sparkles className="w-3.5 h-3.5" /> AI Patient Medication Explanation
              </div>
              <p className="text-[11px] leading-relaxed text-[#475569] font-medium">{generatedRx.aiExplanation}</p>
            </div>

            {/* Signature Footer */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">Blockchain Notarization Tx:</span>
                <span className="font-mono text-[#0891B2] text-[10px] font-bold">{generatedRx.blockchainTxHash}</span>
              </div>

              <div className="text-right space-y-1">
                <div className="font-serif italic text-base text-[#0F172A] font-bold">Dr. Sarah Jenkins, MD</div>
                <div className="text-[10px] text-[#065F46] font-bold flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> DIGITALLY SIGNED & VERIFIED
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setGeneratedRx(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[40px]"
            >
              Edit Prescription
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-2 min-h-[40px]"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      ) : (
        /* Prescription Builder Form */
        <form onSubmit={handleGeneratePrescription} className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-6 shadow-xs">
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
                <label className="block font-bold text-[#0F172A] mb-1.5">Primary Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  required
                />
              </div>
            </div>

            {/* Dynamic Medicine Rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-heading font-bold text-base text-[#0F172A]">Prescribed Drugs & Dosages</h3>
                <button
                  type="button"
                  onClick={addMedicine}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#0891B2] text-xs font-bold hover:bg-cyan-100 flex items-center gap-1 min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Drug
                </button>
              </div>

              {medicines.map((med, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[#475569] font-semibold mb-1">Drug Name & Strength</label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                        placeholder="e.g. Amoxicillin 500mg"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#475569] font-semibold mb-1">Frequency</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                        placeholder="1-0-1"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#475569] font-semibold mb-1">Duration</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                        placeholder="7 Days"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => updateMedicine(idx, "instructions", e.target.value)}
                      placeholder="Special instructions (e.g. Take after meals with water)"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A]"
                    />

                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicine(idx)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Recommended Lab / Diagnostic Tests (Comma separated)
              </label>
              <input
                type="text"
                value={recommendedTests}
                onChange={(e) => setRecommendedTests(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
              <span>Generate Signed Digital Rx & AI Explanation</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
