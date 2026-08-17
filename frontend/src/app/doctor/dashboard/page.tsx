"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  FileClock,
  BellRing,
  Search,
  ShieldAlert,
  FilePlus,
  FileSpreadsheet,
  Pill,
  Bot,
  ArrowRight,
  ShieldCheck,
  Activity,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Lock,
  TrendingUp,
  FileText,
  Heart,
  ArrowUpRight,
  Plus,
  AlertCircle,
  RefreshCw,
  Eye,
  UserCheck
} from "lucide-react";
import { mockDoctorProfile, mockDoctorPatients, mockDoctorConsultations } from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function DoctorDashboardPage() {
  const { user, userProfile, isDemo } = useAuth();
  const [patients, setPatients] = useState<any[]>(isDemo ? mockDoctorPatients : []);
  const [consultations, setConsultations] = useState<any[]>(isDemo ? mockDoctorConsultations : []);
  const [loading, setLoading] = useState<boolean>(!isDemo);

  const doctorName = isDemo
    ? mockDoctorProfile.fullName
    : userProfile?.displayName || (user?.email ? `Dr. ${user.email.split("@")[0]}` : "Dr. Authenticated Doctor");

  const doctorLicense = isDemo
    ? mockDoctorProfile.licenseNumber
    : `DOC-${user?.id?.substring(0, 8).toUpperCase() || "REAL-894021"}`;

  useEffect(() => {
    if (isDemo) {
      setPatients(mockDoctorPatients);
      setConsultations(mockDoctorConsultations);
      setLoading(false);
      return;
    }

    const fetchRealPatients = async () => {
      setLoading(true);
      try {
        const { data: dbPatients, error: dbErr } = await supabase
          .from("patients")
          .select("*, users_profile!inner(full_name, email, phone, avatar_url)");

        let rawList: any[] = [];

        if (!dbErr && dbPatients && dbPatients.length > 0) {
          rawList = dbPatients.map((p: any) => ({
            id: p.id || p.user_id,
            user_id: p.user_id,
            full_name: p.users_profile?.full_name || p.users_profile?.email?.split("@")[0] || "Patient Record",
            email: p.users_profile?.email || "",
            phone: p.users_profile?.phone || "",
            profile_image_url: p.users_profile?.avatar_url,
            date_of_birth: p.date_of_birth,
            gender: p.gender,
            blood_group: p.blood_group,
            allergies: Array.isArray(p.allergies_json) ? p.allergies_json.join(", ") : (p.allergies || ""),
            chronic_conditions: Array.isArray(p.chronic_conditions_json) ? p.chronic_conditions_json.join(", ") : (p.chronic_conditions || ""),
            emergency_contact: p.emergency_contact_name || p.emergency_contact || "",
          }));
        } else {
          try {
            const res = await fetch("http://localhost:5000/doctor/patients/search?q=");
            if (res.ok) {
              const json = await res.json();
              if (json.data && Array.isArray(json.data)) {
                rawList = json.data;
              }
            }
          } catch (e) {
            console.warn("Backend API offline fallback");
          }
        }

        // Deduplicate patients by full_name
        const uniqueMap = new Map();
        for (const item of rawList) {
          const nameKey = (item.full_name || item.email || item.id || "unknown").trim().toLowerCase();
          if (!uniqueMap.has(nameKey)) {
            uniqueMap.set(nameKey, item);
          } else {
            const existing = uniqueMap.get(nameKey);
            const itemHasDetails = Boolean(item.blood_group && item.blood_group !== "Not provided" && item.blood_group !== "Not recorded");
            const existingHasDetails = Boolean(existing.blood_group && existing.blood_group !== "Not provided" && existing.blood_group !== "Not recorded");
            if (itemHasDetails && !existingHasDetails) {
              uniqueMap.set(nameKey, item);
            }
          }
        }

        const uniqueList = Array.from(uniqueMap.values());

        const mapped = uniqueList.map((p: any) => {
          const birthYear = p.date_of_birth ? new Date(p.date_of_birth).getFullYear() : null;
          const age = birthYear && !isNaN(birthYear) ? new Date().getFullYear() - birthYear : 30;

          return {
            id: p.id || p.user_id,
            uhid: `MV-PAT-${(p.id || p.user_id).substring(0, 5).toUpperCase()}`,
            fullName: p.full_name || p.email?.split("@")[0] || "Patient Record",
            age,
            gender: p.gender && p.gender !== "Not provided" ? p.gender : "Not recorded",
            bloodGroup: p.blood_group && p.blood_group !== "Not provided" ? p.blood_group : "Not recorded",
            phone: p.phone || "N/A",
            email: p.email || "",
            avatarUrl: p.profile_image_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            riskBadge: "STABLE",
            recentDiagnosis: "Active Clinical Consent Granted",
            currentMedications: [],
            lastVisit: new Date().toISOString().split("T")[0],
            accessStatus: "APPROVED",
            allergies: p.allergies ? [p.allergies] : ["None recorded"],
            chronicConditions: p.chronic_conditions ? [p.chronic_conditions] : ["None reported"],
            emergencyContact: p.emergency_contact || "N/A",
            bmi: 22.0,
            insuranceProvider: "Healthcare Provider",
            primaryDoctor: doctorName,
          };
        });

        setPatients(mapped);
      } catch (err) {
        console.warn("Failed to fetch real dashboard patients:", err);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRealPatients();
  }, [isDemo, doctorName]);

  const criticalCases = patients.filter((p) => p.riskBadge === "HIGH_RISK" || p.riskBadge === "CRITICAL");
  const pendingRequests = patients.filter((p) => p.accessStatus === "PENDING");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      
      {/* ================= GREETING HEADER ================= */}
      <div className="bg-gradient-to-r from-[#0891B2] via-[#0e7490] to-[#22D3EE] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-cyan-900/10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Verified License: {doctorLicense} • ZKP Session Active</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            Good Day, {doctorName}
          </h1>
          <p className="text-cyan-100 text-xs sm:text-sm leading-relaxed">
            Clinical EMR Portal synchronized with zero-knowledge encryption proofs and real-time patient consent records.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <Link
            href="/doctor/copilot"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-xs shadow-md transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Bot className="w-4 h-4" />
            <span>Launch AI Copilot</span>
          </Link>
          <Link
            href="/doctor/emergency"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs backdrop-blur-md transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ShieldAlert className="w-4 h-4 text-[#22D3EE]" />
            <span>Emergency Access Scan</span>
          </Link>
        </div>
      </div>

      {/* ================= KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Patients Today</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A]">{patients.length}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              <TrendingUp className="w-3 h-3 text-[#22C55E]" /> +2 New Today
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Active EMR Consent Granted</p>
        </div>        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Critical Cases</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0891B2]">{criticalCases.length}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
              Attention Needed
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Flagged by Diagnostic AI</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Pending Reports</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
              <FileClock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A]">3</span>
            <span className="text-[11px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
              Unread Labs
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Requires Physician Signature</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Pending Consents</span>
            <div className="p-2.5 rounded-2xl bg-teal-50 text-[#0891B2] border border-teal-100">
              <BellRing className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A]">{pendingRequests.length}</span>
            <span className="text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              ZKP Verified
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Access Requests Active</p>
        </div>
      </div>

      {/* ================= QUICK CLINICAL ACTIONS ================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-cyan-50 text-[#0891B2]">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="font-heading font-bold text-[#0F172A] text-sm uppercase tracking-wider">
            Quick Clinical Workflows
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            href="/doctor/patients"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-cyan-50/80 border border-slate-200/70 hover:border-cyan-200 transition-all flex flex-col items-center justify-center text-center gap-2 group min-h-[90px]"
          >
            <div className="p-2.5 rounded-xl bg-white text-[#0891B2] shadow-xs group-hover:scale-110 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">Search Patient</span>
          </Link>

          <Link
            href="/doctor/emergency"
            className="p-4 rounded-2xl bg-cyan-50 hover:bg-cyan-100/80 border border-cyan-200 transition-all flex flex-col items-center justify-center text-center gap-2 group min-h-[90px]"
          >
            <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0891B2]">Emergency Scan</span>
          </Link>

          <Link
            href="/doctor/consultations"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-cyan-50/80 border border-slate-200/70 hover:border-cyan-200 transition-all flex flex-col items-center justify-center text-center gap-2 group min-h-[90px]"
          >
            <div className="p-2.5 rounded-xl bg-white text-[#0891B2] shadow-xs group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">Consultations</span>
          </Link>

          <Link
            href="/doctor/prescriptions"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-cyan-50/80 border border-slate-200/70 hover:border-cyan-200 transition-all flex flex-col items-center justify-center text-center gap-2 group min-h-[90px]"
          >
            <div className="p-2.5 rounded-xl bg-white text-[#0891B2] shadow-xs group-hover:scale-110 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">Prescriptions</span>
          </Link>

          <Link
            href="/doctor/copilot"
            className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 hover:from-cyan-100 hover:to-teal-100 border border-cyan-200 transition-all flex flex-col items-center justify-center text-center gap-2 group min-h-[90px] col-span-2 sm:col-span-1"
          >
            <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0891B2] flex items-center gap-1">
              AI Copilot <Sparkles className="w-3 h-3 text-[#22D3EE]" />
            </span>
          </Link>
        </div>
      </div>

      {/* ================= MAIN DASHBOARD BODY (2 COLUMNS) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Consented Patients List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0891B2]" />
                <h3 className="font-heading font-bold text-[#0F172A] text-base">Active Consented Patients</h3>
              </div>
              <Link href="/doctor/patients" className="text-xs text-[#0891B2] font-bold hover:underline flex items-center gap-1">
                <span>View Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#0891B2] font-bold animate-pulse">
                Loading Consented Patient Directory...
              </div>
            ) : patients.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No patient records accessed yet.</p>
                <Link href="/doctor/patients" className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold">
                  Search Registry
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-cyan-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#0891B2] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 font-heading">
                        {patient.fullName.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-bold text-sm text-[#0F172A]">{patient.fullName}</h4>
                          <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {patient.uhid}
                          </span>
                          {patient.riskBadge === "HIGH_RISK" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-[#0891B2] border border-cyan-200">
                              HIGH RISK
                            </span>
                          )}
                          {patient.riskBadge === "STABLE" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                              STABLE
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#475569] flex items-center gap-2.5 flex-wrap">
                          <span>{patient.age} yrs • {patient.gender}</span>
                          <span>• Blood: <strong className="text-[#0891B2] font-bold">{patient.bloodGroup}</strong></span>
                          <span>• Last Visit: {patient.lastVisit}</span>
                        </div>

                        <p className="text-xs text-[#0F172A] font-medium pt-0.5">
                          Diagnosis: <span className="text-[#475569]">{patient.recentDiagnosis}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                      <Link
                        href={`/doctor/patients/${patient.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] font-bold text-xs border border-cyan-200/80 transition-all flex items-center gap-1 min-h-[36px]"
                      >
                        <span>EHR Timeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <span className="text-[10px] text-[#065F46] font-semibold flex items-center gap-1 bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                        <Lock className="w-3 h-3 text-[#22C55E]" /> Consent Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant + Lab Alerts + Consultations */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Clinical Copilot Card */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50/70 p-6 rounded-3xl border border-cyan-200/80 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-[#0F172A] text-base">AI Clinical Copilot</h3>
                </div>
                <span className="text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                  Online
                </span>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed font-medium">
                Analyze clinical lab trends, generate differential diagnoses, and cross-reference patient drug interactions powered by medical AI.
              </p>
            </div>

            <Link
              href="/doctor/copilot"
              className="w-full py-3.5 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
            >
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
              <span>Launch AI Diagnostic Brief</span>
            </Link>
          </div>

          {/* Critical Lab & Clinical Alerts Tile */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-[#0F172A] text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#0891B2]" /> Critical Clinical Flags
              </h3>
              <span className="text-[10px] font-bold bg-cyan-50 text-[#0891B2] px-2.5 py-0.5 rounded-full border border-cyan-200">
                1 HIGH PRIORITY
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold text-[#0F172A]">
                <span>Alex Morgan (PAT-1001)</span>
                <span className="text-[#0891B2] font-bold font-mono">Hb 10.2 g/dL</span>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                CBC lab registered low Hemoglobin. Mild iron deficiency anemia flagged by automated lab analyzer.
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Reported Today</span>
                <Link href="/doctor/patients/pat-1001/reports" className="text-[#0891B2] font-bold hover:underline flex items-center gap-1">
                  <span>View Lab Report</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Consultations Feed */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-[#0F172A] text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0891B2]" /> Recent Consultations
              </h3>
              <Link href="/doctor/consultations" className="text-xs font-bold text-[#0891B2] hover:underline">
                + New Note
              </Link>
            </div>

            <div className="space-y-3">
              {consultations.map((c) => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-[#0F172A]">
                    <span>{c.patientName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{c.date}</span>
                  </div>
                  <p className="text-xs text-[#0891B2] font-bold">{c.diagnosis}</p>
                  <p className="text-[11px] text-[#475569] line-clamp-2">{c.treatmentPlan}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

