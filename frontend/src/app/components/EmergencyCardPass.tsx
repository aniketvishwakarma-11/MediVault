"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldAlert,
  Phone,
  AlertTriangle,
  Heart,
  Droplets,
  Activity,
  CheckCircle2,
  Lock,
  QrCode,
  Printer,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";
import type { EmergencyCredential, EmergencyProfileSettings, EmergencyContactItem } from "@/lib/emergency-api";
import { normalizeEmergencyQrUrl } from "@/lib/qr-url-helper";

interface EmergencyCardPassProps {
  patientName: string;
  bloodGroup?: string | null;
  chronicConditions?: string[];
  emergencyNotes?: string | null;
  emergencyContacts?: EmergencyContactItem[];
  credential?: EmergencyCredential | null;
  qrUrl?: string | null;
  onPrint?: () => void;
  abhaNumber?: string | null;
  abhaAddress?: string | null;
  isGovVerified?: boolean;
}

export default function EmergencyCardPass({
  patientName,
  bloodGroup,
  chronicConditions = [],
  emergencyNotes,
  emergencyContacts = [],
  credential,
  qrUrl,
  onPrint,
  abhaNumber,
  abhaAddress,
  isGovVerified,
}: EmergencyCardPassProps) {
  const version = credential?.version || 1;
  const expiresAt = credential?.expiresAt
    ? new Date(credential.expiresAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Active Pass";

  const displayBloodGroup = bloodGroup && bloodGroup !== "Not provided" ? bloodGroup : "Not specified";
  const primaryContact = emergencyContacts[0];

  const effectiveQrUrl = React.useMemo(() => {
    return normalizeEmergencyQrUrl(qrUrl, credential?.rawToken || credential?.id);
  }, [qrUrl, credential]);

  return (
    <div className="space-y-6">
      {/* ── Screen Card Header & Print Action ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-rose-50/80 via-white to-cyan-50/80 text-[#0F172A] shadow-xs border border-slate-200/90">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              Official Printable Emergency Pass
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                CR80 Wallet Standard
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Print this pass, cut along the guidelines, and keep it in your wallet for first responders.
            </p>
          </div>
        </div>
        <button
          onClick={onPrint || (() => window.print())}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Printer className="w-4 h-4" />
          Print Emergency Card
        </button>
      </div>

      {/* ── Visual Card Preview (Screen view) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Front of Card Preview */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Card Front (Personal Identity & Emergency QR)
          </div>
          <div className="relative w-full aspect-[1.586/1] max-w-[420px] rounded-2xl bg-gradient-to-br from-white via-slate-50 to-rose-50/20 text-[#0F172A] p-5 border-2 border-slate-200/90 shadow-md overflow-hidden flex flex-col justify-between select-none">
            {/* Background Medical Emblem Overlay */}
            <div className="absolute -right-8 -bottom-8 opacity-[0.04] text-rose-900 pointer-events-none">
              <ShieldAlert className="w-56 h-56" />
            </div>

            {/* Card Header Banner */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  ✚
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-wider text-rose-700 uppercase leading-none">
                    MediVault Emergency Pass
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    CRITICAL MEDICAL DATA CARD
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 font-black text-xs tracking-wide shadow-xs flex items-center gap-1 border border-rose-200">
                <Droplets className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                {displayBloodGroup}
              </div>
            </div>

            {/* Government Verified ABDM Banner */}
            {isGovVerified && abhaNumber && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[10px] text-emerald-800 font-bold">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>GOVERNMENT VERIFIED CITIZEN (ABDM)</span>
                </div>
                <div className="font-mono text-[9px] text-emerald-700 font-extrabold">
                  {abhaNumber}
                </div>
              </div>
            )}

            {/* Card Main Details */}
            <div className="grid grid-cols-3 gap-3 my-auto items-center">
              <div className="col-span-2 space-y-1.5">
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Patient Name</div>
                  <div className="text-sm font-extrabold text-[#0F172A] tracking-tight truncate">{patientName}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="text-[8px] text-slate-500 uppercase font-semibold">Pass Version</div>
                    <div className="font-mono text-slate-800 font-bold">v{version}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-500 uppercase font-semibold">Status</div>
                    <div className="font-mono text-emerald-700 font-bold">{expiresAt}</div>
                  </div>
                </div>

                {chronicConditions.length > 0 && (
                  <div>
                    <div className="text-[8px] text-slate-500 uppercase font-extrabold flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-[#0891B2]" />
                      Chronic Conditions
                    </div>
                    <div className="text-[10px] text-slate-700 font-semibold truncate">
                      {chronicConditions.join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded-xl shadow-xs border border-slate-200">
                {effectiveQrUrl ? (
                  <QRCodeSVG value={effectiveQrUrl} size={88} bgColor="#ffffff" fgColor="#0f172a" level="H" />
                ) : (
                  <div className="w-[88px] h-[88px] bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[9px] text-center p-1">
                    <QrCode className="w-6 h-6 mb-1 text-slate-400" />
                    <span>Loading QR...</span>
                  </div>
                )}
                <div className="text-[7px] font-mono text-slate-600 font-bold mt-1 uppercase tracking-tighter">
                  SCAN FOR RECORD
                </div>
              </div>
            </div>

            {/* Card Footer ICE Contact */}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold truncate">
                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                {primaryContact ? (
                  <span>ICE: <strong className="text-[#0F172A]">{primaryContact.name}</strong> ({primaryContact.phone})</span>
                ) : (
                  <span className="text-slate-500 italic">No Emergency Contact Set</span>
                )}
              </div>
              <span className="text-[8px] font-mono text-[#0891B2] font-bold uppercase shrink-0">
                MediVault Certified
              </span>
            </div>
          </div>
        </div>

        {/* Back of Card Preview */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            Card Back (Instructions & Security Verification)
          </div>
          <div className="relative w-full aspect-[1.586/1] max-w-[420px] rounded-2xl bg-gradient-to-br from-white via-slate-50 to-cyan-50/20 text-[#0F172A] p-5 border-2 border-slate-200/90 shadow-md overflow-hidden flex flex-col justify-between select-none">
            {/* Stripe Header */}
            <div className="-mx-5 -mt-5 bg-slate-100 h-8 border-b border-slate-200 flex items-center justify-between px-5">
              <span className="text-[8px] font-mono text-slate-600 tracking-widest font-semibold">
                AUTOMATED CLINICAL TRIAGE PASS
              </span>
              <span className="text-[8px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                VERIFIED PASS
              </span>
            </div>

            <div className="space-y-2 my-auto text-[10px]">
              <div className="p-2.5 rounded-xl bg-cyan-50/80 border border-cyan-200 space-y-1">
                <div className="text-[9px] font-bold text-[#0891B2] uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  First Responder Triage Instructions
                </div>
                <p className="text-[9px] text-slate-700 leading-tight">
                  Scan QR with any camera or MediVault Doctor Terminal to access emergency medical data, blood type, chronic conditions, and emergency contacts.
                </p>
              </div>

              {emergencyNotes && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 space-y-0.5">
                  <div className="text-[8px] font-bold text-amber-800 uppercase">Emergency Notes</div>
                  <div className="text-[9px] text-amber-950 font-medium truncate">{emergencyNotes}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-600">
                <div>
                  <span className="block text-[8px] text-slate-500 font-semibold uppercase">Platform</span>
                  <span className="text-slate-800 font-bold">MediVault Health AI</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-500 font-semibold uppercase">Security Level</span>
                  <span className="text-emerald-700 font-bold">Zero-Knowledge Token</span>
                </div>
              </div>
            </div>

            {/* Back Footer */}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[8px] text-slate-500 font-mono">
              <span>MEDIVAULT EMERGENCY SYSTEM</span>
              <span>24/7 EMERGENCY ACCESS GATEWAY</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── HIGH DENSITY PRINT-ONLY PASS (Renders ONLY on print) ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="printable-emergency-pass hidden print:block">
        <style jsx global>{`
          @media print {
            body {
              visibility: hidden !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print, header, nav, footer, button {
              display: none !important;
            }
            .printable-emergency-pass {
              visibility: visible !important;
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              padding: 20px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-emergency-pass * {
              visibility: visible !important;
            }
          }
        `}</style>

        <div className="max-w-2xl mx-auto space-y-6 font-sans">
          {/* Print Sheet Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              MediVault Emergency Medical Identity Pass
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Instructions: Cut along the dashed line below to fit into any standard wallet card slot (CR80 standard).
            </p>
          </div>

          {/* Wallet Cards Cutout Layout (Side by Side) */}
          <div className="p-4 border-2 border-dashed border-slate-400 rounded-3xl bg-slate-50 space-y-4">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
              ✂ Cut Along Dashed Outline — Standard Wallet Size (85.6mm x 53.9mm)
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* PRINT FRONT CARD */}
              <div className="border-2 border-slate-900 rounded-2xl bg-white p-4 shadow-none flex flex-col justify-between aspect-[1.586/1]">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-rose-600 text-white font-black rounded flex items-center justify-center text-xs">✚</span>
                    <div>
                      <div className="text-[10px] font-black text-rose-700 uppercase leading-none">EMERGENCY PASS</div>
                      <div className="text-[7px] text-slate-600 font-bold font-mono">MEDIVAULT HEALTH</div>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-xs rounded border border-rose-300">
                    {displayBloodGroup}
                  </div>
                </div>

                {/* Body */}
                <div className="grid grid-cols-3 gap-2 my-auto items-center">
                  <div className="col-span-2 space-y-1">
                    <div>
                      <div className="text-[7px] text-slate-500 uppercase font-bold">PATIENT NAME</div>
                      <div className="text-xs font-black text-slate-900 truncate">{patientName}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[7px]">
                      <div>
                        <span className="text-slate-500 font-semibold">VERSION: </span>
                        <strong className="text-slate-900 font-mono">v{version}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">STATUS: </span>
                        <strong className="text-slate-900 font-mono">{expiresAt}</strong>
                      </div>
                    </div>
                    {chronicConditions.length > 0 && (
                      <div>
                        <div className="text-[7px] font-extrabold text-slate-600 uppercase">CONDITIONS:</div>
                        <div className="text-[8px] font-bold text-slate-800 truncate">{chronicConditions.join(", ")}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center p-1 bg-white border border-slate-900 rounded">
                    {effectiveQrUrl ? (
                      <QRCodeSVG value={effectiveQrUrl} size={76} bgColor="#ffffff" fgColor="#000000" level="H" />
                    ) : (
                      <div className="w-[76px] h-[76px] bg-slate-100 text-[8px] font-mono text-center flex items-center justify-center p-1">
                        SCAN QR CODE
                      </div>
                    )}
                  </div>
                </div>

                {/* ICE Footer */}
                <div className="border-t border-slate-900 pt-1 text-[8px] flex justify-between items-center font-semibold">
                  {primaryContact ? (
                    <>
                      <span>ICE: <strong>{primaryContact.name}</strong></span>
                      <span className="font-mono text-slate-900">{primaryContact.phone}</span>
                    </>
                  ) : (
                    <span className="text-slate-500 italic">No Emergency Contact</span>
                  )}
                </div>
              </div>

              {/* PRINT BACK CARD */}
              <div className="border-2 border-slate-900 rounded-2xl bg-slate-100 p-4 shadow-none flex flex-col justify-between aspect-[1.586/1]">
                <div className="border-b border-slate-900 pb-1 flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase text-slate-900">FIRST RESPONDER INSTRUCTIONS</span>
                  <span className="text-[7px] font-mono font-bold text-slate-700">MEDIVAULT SECURE PASS</span>
                </div>

                <div className="space-y-1 text-[8px] my-auto">
                  <p className="leading-tight text-slate-800">
                    Scan the QR code on the front using any camera or MediVault Doctor App to view emergency profile, blood type, chronic conditions, & emergency contacts.
                  </p>
                  {emergencyNotes && (
                    <div className="p-1 bg-amber-100 border border-amber-300 rounded text-[7px] font-bold text-amber-900">
                      NOTES: {emergencyNotes}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-900 pt-1 flex justify-between items-center text-[7px] font-mono text-slate-700">
                  <span>VERIFICATION: CRYPTOGRAPHIC TOKEN</span>
                  <span>MEDIVAULT HEALTH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Page Detailed Emergency Sheet */}
          <div className="p-5 border-2 border-slate-900 rounded-2xl bg-white space-y-4">
            <h2 className="text-sm font-black uppercase text-slate-900 border-b border-slate-300 pb-2 flex items-center justify-between">
              <span>Full Patient Emergency Sheet</span>
              <span className="text-xs font-mono font-bold text-slate-500">MediVault Health Identity Platform</span>
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[9px] block">Patient Full Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[9px] block">Blood Group</span>
                <span className="font-extrabold text-rose-700 text-sm">{displayBloodGroup}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[9px] block">Chronic Conditions</span>
                <span className="font-bold text-slate-900">{chronicConditions.length > 0 ? chronicConditions.join(", ") : "None reported"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[9px] block">Emergency Notes</span>
                <span className="font-bold text-slate-900">{emergencyNotes || "None"}</span>
              </div>
            </div>

            {emergencyContacts.length > 0 && (
              <div className="border-t border-slate-200 pt-3">
                <div className="text-[10px] font-black uppercase text-slate-700 mb-2">Emergency Contacts</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {emergencyContacts.map((c, i) => (
                    <div key={i} className="p-2 rounded bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">{c.name} ({c.relationship})</div>
                      <div className="font-mono text-slate-700 text-[11px]">{c.phone}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
