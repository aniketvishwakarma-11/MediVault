"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  RotateCw, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  PhoneCall, 
  HeartHandshake,
  Trash2,
  Lock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AbhaProfileData } from "@/types/government";
import { GovernmentAPI } from "@/lib/government-api";
import { useToast } from "@/context/ToastContext";

interface AbhaCardWidgetProps {
  profile: AbhaProfileData | null;
  onEnrollClick: () => void;
  onProfileUpdated: () => void;
}

export const AbhaCardWidget: React.FC<AbhaCardWidgetProps> = ({
  profile,
  onEnrollClick,
  onProfileUpdated,
}) => {
  const { success, error: showError } = useToast();
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isUnlinking, setIsUnlinking] = useState<boolean>(false);

  const isLinked = profile && profile.isGovVerified && profile.abhaNumber;

  const handleCopyAbha = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile?.abhaNumber) return;
    navigator.clipboard.writeText(profile.abhaNumber.replace(/\D/g, ""));
    setCopied(true);
    success("Copied to Clipboard", "14-digit ABHA Number copied.");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  const handleUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to unlink your Government ABHA Health ID?")) return;

    try {
      setIsUnlinking(true);
      await GovernmentAPI.unlink();
      success("ABHA Unlinked", "Government Health ID has been disconnected.");
      onProfileUpdated();
    } catch (err: any) {
      showError("Unlink Failed", err.message || "Could not unlink ABHA.");
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-600 text-white shadow-md shadow-orange-500/20">
            <span className="text-base font-extrabold tracking-tighter">ABHA</span>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Ayushman Bharat Health Account (ABHA)</span>
              {isLinked ? (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Government Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 rounded-full">
                  Not Linked
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              National Health Authority (NHA) digital health identifier for seamless hospital interoperability across India.
            </p>
          </div>
        </div>

        {isLinked ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? "Show Front" : "Flip Card"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors cursor-pointer"
              title="Print Health Card"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEnrollClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create / Link ABHA Card</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {!isLinked ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/30 p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Unlock National Health Interoperability</h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Link or generate your official 14-digit ABHA ID to automatically fetch hospital reports from AIIMS, Apollo, Max, and labs across India.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onEnrollClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-emerald-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:brightness-110 cursor-pointer"
            >
              Generate ABHA in 30 Seconds
            </button>
          </div>
        </div>
      ) : (
        /* Verified 3D Flippable National Health Card */
        <div className="space-y-4">
          <div 
            onClick={() => setIsFlipped(!isFlipped)} 
            className="cursor-pointer select-none perspective-1000 max-w-xl mx-auto"
          >
            <div className={`relative w-full rounded-3xl transition-transform duration-500 transform-style-3d shadow-xl border border-slate-200 overflow-hidden ${isFlipped ? "rotate-y-180" : ""}`}>
              
              {/* ── CARD FRONT ── */}
              <div className={`w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 rounded-3xl ${isFlipped ? "hidden" : "block"}`}>
                {/* Government Ribbon Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-serif text-xs font-black text-amber-400">
                      🇮🇳
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                        Government of India
                      </div>
                      <div className="text-xs font-extrabold tracking-wide text-white">
                        National Health Authority (NHA)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] text-emerald-300 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ABDM Verified</span>
                  </div>
                </div>

                {/* Patient Details & Photo */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    {/* Avatar with Govt Hologram tag */}
                    <div className="relative shrink-0">
                      <div className="w-20 h-24 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-800 shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={profile.kycDetails?.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                          alt="ABHA Photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                        KYC
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="space-y-1">
                      <div className="text-sm font-extrabold text-white tracking-wide">
                        {profile.kycDetails?.fullName || "Aniket Vishwakarma"}
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <div>
                          DOB: <span className="text-slate-200 font-medium">{profile.kycDetails?.dob || "14/05/1998"}</span>
                        </div>
                        <div>
                          Gender: <span className="text-slate-200 font-medium">{profile.kycDetails?.gender || "MALE"}</span>
                        </div>
                        <div>
                          State: <span className="text-slate-200 font-medium">{profile.kycDetails?.state || "Maharashtra"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="p-2 rounded-2xl bg-white text-slate-950 shrink-0 shadow-md">
                    <QRCodeSVG 
                      value={`https://abdm.gov.in/profile/${profile.abhaNumber?.replace(/\D/g, "")}`}
                      size={76}
                      level="M"
                    />
                  </div>
                </div>

                {/* 14-Digit ABHA ID Box */}
                <div className="mt-5 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                      ABHA Number
                    </div>
                    <div className="text-sm sm:text-base font-mono font-extrabold text-amber-300 tracking-wider">
                      {profile.abhaNumber}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyAbha}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Copy ABHA Number"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* ABHA Address Handle Footer */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  <div>
                    ABHA Address: <span className="font-bold text-emerald-400 font-mono">{profile.abhaAddress}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    Tap to flip card ↻
                  </div>
                </div>
              </div>

              {/* ── CARD BACK ── */}
              <div className={`w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white p-6 rounded-3xl space-y-4 ${isFlipped ? "block" : "hidden"}`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="text-xs font-bold text-slate-300">Emergency &amp; Helpline Information</div>
                  <div className="text-[10px] text-amber-400 font-bold">Ayushman Bharat Mission</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-medium">National Health Helpline</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>14555 / 1800-111-565</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-medium">Aadhaar Status</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>{profile.govIdMasked || "XXXX-XXXX-9124"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-bold text-slate-200">Legal Disclaimer:</span> This Digital Health Account card is issued under the Ayushman Bharat Digital Mission (ABDM). It facilitates consent-based sharing of health records across hospitals in India.
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-slate-500">
                  <span>Authorized by National Health Authority (NHA)</span>
                  <span className="text-slate-400 italic">Tap to flip back ↻</span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-600 font-medium">Synced with ABDM Registry</span>
            </div>

            <button
              type="button"
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="text-slate-400 hover:text-rose-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unlink ABHA</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
