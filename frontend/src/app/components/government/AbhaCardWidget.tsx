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
    if (!profile) return;

    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      window.print();
      return;
    }

    const patientName = profile.kycDetails?.fullName || "Patient";
    const abhaNum = profile.abhaNumber || "91-XXXX-XXXX-XXXX";
    const cleanNum = abhaNum.replace(/\D/g, "");
    const photoUrl = profile.kycDetails?.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
    const dob = profile.kycDetails?.dob || "14/05/1998";
    const gender = profile.kycDetails?.gender || "MALE";
    const state = profile.kycDetails?.state || "Maharashtra";
    const abhaAddress = profile.abhaAddress || "patient@abdm";
    const maskedAadhaar = profile.govIdMasked || "XXXX-XXXX-9124";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Official ABHA Health Card - ${patientName}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .print-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .print-header h1 {
      margin: 0;
      font-size: 19px;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .print-header p {
      margin: 4px 0 0;
      font-size: 12px;
      color: #64748b;
    }
    .cards-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 480px;
      width: 100%;
    }
    .card {
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.1);
      border: 1px solid #cbd5e1;
      background: #0f172a;
      color: white;
      position: relative;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.15);
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .card-header .title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #fbbf24;
      text-transform: uppercase;
    }
    .card-header .subtitle {
      font-size: 13px;
      font-weight: 800;
      color: white;
    }
    .card-header .badge {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
    }
    .card-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
    }
    .patient-avatar {
      width: 68px;
      height: 82px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.25);
      background: #1e293b;
    }
    .patient-info {
      flex: 1;
      min-width: 0;
    }
    .patient-name {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 4px;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .patient-meta {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .patient-meta strong {
      color: #f1f5f9;
    }
    .qr-container {
      background: white;
      padding: 6px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .abha-box {
      margin-top: 14px;
      padding: 10px 14px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .abha-box .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      font-weight: 700;
    }
    .abha-box .number {
      font-size: 16px;
      font-family: monospace;
      font-weight: 800;
      color: #fde047;
      letter-spacing: 1.5px;
    }
    .card-footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    .card-footer strong {
      color: #34d399;
      font-family: monospace;
    }
    .card-back-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .info-box {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      padding: 10px;
      border-radius: 10px;
      font-size: 11px;
    }
    .info-box .title {
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
    }
    .info-box .val {
      font-size: 13px;
      font-weight: 800;
      color: #34d399;
      margin-top: 2px;
    }
    .disclaimer {
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.5;
      background: rgba(255,255,255,0.04);
      padding: 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .cut-line {
      border-top: 2px dashed #94a3b8;
      margin: 10px 0;
      position: relative;
      text-align: center;
    }
    .cut-line span {
      position: relative;
      top: -9px;
      background: #f8fafc;
      padding: 0 10px;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }
    @media print {
      body { background: white; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>Official National Digital Health ID Card</h1>
    <p>National Health Authority (NHA) • Ayushman Bharat Digital Mission (ABDM)</p>
  </div>

  <div class="cards-container">
    <!-- FRONT -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="title">Government of India</div>
          <div class="subtitle">National Health Authority (NHA)</div>
        </div>
        <div class="badge">ABDM Verified</div>
      </div>
      <div class="card-body">
        <div style="display: flex; gap: 12px; align-items: center; min-width: 0; flex: 1;">
          <img class="patient-avatar" src="${photoUrl}" alt="Photo" />
          <div class="patient-info">
            <div class="patient-name">${patientName}</div>
            <div class="patient-meta">
              <div>DOB: <strong>${dob}</strong></div>
              <div>Gender: <strong>${gender}</strong></div>
              <div>State: <strong>${state}</strong></div>
            </div>
          </div>
        </div>
        <div class="qr-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://abdm.gov.in/profile/${cleanNum}" width="72" height="72" alt="ABDM QR" />
        </div>
      </div>
      <div class="abha-box">
        <div>
          <div class="label">ABHA Number</div>
          <div class="number">${abhaNum}</div>
        </div>
      </div>
      <div class="card-footer">
        <div>ABHA Address: <strong>${abhaAddress}</strong></div>
        <div>Authorized Citizen</div>
      </div>
    </div>

    <div class="cut-line"><span>✂ Fold or Cut Along Line</span></div>

    <!-- BACK -->
    <div class="card">
      <div class="card-header">
        <div class="subtitle">Emergency &amp; Helpline Information</div>
        <div class="title" style="color: #fbbf24;">Ayushman Bharat</div>
      </div>
      <div class="card-back-grid">
        <div class="info-box">
          <div class="title">National Health Helpline</div>
          <div class="val">14555 / 1800-111-565</div>
        </div>
        <div class="info-box">
          <div class="title">Aadhaar Status</div>
          <div class="val" style="color: #e2e8f0; font-family: monospace;">${maskedAadhaar}</div>
        </div>
      </div>
      <div class="disclaimer">
        <strong>Legal Notice:</strong> This Digital Health Account card is issued under the Ayushman Bharat Digital Mission (ABDM). It facilitates consent-based sharing of verified health records across registered hospitals, clinics, and diagnostic labs in India.
      </div>
      <div class="card-footer">
        <div>Authorized by National Health Authority (NHA)</div>
        <div>Emergency Trauma Support</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
`;
    printWindow.document.write(html);
    printWindow.document.close();
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
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm space-y-5">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? "Show Front" : "Flip Card"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Print ABHA Card"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEnrollClick}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-emerald-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:brightness-110 flex items-center gap-1.5 cursor-pointer shrink-0"
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
            className="cursor-pointer select-none [perspective:1000px] max-w-xl mx-auto"
          >
            <div className={`relative w-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] shadow-xl border border-slate-200 ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
              
              {/* ── CARD FRONT ── */}
              <div className={`w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-4 sm:p-6 rounded-3xl [backface-visibility:hidden] ${isFlipped ? "hidden" : "block"}`}>
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
                <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                    {/* Avatar with Govt Hologram tag */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-800 shadow-inner">
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
                    <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
                        {profile.kycDetails?.fullName || "Aniket Vishwakarma"}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 space-y-0.5">
                        <div className="truncate">
                          DOB: <span className="text-slate-200 font-medium">{profile.kycDetails?.dob || "14/05/1998"}</span>
                        </div>
                        <div className="truncate">
                          Gender: <span className="text-slate-200 font-medium">{profile.kycDetails?.gender || "MALE"}</span>
                        </div>
                        <div className="truncate">
                          State: <span className="text-slate-200 font-medium">{profile.kycDetails?.state || "Maharashtra"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code (with guaranteed padding so never cut off) */}
                  <div className="p-1.5 sm:p-2 rounded-xl bg-white text-slate-950 shrink-0 shadow-md">
                    <QRCodeSVG 
                      value={`https://abdm.gov.in/profile/${profile.abhaNumber?.replace(/\D/g, "")}`}
                      size={68}
                      level="M"
                    />
                  </div>
                </div>

                {/* 14-Digit ABHA ID Box */}
                <div className="mt-4 sm:mt-5 p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
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
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* ABHA Address Handle Footer */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  <div className="truncate">
                    ABHA Address: <span className="font-bold text-emerald-400 font-mono">{profile.abhaAddress}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic shrink-0">
                    Tap to flip card ↻
                  </div>
                </div>
              </div>

              {/* ── CARD BACK (Counter-rotated by 180deg so text is readable and NEVER mirrored!) ── */}
              <div className={`w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white p-4 sm:p-6 rounded-3xl space-y-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ${!isFlipped ? "hidden" : "block"}`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="text-xs font-bold text-slate-300">Emergency &amp; Helpline Information</div>
                  <div className="text-[10px] text-amber-400 font-bold">Ayushman Bharat Mission</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-medium">National Health Helpline</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                      <span>14555 / 1800-111-565</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-medium">Aadhaar Status</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-mono">{profile.govIdMasked || "XXXX-XXXX-9124"}</span>
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
