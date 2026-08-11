"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  QrCode,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PhoneCall,
  HeartPulse,
  Pill,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Activity,
} from "lucide-react";
import { mockDoctorPatients } from "@/lib/doctorDemoData";

export default function DoctorEmergencyTerminalPage() {
  const [emergencyCode, setEmergencyCode] = useState("MV-PAT-88401");
  const [justification, setJustification] = useState("Patient presented at ER room with acute disorientation and fever.");
  const [loading, setLoading] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [emergencySummary, setEmergencySummary] = useState<any>(null);

  const handleGrantEmergencyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setAccessGranted(true);
      setEmergencySummary({
        patientName: "Alex Morgan",
        uhid: "MV-PAT-88401",
        age: 36,
        gender: "Male",
        bloodGroup: "O+",
        allergies: ["Penicillin (Severe anaphylaxis)", "Peanuts"],
        chronicConditions: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
        currentMedications: [
          { name: "Metformin Hydrochloride", dosage: "500mg TID" },
          { name: "Lisinopril", dosage: "10mg OD" },
          { name: "Aspirin", dosage: "81mg OD" },
        ],
        emergencyContacts: [
          { name: "Sarah Morgan", relation: "Spouse", phone: "+1 (555) 987-6543" },
          { name: "Dr. Robert Vance", relation: "Primary Physician", phone: "+1 (555) 234-5678" },
        ],
        recentLabFlags: [
          { test: "Hemoglobin", value: "10.2 g/dL", status: "LOW Anemia" },
          { test: "Fasting Sugar", value: "108 mg/dL", status: "HIGH Glucose" },
        ],
        vitals: {
          bp: "132/84 mmHg",
          heartRate: "78 bpm",
          spO2: "98%",
          temp: "98.6 F",
        },
        grantedUntil: new Date(Date.now() + 4 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        auditLogHash: "0xa7f83b2d194c5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white shadow-xl shadow-rose-900/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            <span>EMERGENCY CLINICAL OVERRIDE</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight">
            Emergency Access Terminal
          </h1>
          <p className="text-rose-100 text-xs sm:text-sm leading-relaxed">
            Scan patient Emergency QR Code or input Health Token to immediately unlock life-saving medical data. Every override creates an immutable audit log.
          </p>
        </div>
      </div>

      {!accessGranted ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Scanner Simulation Box */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6 flex flex-col items-center justify-center text-center">
            <div className="w-48 h-48 rounded-2xl bg-rose-50/50 border-2 border-dashed border-rose-300 flex flex-col items-center justify-center relative group p-4">
              <QrCode className="w-24 h-24 text-rose-600 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] font-mono text-rose-700 font-bold mt-2 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 uppercase">
                CAMERA ACTIVE
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-base text-[#0F172A]">Scan Patient Emergency QR Card</h3>
              <p className="text-xs text-[#475569]">
                Position emergency QR badge, Apple Watch ID, or printed card in front of camera
              </p>
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="space-y-1 border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Manual Emergency Authorization
              </h3>
              <p className="text-xs text-[#475569]">Input Patient UHID code or emergency cryptographic token</p>
            </div>

            <form onSubmit={handleGrantEmergencyAccess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Patient Health ID or Emergency Token
                </label>
                <input
                  type="text"
                  value={emergencyCode}
                  onChange={(e) => setEmergencyCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono text-sm focus:border-rose-500 focus:bg-white focus:outline-none min-h-[42px]"
                  placeholder="MV-PAT-88401"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Clinical Emergency Justification (Required for Audit Log)
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-rose-500 focus:bg-white focus:outline-none"
                  placeholder="State medical reason..."
                  required
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>
                  Emergency access grants temporary 4-hour clinical view to allergies, blood group, medications, and chronic conditions. Patient and primary physician will be notified immediately.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading ? "Authenticating Doctor & Requesting Over-Ride..." : "Authorize Emergency Access"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Emergency Summary View */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              <span>
                <strong>EMERGENCY ACCESS GRANTED</strong> — Temporary clinical session active until{" "}
                <strong className="text-[#0F172A]">{emergencySummary.grantedUntil}</strong>
              </span>
            </div>
            <span className="text-[10px] font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-600">
              Audit Hash: {emergencySummary.auditLogHash.substring(0, 16)}...
            </span>
          </div>

          {/* Clinical Life-Saving Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Patient Vital Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center font-bold text-rose-600 text-xl border border-rose-200 shadow-xs">
                  {emergencySummary.bloodGroup}
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg text-[#0F172A]">{emergencySummary.patientName}</h2>
                  <p className="text-xs text-slate-500 font-mono">{emergencySummary.uhid}</p>
                  <p className="text-xs text-[#475569]">{emergencySummary.age} yrs • {emergencySummary.gender}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2 text-xs">
                <h3 className="font-bold text-rose-700 uppercase text-[10px] tracking-wider">Critical Allergies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {emergencySummary.allergies.map((allergy: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-200 font-bold text-[11px]">
                      ⚠️ {allergy}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                <h3 className="font-bold text-[#0891B2] uppercase text-[10px] tracking-wider">Chronic Conditions</h3>
                <ul className="list-disc list-inside text-[#0F172A] space-y-1 font-medium">
                  {emergencySummary.chronicConditions.map((cond: string, idx: number) => (
                    <li key={idx}>{cond}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Current Medicines & Vitals */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#0891B2]" /> Active Medications
              </h3>

              <div className="space-y-2">
                {emergencySummary.currentMedications.map((med: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between items-center">
                    <span className="font-bold text-[#0F172A]">{med.name}</span>
                    <span className="text-[#0891B2] font-mono font-bold">{med.dosage}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2 pt-2">
                <HeartPulse className="w-4 h-4 text-rose-600" /> Recent Vital Signs
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[#475569] block text-[10px] font-semibold">Blood Pressure</span>
                  <strong className="text-[#0F172A]">{emergencySummary.vitals.bp}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[#475569] block text-[10px] font-semibold">Heart Rate</span>
                  <strong className="text-[#065F46]">{emergencySummary.vitals.heartRate}</strong>
                </div>
              </div>
            </div>

            {/* Emergency Contacts & Actions */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#0891B2]" /> Emergency Contacts
              </h3>

              <div className="space-y-2">
                {emergencySummary.emergencyContacts.map((contact: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#0F172A]">
                      <span>{contact.name}</span>
                      <span className="text-[#0891B2]">{contact.relation}</span>
                    </div>
                    <p className="text-[#475569] font-mono">{contact.phone}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Link
                  href="/doctor/patients/pat-1001"
                  className="w-full py-3 px-4 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>Open Full Patient Record</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setAccessGranted(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors min-h-[38px]"
                >
                  Close Emergency Terminal Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
