"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { 
  ShieldAlert, 
  QrCode, 
  PhoneCall, 
  Printer, 
  Share2, 
  Edit3,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function PatientEmergencyPage() {
  const { user, userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [emergencyData, setEmergencyData] = useState({
    patient_name: "",
    blood_group: "",
    allergies: "",
    conditions: "",
    emergency_contact: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchEmergencyProfile() {
      setIsLoading(true);

      const defaultName = userProfile?.displayName || user?.user_metadata?.full_name || "Aniket Vishwakarma";

      if (!user) {
        if (isMounted) {
          setEmergencyData({
            patient_name: defaultName,
            blood_group: "Not specified - Update in Profile",
            allergies: "None recorded",
            conditions: "None recorded",
            emergency_contact: "Not provided - Update in Profile",
          });
          setIsLoading(false);
        }
        return;
      }

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

        if (isMounted) {
          setEmergencyData({
            patient_name: profileRow?.full_name || defaultName,
            blood_group: patientRow?.blood_group || "Not specified - Update in Profile",
            allergies: patientRow?.allergies || "None recorded",
            conditions: patientRow?.conditions || "None recorded",
            emergency_contact: patientRow?.emergency_contact || "Not provided - Update in Profile",
          });
        }
      } catch (err) {
        console.warn("Emergency load warning:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchEmergencyProfile();

    return () => {
      isMounted = false;
    };
  }, [user, userProfile]);

  const emergencyUrl = `https://medivault.app/emergency/scan?id=${user?.id || "MV-PATIENT-889"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emergencyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-sky-600" />
            Digital Emergency Medical Card
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scannable first-responder pass displaying real health identity parameters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/patient/profile"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile Details</span>
          </Link>

          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>{copied ? "Link Copied!" : "Share Pass"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print ID Card</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
          <span>Generating Emergency Medical ID...</span>
        </div>
      ) : (
        /* Main Grid: Card & QR Code */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Visual Emergency Identity Card (Left Tile) - Clean & Modern Slate Design */}
          <div className="lg:col-span-7 bg-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 space-y-6 relative overflow-hidden border border-slate-800">
            {/* Background Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-slate-800 text-sky-400 border border-slate-700">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight text-white">EMERGENCY MEDICAL PASS</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">MediVault ZKP Verified</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-bold border border-slate-700">
                CRITICAL ACCESS
              </span>
            </div>

            {/* Patient Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Patient Name</div>
                <div className="text-lg font-bold text-white">{emergencyData.patient_name}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Blood Group</div>
                <div className="text-base font-extrabold text-teal-400 bg-teal-950/60 px-3 py-1 rounded-xl inline-block border border-teal-800/60">
                  {emergencyData.blood_group}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Known Allergies</div>
                <div className="text-xs font-medium text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  {emergencyData.allergies}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Chronic Conditions</div>
                <div className="text-xs font-medium text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  {emergencyData.conditions}
                </div>
              </div>
            </div>

            {/* Emergency Contact Bar */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-1">
              <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primary Emergency Contact</span>
              </div>
              <div className="text-base font-extrabold text-emerald-400 flex items-center justify-between">
                <span>{emergencyData.emergency_contact || "Not provided"}</span>
              </div>
            </div>

            {/* Footer ID */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 font-mono border-t border-slate-800/80">
              <span>Vault Hash: #{user?.id?.substring(0, 12) || "0x89f...21c"}</span>
              <span>Paramedic Hotline: 108 / 911</span>
            </div>
          </div>

          {/* Scannable QR Code Tile (Right Tile) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 flex flex-col items-center justify-center text-center">
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-sky-50 text-sky-600 mb-1">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">First Responder QR Pass</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Paramedics can scan this QR code with any mobile camera to view emergency profile data instantly.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm inline-block">
              <QRCodeSVG
                value={emergencyUrl}
                size={180}
                bgColor={"#f8fafc"}
                fgColor={"#0f172a"}
                level={"H"}
                includeMargin={false}
              />
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-xl truncate max-w-xs">
              {emergencyUrl}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
