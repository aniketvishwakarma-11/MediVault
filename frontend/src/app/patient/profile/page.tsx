"use client";

import React, { useState, useEffect } from "react";
import { Suspense } from "react";
import { 
  User, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Calendar, 
  Heart, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Lock,
  PhoneCall,
  Activity,
  Award,
  Wallet,
  RotateCcw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

interface PatientProfileData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  emergency_contact: string;
  weight: string;
  weight_unit: string;
  height: string;
  height_unit: string;
  allergies: string;
  chronic_conditions: string;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

function parseValAndUnit(raw: string | null | undefined, defaultUnit: string) {
  if (!raw || raw === "Not provided" || raw.trim() === "") {
    return { val: "", unit: defaultUnit };
  }
  const parts = raw.trim().split(" ");
  if (parts.length >= 2) {
    return { val: parts[0], unit: parts[1] };
  }
  return { val: raw.trim(), unit: defaultUnit };
}

function PatientProfileContent() {
  const { user, userProfile, isProfileCompleted, refreshProfileCompletion } = useAuth();
  const searchParams = useSearchParams();
  const isRequired = searchParams.get("required") === "true" || isProfileCompleted === false;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const draftKey = `medivault_profile_draft_${user?.id || "guest"}`;

  const [profileData, setProfileData] = useState<PatientProfileData>({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "Prefer not to say",
    blood_group: "O+",
    emergency_contact: "",
    weight: "",
    weight_unit: "kg",
    height: "",
    height_unit: "cm",
    allergies: "",
    chronic_conditions: "",
  });

  const [dbData, setDbData] = useState<PatientProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRealProfile() {
      setLoading(true);
      setErrorMsg(null);

      const defaultEmail = user?.email || userProfile?.email || "patient@medivault.local";
      const defaultName = userProfile?.displayName || user?.user_metadata?.full_name || "Aniket Vishwakarma";

      let initialData: PatientProfileData = {
        full_name: defaultName,
        email: defaultEmail,
        phone: "Not provided",
        date_of_birth: "Not provided",
        gender: "Prefer not to say",
        blood_group: "O+",
        emergency_contact: "",
        weight: "",
        weight_unit: "kg",
        height: "",
        height_unit: "cm",
        allergies: "",
        chronic_conditions: "",
      };

      if (user) {
        try {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const { data: patientRow } = await supabase
            .from("patients")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          let rawDob = patientRow?.date_of_birth || "";
          if (rawDob && rawDob !== "Not provided") {
            const parsedDob = new Date(rawDob);
            if (!isNaN(parsedDob.getTime())) {
              rawDob = parsedDob.toISOString().split("T")[0];
            }
          } else {
            rawDob = "Not provided";
          }

          const parsedHeight = parseValAndUnit(patientRow?.height, "cm");
          const parsedWeight = parseValAndUnit(patientRow?.weight, "kg");

          initialData = {
            full_name: profileRow?.full_name || defaultName,
            email: profileRow?.email || defaultEmail,
            phone: profileRow?.phone || "Not provided",
            date_of_birth: rawDob,
            gender: patientRow?.gender || "Prefer not to say",
            blood_group: patientRow?.blood_group || "O+",
            emergency_contact: patientRow?.emergency_contact || "",
            weight: parsedWeight.val,
            weight_unit: parsedWeight.unit,
            height: parsedHeight.val,
            height_unit: parsedHeight.unit,
            allergies: patientRow?.allergies || "",
            chronic_conditions: patientRow?.chronic_conditions || "",
          };
        } catch (err: any) {
          console.warn("Profile load warning:", err);
        }
      }

      if (!isMounted) return;

      setDbData(initialData);

      // Check if user has an unsaved draft from a previous session / tab switch
      const savedDraft = sessionStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft) as PatientProfileData;
          setProfileData(parsedDraft);
          setHasDraft(true);
          setIsEditing(true);
        } catch {
          setProfileData(initialData);
        }
      } else {
        setProfileData(initialData);
      }

      setLoading(false);
    }

    loadRealProfile();

    return () => {
      isMounted = false;
    };
  }, [user, userProfile]);

  // Persist draft to sessionStorage whenever profileData changes in edit mode
  useEffect(() => {
    if (!loading && isEditing) {
      sessionStorage.setItem(draftKey, JSON.stringify(profileData));
      setHasDraft(true);
    }
  }, [profileData, isEditing, loading, draftKey]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (!user) {
        throw new Error("User session not found. Please log in again.");
      }

      // Format Date of Birth for PostgreSQL DATE column (YYYY-MM-DD)
      let formattedDob: string | null = null;
      if (profileData.date_of_birth && profileData.date_of_birth !== "Not provided" && profileData.date_of_birth.trim() !== "") {
        const parsed = new Date(profileData.date_of_birth);
        if (!isNaN(parsed.getTime())) {
          formattedDob = parsed.toISOString().split("T")[0];
        }
      }

      if (!formattedDob) {
        throw new Error("Please select a valid Date of Birth.");
      }

      if (!profileData.full_name || profileData.full_name.trim().length === 0) {
        throw new Error("Please enter your Full Legal Name.");
      }

      if (!profileData.phone || profileData.phone === "Not provided" || profileData.phone.trim().length < 8) {
        throw new Error("Please enter a valid Phone Number (at least 8 digits).");
      }

      if (!profileData.height || profileData.height.trim().length === 0) {
        throw new Error("Please enter your Height.");
      }

      if (!profileData.weight || profileData.weight.trim().length === 0) {
        throw new Error("Please enter your Weight.");
      }

      const formattedHeightStr = `${profileData.height.trim()} ${profileData.height_unit || "cm"}`;
      const formattedWeightStr = `${profileData.weight.trim()} ${profileData.weight_unit || "kg"}`;

      // Upsert profiles table with conflict resolution & explicit error checking
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email || profileData.email,
            full_name: profileData.full_name.trim(),
            phone: profileData.phone.trim(),
            role: "patient",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileErr) {
        console.error("Profiles save error:", profileErr);
        throw new Error(`Profile Save Failure: ${profileErr.message}`);
      }

      // Upsert patients table with conflict resolution & explicit error checking
      const { error: patientErr } = await supabase
        .from("patients")
        .upsert(
          {
            user_id: user.id,
            date_of_birth: formattedDob,
            gender: profileData.gender || "Prefer not to say",
            blood_group: profileData.blood_group || "O+",
            emergency_contact: profileData.emergency_contact ? profileData.emergency_contact.trim() : null,
            weight: formattedWeightStr,
            height: formattedHeightStr,
            allergies: profileData.allergies ? profileData.allergies.trim() : null,
            chronic_conditions: profileData.chronic_conditions ? profileData.chronic_conditions.trim() : null,
          },
          { onConflict: "user_id" }
        );

      if (patientErr) {
        console.error("Patients save error:", patientErr);
        throw new Error(`Medical Details Save Failure: ${patientErr.message}`);
      }

      const updatedProfileData = {
        ...profileData,
        date_of_birth: formattedDob,
      };

      // Clear draft on save success
      sessionStorage.removeItem(draftKey);
      setHasDraft(false);
      setDbData(updatedProfileData);
      setProfileData(updatedProfileData);

      const isNowCompleted = await refreshProfileCompletion();
      if (isNowCompleted) {
        setSuccessMsg("Patient profile updated and verified successfully! Full portal access unlocked.");
      } else {
        setSuccessMsg("Patient profile saved successfully!");
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error("Profile save error:", err);
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardDraft = () => {
    sessionStorage.removeItem(draftKey);
    setHasDraft(false);
    if (dbData) {
      setProfileData(dbData);
    }
    setIsEditing(false);
  };

  const initial = (profileData.full_name || "P").charAt(0).toUpperCase();

  const isNameValid = Boolean(profileData.full_name && profileData.full_name.trim().length > 0);
  const isPhoneValid = Boolean(profileData.phone && profileData.phone !== "Not provided" && profileData.phone.trim().length >= 8);
  const isDobValid = Boolean(profileData.date_of_birth && profileData.date_of_birth !== "Not provided");
  const isBloodValid = Boolean(profileData.blood_group && profileData.blood_group !== "Not provided");
  const isHeightValid = Boolean(profileData.height && profileData.height.trim().length > 0 && profileData.height !== "Not provided");
  const isWeightValid = Boolean(profileData.weight && profileData.weight.trim().length > 0 && profileData.weight !== "Not provided");

  const completedCount = [isNameValid, isPhoneValid, isDobValid, isBloodValid, isHeightValid, isWeightValid].filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / 6) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Unsaved Draft Banner */}
      {hasDraft && (
        <div className="p-4 rounded-3xl bg-sky-50 border border-sky-200 text-sky-900 text-xs shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
            <span>
              <strong>Unsaved Changes Restored:</strong> Your typed profile details were saved locally when you switched tabs. Remember to click <strong>Save Changes</strong> to save to database.
            </span>
          </div>
          <button
            onClick={handleDiscardDraft}
            className="px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 font-semibold text-[11px] shrink-0 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Discard Draft
          </button>
        </div>
      )}

      {/* Profile Completion Alert Banner */}
      {isRequired && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-amber-950 text-sm">Action Required: Complete Patient Medical Identity</h4>
              <p className="text-amber-800 text-xs">
                To protect patient privacy and enable emergency medical response, please fill in your Full Name, Phone Number, Date of Birth, Blood Group, Height, and Weight below. (Emergency Contact, Allergies & Chronic Conditions are optional).
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-amber-900">Profile Completion Status</span>
              <span className="text-amber-700">{completionPercentage}% ({completedCount}/6 Required Fields)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-amber-200/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-600 via-teal-500 to-sky-700 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-sky-600/20 shrink-0">
            {initial}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{profileData.full_name || "Patient"}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Identity
              </span>
            </div>
            <p className="text-xs text-slate-500">{profileData.email}</p>
            <p className="text-[11px] font-mono text-slate-400">Vault ID: #{user?.id?.substring(0, 12) || "MV-PATIENT-889"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasDraft && (
            <button
              onClick={handleDiscardDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Discard
            </button>
          )}

          <button
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Details Tile */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Personal Information</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-500">Full Legal Name *</label>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="e.g. Aniket Vishwakarma"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-900">{profileData.full_name}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500">Email Address</label>
              <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{profileData.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500">Phone Number (Numbers Only) *</label>
              {isEditing ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 9876543210"
                  value={profileData.phone === "Not provided" ? "" : profileData.phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                    setProfileData({ ...profileData, phone: digitsOnly });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{profileData.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Medical & Emergency Profile Tile */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Heart className="w-5 h-5 fill-teal-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Medical Profile & Contacts</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Blood Group *</label>
                {isEditing ? (
                  <select
                    value={profileData.blood_group}
                    onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Not provided">Select Blood Group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-teal-50 text-teal-900 rounded-xl font-extrabold border border-teal-200">{profileData.blood_group}</div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Gender</label>
                {isEditing ? (
                  <select
                    value={profileData.gender}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Prefer not to say">Select Gender</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-900">{profileData.gender}</div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500">Date of Birth *</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.date_of_birth === "Not provided" ? "" : profileData.date_of_birth}
                  onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{profileData.date_of_birth}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500 flex items-center justify-between">
                <span>Emergency Contact (Numbers Only)</span>
                <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 9876543210 (Optional)"
                  value={profileData.emergency_contact === "Not provided" ? "" : profileData.emergency_contact}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                    setProfileData({ ...profileData, emergency_contact: digitsOnly });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              ) : (
                <div className="p-2.5 bg-rose-50 text-rose-900 rounded-xl font-bold border border-rose-200 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-rose-600" />
                  <span>{profileData.emergency_contact || "Not provided (Optional)"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Clinical Vitals, Allergies & Chronic Conditions Tile */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Physical Vitals & Clinical Conditions</h3>
            <p className="text-xs text-slate-500">Helps AI Copilot and Doctors provide personalized medical advice</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          
          {/* Height & Weight Column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Height *</label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={profileData.height_unit === "ft" ? "e.g. 5.9" : "e.g. 175"}
                      value={profileData.height}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
                        setProfileData({ ...profileData, height: val });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <select
                      value={profileData.height_unit || "cm"}
                      onChange={(e) => setProfileData({ ...profileData, height_unit: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold shrink-0 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="cm">cm</option>
                      <option value="ft">ft / in</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-900">
                    {profileData.height ? `${profileData.height} ${profileData.height_unit || "cm"}` : "Not provided"}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Weight *</label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 61.5"
                      value={profileData.weight}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
                        setProfileData({ ...profileData, weight: val });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <select
                      value={profileData.weight_unit || "kg"}
                      onChange={(e) => setProfileData({ ...profileData, weight_unit: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold shrink-0 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-900">
                    {profileData.weight ? `${profileData.weight} ${profileData.weight_unit || "kg"}` : "Not provided"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500 flex items-center justify-between">
                <span>Known Allergies</span>
                <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts, Dust (or None)"
                  value={profileData.allergies}
                  onChange={(e) => setProfileData({ ...profileData, allergies: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              ) : (
                <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-bold">
                  {profileData.allergies || "No known allergies listed"}
                </div>
              )}
            </div>
          </div>

          {/* Chronic Conditions Column */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-500 flex items-center justify-between">
                <span>Chronic Medical Conditions</span>
                <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              {isEditing ? (
                <textarea
                  rows={4}
                  placeholder="e.g. Asthma, Type 2 Diabetes, Hypertension (or None)"
                  value={profileData.chronic_conditions}
                  onChange={(e) => setProfileData({ ...profileData, chronic_conditions: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              ) : (
                <div className="p-3 bg-purple-50 text-purple-950 border border-purple-200 rounded-xl font-bold min-h-[96px]">
                  {profileData.chronic_conditions || "No chronic conditions reported"}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default function PatientProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Loading profile page...</div>}>
      <PatientProfileContent />
    </Suspense>
  );
}



