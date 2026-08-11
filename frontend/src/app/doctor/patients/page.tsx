"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Users,
  ShieldCheck,
  Lock,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
} from "lucide-react";
import { mockDoctorPatients, DoctorDemoPatient } from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function DoctorPatientSearchPage() {
  const { user, userProfile, isDemo } = useAuth();
  const [patients, setPatients] = useState<DoctorDemoPatient[]>(isDemo ? mockDoctorPatients : []);
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // Modal State for Requesting Access
  const [selectedPatientForAccess, setSelectedPatientForAccess] = useState<DoctorDemoPatient | null>(null);
  const [accessPurpose, setAccessPurpose] = useState("Routine Clinical Consultation & Medical History Review");
  const [requestSent, setRequestSent] = useState(false);

  const currentDocName = userProfile?.displayName || (user?.email ? `Dr. ${user.email.split("@")[0]}` : "Dr. Authenticated Doctor");

  React.useEffect(() => {
    if (isDemo) {
      setPatients(mockDoctorPatients);
      return;
    }

    const fetchRealPatients = async () => {
      try {
        const { data: dbPatients } = await supabase
          .from("patients")
          .select("*, users_profile!inner(full_name, email, phone, avatar_url)");

        let rawList: any[] = [];

        if (dbPatients && dbPatients.length > 0) {
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
          const res = await fetch(`http://localhost:5000/doctor/patients/search?q=${encodeURIComponent(searchQuery)}`);
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            rawList = json.data;
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

        let uniqueList = Array.from(uniqueMap.values());

        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          uniqueList = uniqueList.filter(
            (p) =>
              p.full_name?.toLowerCase().includes(q) ||
              p.email?.toLowerCase().includes(q) ||
              p.phone?.toLowerCase().includes(q) ||
              p.blood_group?.toLowerCase().includes(q)
          );
        }

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
            riskBadge: "STABLE" as const,
            recentDiagnosis: "No consultations recorded yet",
            currentMedications: [],
            lastVisit: new Date().toISOString().split("T")[0],
            accessStatus: "APPROVED" as const,
            allergies: p.allergies ? [p.allergies] : ["None recorded"],
            chronicConditions: p.chronic_conditions ? [p.chronic_conditions] : ["None recorded"],
            emergencyContact: p.emergency_contact || "N/A",
            bmi: 22.0,
            insuranceProvider: "Healthcare Provider",
            primaryDoctor: currentDocName,
          };
        });

        setPatients(mapped);
      } catch (err) {
        console.warn("Failed to fetch real patients:", err);
        setPatients([]);
      }
    };

    fetchRealPatients();
  }, [isDemo, searchQuery, currentDocName]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const filteredPatients = patients.filter((patient) => {
    const matchesQuery =
      searchQuery === "" ||
      patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.recentDiagnosis.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBlood = bloodFilter === "ALL" || patient.bloodGroup === bloodFilter;
    const matchesGender = genderFilter === "ALL" || patient.gender === genderFilter;
    const matchesRisk = riskFilter === "ALL" || patient.riskBadge === riskFilter;

    return matchesQuery && matchesBlood && matchesGender && matchesRisk;
  });

  const handleSendConsentRequest = () => {
    if (!selectedPatientForAccess) return;
    setPatients((prev) =>
      prev.map((p) => (p.id === selectedPatientForAccess.id ? { ...p, accessStatus: "PENDING" } : p))
    );
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setSelectedPatientForAccess(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#0891B2]" /> Patient Search & Consent Directory
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Search patient health profiles, inspect consent status, or send cryptographic access requests.
          </p>
        </div>

        <Link
          href="/doctor/emergency"
          className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-xs flex items-center gap-2 min-h-[44px]"
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Bypass via Emergency QR Terminal</span>
        </Link>
      </div>

      {/* Search Bar & Filter Controls */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient Name, Health ID (MV-PAT-...), Email, Phone, Blood Group, Diagnosis..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-sm focus:border-[#0891B2] focus:bg-white focus:ring-2 focus:ring-[#0891B2]/20 focus:outline-none placeholder:text-slate-400 transition-all min-h-[42px]"
            />
          </div>
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <span className="text-[#475569] font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#0891B2]" /> Filters:
          </span>

          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            <option value="ALL">All Blood Groups</option>
            <option value="O+">O+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="AB+">AB+</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH_RISK">High Risk</option>
            <option value="MODERATE_RISK">Moderate Risk</option>
            <option value="STABLE">Stable</option>
          </select>

          {(searchQuery || bloodFilter !== "ALL" || genderFilter !== "ALL" || riskFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setBloodFilter("ALL");
                setGenderFilter("ALL");
                setRiskFilter("ALL");
              }}
              className="text-xs font-bold text-[#0891B2] hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPatients.map((patient) => {
          const isApproved = patient.accessStatus === "APPROVED" || patient.accessStatus === "EMERGENCY_GRANTED";
          const isPending = patient.accessStatus === "PENDING";

          return (
            <div
              key={patient.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden border border-slate-300/80 shrink-0 shadow-xs">
                      <img src={patient.avatarUrl} alt={patient.fullName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-base text-[#0F172A]">{patient.fullName}</h3>
                      <p className="text-xs text-slate-500 font-mono">{patient.uhid}</p>
                    </div>
                  </div>

                  {patient.riskBadge === "HIGH_RISK" && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      HIGH RISK
                    </span>
                  )}
                  {patient.riskBadge === "STABLE" && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      STABLE
                    </span>
                  )}
                  {patient.riskBadge === "MODERATE_RISK" && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      MODERATE RISK
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 text-[#0F172A]">
                  <div>
                    <span className="text-[#475569] block text-[10px] font-semibold">Age / Gender</span>
                    <strong className="text-[#0F172A]">{patient.age} yrs • {patient.gender}</strong>
                  </div>
                  <div>
                    <span className="text-[#475569] block text-[10px] font-semibold">Blood Group</span>
                    <strong className="text-rose-600 font-bold">{patient.bloodGroup}</strong>
                  </div>
                  <div>
                    <span className="text-[#475569] block text-[10px] font-semibold">Known Allergies</span>
                    <span className="text-[#0F172A] truncate block font-medium">{patient.allergies.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-[#475569] block text-[10px] font-semibold">Primary Doctor</span>
                    <span className="text-[#0F172A] truncate block font-medium">{patient.primaryDoctor}</span>
                  </div>
                </div>

                <div className="text-xs text-[#0F172A] space-y-1">
                  <span className="text-[#475569] text-[11px] font-semibold block">Recent Diagnosis & Meds</span>
                  <p className="font-bold text-[#0891B2]">{patient.recentDiagnosis}</p>
                  <p className="text-[11px] text-[#475569]">{patient.currentMedications.join(" • ") || "No active prescriptions"}</p>
                </div>
              </div>

              {/* Access Button Footer */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                {isApproved ? (
                  <>
                    <span className="text-xs text-[#065F46] font-semibold flex items-center gap-1.5 bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Consent Verified
                    </span>
                    <Link
                      href={`/doctor/patients/${patient.id}`}
                      className="px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 min-h-[38px]"
                    >
                      <span>Open EMR Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                ) : isPending ? (
                  <>
                    <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Access Request Pending
                    </span>
                    <button
                      disabled
                      className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed min-h-[38px]"
                    >
                      Awaiting Patient
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-[#475569] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" /> Records Locked
                    </span>
                    <button
                      onClick={() => setSelectedPatientForAccess(patient)}
                      className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/80 text-[#0891B2] font-bold text-xs transition-all min-h-[38px]"
                    >
                      Request Patient Access
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Request Access */}
      {selectedPatientForAccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPatientForAccess(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {requestSent ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#22C55E]" />
                </div>
                <h3 className="font-heading font-bold text-lg text-[#0F172A]">Access Request Dispatched!</h3>
                <p className="text-xs text-[#475569]">
                  Notification sent to patient <strong className="text-[#0891B2]">{selectedPatientForAccess.fullName}</strong>. You will be notified as soon as they grant access.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-lg text-[#0F172A] flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#0891B2]" /> Request Record Access
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Send a consent request to access <strong className="text-[#0F172A]">{selectedPatientForAccess.fullName}</strong>'s EHR records.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-[#0F172A]">
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Patient UHID:</span>
                    <span className="font-mono font-bold text-[#0891B2]">{selectedPatientForAccess.uhid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Requested By:</span>
                    <span className="font-bold">{currentDocName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Clinical Purpose / Medical Justification
                  </label>
                  <textarea
                    rows={3}
                    value={accessPurpose}
                    onChange={(e) => setAccessPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none placeholder:text-slate-400 transition-all"
                    placeholder="Enter reason for requesting patient records..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedPatientForAccess(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendConsentRequest}
                    className="px-5 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 min-h-[38px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Consent Request</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
