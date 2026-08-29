"use client";

import React, { useState } from "react";
import { 
  X, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Lock,
  CreditCard,
  Smartphone,
  KeyRound,
  ArrowRight,
  UserCheck,
  Building2,
  Sparkles
} from "lucide-react";
import { GovernmentAPI } from "@/lib/government-api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface DigiLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalStep = "AUTH" | "CONSENT" | "SUCCESS";

export const DigiLockerModal: React.FC<DigiLockerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [step, setStep] = useState<ModalStep>("AUTH");
  const [idType, setIdType] = useState<"AADHAAR" | "MOBILE">("AADHAAR");
  const [idNumber, setIdNumber] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "PMJAY_CARD",
    "COVID_VACCINE",
  ]);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importedCount, setImportedCount] = useState<number>(0);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state on close
    setStep("AUTH");
    setIdNumber("");
    setPin("");
    onClose();
  };

  const fillSandboxData = () => {
    if (idType === "AADHAAR") {
      setIdNumber("5412 8931 9024");
    } else {
      setIdNumber("9841289102");
    }
    setPin("123456");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = idNumber.replace(/\s+/g, "");

    if (idType === "AADHAAR" && cleanId.length !== 12) {
      showError("Validation", "Please enter a valid 12-digit Aadhaar Number.");
      return;
    }
    if (idType === "MOBILE" && cleanId.length !== 10) {
      showError("Validation", "Please enter a valid 10-digit Mobile Number.");
      return;
    }
    if (pin.trim().length !== 6) {
      showError("Validation", "Please enter your 6-digit DigiLocker Security PIN.");
      return;
    }

    setAuthLoading(true);
    // Simulate MeriPehchan / DigiLocker OAuth validation
    setTimeout(() => {
      setAuthLoading(false);
      setStep("CONSENT");
    }, 500);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleImport = async () => {
    if (selectedTypes.length === 0) {
      showError("Selection Required", "Please select at least one document to import.");
      return;
    }

    try {
      setImportLoading(true);
      const res = await GovernmentAPI.importDigiLocker(selectedTypes, idNumber, pin);
      setImportedCount(res.importedCount);
      setStep("SUCCESS");
      success("Import Completed!", `Successfully imported ${res.importedCount} official documents from DigiLocker.`);
      onSuccess();
    } catch (err: any) {
      showError("DigiLocker Error", err.message || "Failed to import documents from DigiLocker.");
    } finally {
      setImportLoading(false);
    }
  };

  const cleanId = idNumber.replace(/\s+/g, "");
  const maskedId = cleanId.length >= 4 
    ? (idType === "AADHAAR" ? `XXXX-XXXX-${cleanId.slice(-4)}` : `+91-XXXXX-${cleanId.slice(-4)}`) 
    : "XXXX-XXXX-9024";

  const patientDisplayName = user?.user_metadata?.full_name || "MediVault Patient";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>DigiLocker Health Sync</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  MeriPehchan
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Official Ministry of Electronics &amp; IT (MeitY) Health Gateway
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: DigiLocker / MeriPehchan Authentication */}
        {step === "AUTH" && (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Step 1 of 2: Sign In to DigiLocker
              </h4>
              <p className="text-xs text-slate-500">
                Enter your registered Aadhaar or Mobile number and your 6-digit Security PIN to access your government health records.
              </p>
            </div>

            {/* Credential Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setIdType("AADHAAR"); setIdNumber(""); }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  idType === "AADHAAR"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Aadhaar Number
              </button>
              <button
                type="button"
                onClick={() => { setIdType("MOBILE"); setIdNumber(""); }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  idType === "MOBILE"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile Number
              </button>
            </div>

            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {idType === "AADHAAR" ? "12-Digit Aadhaar Number" : "10-Digit Registered Mobile"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  maxLength={idType === "AADHAAR" ? 14 : 10}
                  placeholder={idType === "AADHAAR" ? "e.g. 5412 8931 9024" : "e.g. 9841289102"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* 6-Digit PIN Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  6-Digit DigiLocker Security PIN
                </label>
                <span className="text-[10px] text-slate-400">Default Sandbox: 123456</span>
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 6))}
                maxLength={6}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            {/* Sandbox helper badge */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-800">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sandbox Simulation Engine Active</span>
                </div>
                <div className="text-[11px] text-blue-600">
                  Use any 12-digit Aadhaar / 10-digit mobile &amp; PIN <code className="font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">123456</code>
                </div>
              </div>
              <button
                type="button"
                onClick={fillSandboxData}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
              >
                Auto-Fill
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in to DigiLocker...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with DigiLocker</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Consent & Document Selection */}
        {step === "CONSENT" && (
          <div className="space-y-4">
            {/* Authenticated Citizen Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 truncate">
                    {patientDisplayName}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    DigiLocker Verified
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {idType === "AADHAAR" ? "Aadhaar: " : "Mobile: "}
                  <strong className="text-slate-700">{maskedId}</strong>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              MediVault has been authenticated via MeriPehchan. Select the official health records you authorize to sync into your vault:
            </p>

            {/* Document Checkboxes */}
            <div className="space-y-2.5">
              {/* PMJAY Card */}
              <div 
                onClick={() => toggleType("PMJAY_CARD")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedTypes.includes("PMJAY_CARD")
                    ? "border-blue-500 bg-blue-50/40 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                }`}
              >
                <div className="pt-0.5 text-blue-600">
                  {selectedTypes.includes("PMJAY_CARD") ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Ayushman Bharat PM-JAY Health Card</span>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                      ₹5 Lakh Cover
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    National Health Authority (NHA) • Cashless hospitalization insurance
                  </div>
                </div>
              </div>

              {/* COVID / Immunization */}
              <div 
                onClick={() => toggleType("COVID_VACCINE")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedTypes.includes("COVID_VACCINE")
                    ? "border-blue-500 bg-blue-50/40 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                }`}
              >
                <div className="pt-0.5 text-blue-600">
                  {selectedTypes.includes("COVID_VACCINE") ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    Universal Vaccination Certificate (CoWIN / Routine)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ministry of Health &amp; Family Welfare (MoHFW) • Official dose records
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Protected under MeitY DigiLocker Guidelines. Only the selected documents will be encrypted into your private vault.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setStep("AUTH")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing from DigiLocker...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize &amp; Import Documents</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success State */}
        {step === "SUCCESS" && (
          <div className="text-center space-y-4 py-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900">
                {importedCount} Official Records Imported!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your Ayushman Bharat PM-JAY card and Vaccination certificates have been verified and saved to your Medical Records Vault.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:brightness-110 cursor-pointer"
            >
              View Documents in Vault
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
