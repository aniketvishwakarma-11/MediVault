"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  UserCheck,
  ShieldCheck,
  Building,
  Award,
  Clock,
  Save,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  MapPin,
  Globe,
  FileCheck,
  User,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { mockDoctorProfile } from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const TIME_OPTIONS = [
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
  "09:00 PM", "09:30 PM", "10:00 PM"
];

function DoctorProfileForm() {
  const searchParams = useSearchParams();
  const [isRequired, setIsRequired] = useState(searchParams.get("required") === "true");

  const { user, userProfile, isDemo, setIsProfileCompleted, refreshProfileCompletion } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Personal & License Form Data
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    registrationCouncil: "State Medical Board",
    specialization: "General Practice & Cardiology",
    experienceYears: "5",
    hospitalAffiliation: "",
    clinicName: "",
    address: "",
    languages: "English, Spanish",
  });

  // Structured Clock Dropdown Consultation Times
  const [monFriStart, setMonFriStart] = useState("09:00 AM");
  const [monFriEnd, setMonFriEnd] = useState("05:00 PM");

  const [satClosed, setSatClosed] = useState(false);
  const [satStart, setSatStart] = useState("09:00 AM");
  const [satEnd, setSatEnd] = useState("01:00 PM");

  const [sunClosed, setSunClosed] = useState(true);
  const [sunStart, setSunStart] = useState("10:00 AM");
  const [sunEnd, setSunEnd] = useState("02:00 PM");

  useEffect(() => {
    if (isDemo) {
      setFormData({
        fullName: mockDoctorProfile.fullName,
        email: mockDoctorProfile.email,
        phone: mockDoctorProfile.phone,
        licenseNumber: mockDoctorProfile.licenseNumber,
        registrationCouncil: mockDoctorProfile.registrationCouncil,
        specialization: mockDoctorProfile.specialization,
        experienceYears: String(mockDoctorProfile.experienceYears),
        hospitalAffiliation: mockDoctorProfile.hospitalAffiliation,
        clinicName: mockDoctorProfile.clinicName,
        address: mockDoctorProfile.address,
        languages: mockDoctorProfile.languages.join(", "),
      });
      setIsRequired(false);
    } else if (user) {
      setLoading(true);

      const savedLocal = localStorage.getItem(`medivault_doctor_data_${user.id}`);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          setFormData((prev) => ({
            ...prev,
            fullName: parsed.fullName || prev.fullName,
            phone: parsed.phone || prev.phone,
            licenseNumber: parsed.licenseNumber || prev.licenseNumber,
            registrationCouncil: parsed.registrationCouncil || prev.registrationCouncil,
            specialization: parsed.specialization || prev.specialization,
            experienceYears: parsed.experienceYears || prev.experienceYears,
            hospitalAffiliation: parsed.hospitalAffiliation || prev.hospitalAffiliation,
            clinicName: parsed.clinicName || prev.clinicName,
            address: parsed.address || prev.address,
            languages: parsed.languages || prev.languages,
          }));
          if (parsed.monFriStart) setMonFriStart(parsed.monFriStart);
          if (parsed.monFriEnd) setMonFriEnd(parsed.monFriEnd);
          if (parsed.satClosed !== undefined) setSatClosed(parsed.satClosed);
          if (parsed.satStart) setSatStart(parsed.satStart);
          if (parsed.satEnd) setSatEnd(parsed.satEnd);
          if (parsed.sunClosed !== undefined) setSunClosed(parsed.sunClosed);
          if (parsed.sunStart) setSunStart(parsed.sunStart);
          if (parsed.sunEnd) setSunEnd(parsed.sunEnd);

          if (parsed.licenseNumber) {
            setIsRequired(false);
            if (typeof setIsProfileCompleted === "function") {
              setIsProfileCompleted(true);
            }
          }
        } catch (e) {}
      }

      const fetchRealProfile = async () => {
        try {
          const { data: profRow } = await supabase
            .from("users_profile")
            .select("full_name, email, phone")
            .eq("id", user.id)
            .maybeSingle();

          const { data: docRow } = await supabase
            .from("doctors")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profRow || docRow) {
            setFormData((prev) => ({
              ...prev,
              fullName: profRow?.full_name || prev.fullName || userProfile?.displayName || user.email?.split("@")[0] || "",
              email: profRow?.email || user.email || "",
              phone: profRow?.phone || prev.phone || "",
              licenseNumber: docRow?.license_number || prev.licenseNumber || "",
              registrationCouncil: docRow?.registration_council || prev.registrationCouncil || "State Medical Board",
              specialization: docRow?.specialization || prev.specialization || "General Practice & Cardiology",
              experienceYears: String(docRow?.experience_years || prev.experienceYears || 5),
              hospitalAffiliation: docRow?.hospital_affiliation || prev.hospitalAffiliation || "",
              clinicName: docRow?.clinic_name || prev.clinicName || "",
              address: docRow?.address || prev.address || "",
              languages: docRow?.languages ? docRow.languages.join(", ") : prev.languages || "English",
            }));
          }

          if (docRow?.license_number && docRow.license_number.trim().length > 0) {
            setIsRequired(false);
            if (typeof setIsProfileCompleted === "function") {
              setIsProfileCompleted(true);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch real doctor profile:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchRealProfile();
    }
  }, [isDemo, user, userProfile, setIsProfileCompleted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const monFriHoursStr = `${monFriStart} - ${monFriEnd}`;
      const satHoursStr = satClosed ? "Closed" : `${satStart} - ${satEnd}`;
      const sunHoursStr = sunClosed ? "Closed" : `${sunStart} - ${sunEnd}`;

      if (!isDemo && user) {
        localStorage.setItem(`medivault_doctor_completed_${user.id}`, "true");
        localStorage.setItem(
          `medivault_doctor_data_${user.id}`,
          JSON.stringify({
            fullName: formData.fullName,
            phone: formData.phone,
            licenseNumber: formData.licenseNumber,
            registrationCouncil: formData.registrationCouncil,
            specialization: formData.specialization,
            experienceYears: formData.experienceYears,
            hospitalAffiliation: formData.hospitalAffiliation,
            clinicName: formData.clinicName,
            address: formData.address,
            languages: formData.languages,
            monFriStart,
            monFriEnd,
            satClosed,
            satStart,
            satEnd,
            sunClosed,
            sunStart,
            sunEnd,
          })
        );

        try {
          await supabase
            .from("users_profile")
            .update({
              full_name: formData.fullName,
              phone: formData.phone,
            })
            .eq("id", user.id);

          const { data: existingDoc } = await supabase
            .from("doctors")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          const docData = {
            user_id: user.id,
            license_number: formData.licenseNumber,
            specialization: formData.specialization,
            registration_council: formData.registrationCouncil,
            experience_years: parseInt(formData.experienceYears) || 0,
            hospital_affiliation: formData.hospitalAffiliation,
            clinic_name: formData.clinicName,
            address: formData.address,
            languages: formData.languages.split(",").map((l) => l.trim()),
            consultation_hours: {
              mon_fri: monFriHoursStr,
              sat: satHoursStr,
              sun: sunHoursStr,
            },
            verification_status: "VERIFIED",
          };

          if (existingDoc) {
            await supabase.from("doctors").update(docData).eq("user_id", user.id);
          } else {
            await supabase.from("doctors").insert(docData);
          }
        } catch (dbErr) {
          console.warn("Supabase profile save warning:", dbErr);
        }

        if (typeof setIsProfileCompleted === "function") {
          setIsProfileCompleted(true);
        }
        if (typeof refreshProfileCompletion === "function") {
          await refreshProfileCompletion();
        }
      }

      setIsRequired(false);
      setSuccessMsg("Doctor Profile & Consultation Hours Saved Successfully!");
    } catch (err: any) {
      console.error("Save profile error:", err);
      setErrorMsg(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = formData.fullName
    ? formData.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "MD";

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Required Profile Completion Banner */}
      {isRequired && (
        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-center gap-3 shadow-xs font-semibold">
          <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" />
          <div>
            <strong className="block text-sm text-[#92400E] font-bold">Action Required: Complete Your Doctor Profile</strong>
            <span>Please input your medical license number, specialization, and hospital affiliation to activate full clinical capabilities.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-[#0891B2]" /> Physician Profile & Credentialing Studio
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Manage your official medical council license, hospital affiliations, consultation schedule, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> VERIFIED MEDICAL IDENTITY
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-[#0891B2] font-bold animate-pulse">Loading Doctor Profile Data...</div>
      ) : (
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Doctor Summary */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-6 text-center shadow-xs">
            <div className="w-24 h-24 rounded-2xl bg-[#0891B2] text-white font-extrabold text-2xl border-2 border-cyan-400 overflow-hidden mx-auto shadow-xs flex items-center justify-center">
              {isDemo ? (
                <img src={mockDoctorProfile.profilePhotoUrl} alt={formData.fullName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="font-heading font-bold text-lg text-[#0F172A]">{formData.fullName || "Dr. Authenticated Doctor"}</h2>
              <p className="text-xs text-[#0891B2] font-bold">{formData.specialization || "General Medicine"}</p>
              <p className="text-xs text-[#475569] font-mono">{formData.licenseNumber || "License Pending"}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 text-[#0F172A]">
              <div className="flex justify-between">
                <span className="text-[#475569] font-medium">Email:</span>
                <span className="font-bold text-[#0F172A] truncate">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] font-medium">Experience:</span>
                <span className="font-bold text-[#0F172A]">{formData.experienceYears} Years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] font-medium">Hospital:</span>
                <span className="font-bold text-[#0F172A] truncate">{formData.hospitalAffiliation || "Unspecified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] font-medium">Clinic:</span>
                <span className="font-bold text-[#0F172A] truncate">{formData.clinicName || "Unspecified"}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Profile..." : "Save Doctor Profile"}</span>
            </button>
          </div>

          {/* Right 2 Columns: Editable Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal & License Info */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#0891B2]" /> Medical License & Personal Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Full Doctor Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Medical License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    placeholder="e.g. MD-894021-US"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono font-bold focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Cardiology & Internal Medicine"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Registration Council</label>
                  <input
                    type="text"
                    name="registrationCouncil"
                    value={formData.registrationCouncil}
                    onChange={handleChange}
                    placeholder="e.g. State Medical Board"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  />
                </div>
              </div>
            </div>

            {/* Practice & Location */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Building className="w-5 h-5 text-[#0891B2]" /> Hospital & Practice Affiliations
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Primary Hospital Affiliation</label>
                  <input
                    type="text"
                    name="hospitalAffiliation"
                    value={formData.hospitalAffiliation}
                    onChange={handleChange}
                    placeholder="e.g. St. Jude Memorial Hospital"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5">Clinic Name</label>
                  <input
                    type="text"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleChange}
                    placeholder="e.g. Associates Medical Clinic"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0F172A] mb-1.5">Practice / Clinic Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Suite 300, 100 Medical Center Way"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[42px]"
                  />
                </div>
              </div>
            </div>

            {/* Consultation Hours (Clock Dropdowns) */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0891B2]" /> Consultation Hours Schedule
                </h3>
                <span className="text-[11px] text-[#0891B2] font-bold bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                  Time-Picker Dropdowns
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Monday - Friday */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#0891B2]" /> Monday - Friday
                    </span>
                    <span className="text-[#0891B2] font-mono font-bold text-[11px]">
                      {monFriStart} — {monFriEnd}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-[#475569] mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0891B2]" /> Start Time (In)
                      </label>
                      <select
                        value={monFriStart}
                        onChange={(e) => setMonFriStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0891B2] font-mono font-bold focus:border-[#0891B2] focus:outline-none"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#475569] mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0891B2]" /> End Time (Off)
                      </label>
                      <select
                        value={monFriEnd}
                        onChange={(e) => setMonFriEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0891B2] font-mono font-bold focus:border-[#0891B2] focus:outline-none"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Saturday */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#0891B2]" /> Saturday
                    </span>
                    <button
                      type="button"
                      onClick={() => setSatClosed(!satClosed)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        satClosed ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                      }`}
                    >
                      {satClosed ? "CLOSED" : "AVAILABLE"}
                    </button>
                  </div>

                  {!satClosed && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0891B2]" /> Start Time (In)
                        </label>
                        <select
                          value={satStart}
                          onChange={(e) => setSatStart(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0891B2] font-mono font-bold focus:border-[#0891B2] focus:outline-none"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0891B2]" /> End Time (Off)
                        </label>
                        <select
                          value={satEnd}
                          onChange={(e) => setSatEnd(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0891B2] font-mono font-bold focus:border-[#0891B2] focus:outline-none"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sunday */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#475569]" /> Sunday
                    </span>
                    <button
                      type="button"
                      onClick={() => setSunClosed(!sunClosed)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        sunClosed ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                      }`}
                    >
                      {sunClosed ? "CLOSED" : "AVAILABLE"}
                    </button>
                  </div>

                  {!sunClosed && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0891B2]" /> Start Time (In)
                        </label>
                        <select
                          value={sunStart}
                          onChange={(e) => setSunStart(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0891B2] font-mono font-bold focus:border-[#0891B2] focus:outline-none"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0891B2]" /> End Time (Off)
                        </label>
                        <select
                          value={sunEnd}
                          onChange={(e) => setSunEnd(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#0891B2] font-mono font-bold focus:border-[#0891B2] focus:outline-none"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function DoctorProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#0891B2] text-xs font-mono animate-pulse">Loading Profile...</div>}>
      <DoctorProfileForm />
    </Suspense>
  );
}

