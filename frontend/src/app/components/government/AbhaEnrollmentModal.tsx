"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  Smartphone, 
  CreditCard, 
  Link as LinkIcon, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  Lock,
  RefreshCw
} from "lucide-react";
import { GovernmentAPI } from "@/lib/government-api";
import { useToast } from "@/context/ToastContext";

interface AbhaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = "AADHAAR" | "MOBILE" | "EXISTING";

export const AbhaEnrollmentModal: React.FC<AbhaEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("AADHAAR");
  const [step, setStep] = useState<"INPUT" | "OTP" | "SUCCESS">("INPUT");

  const [idInput, setIdInput] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [maskedTarget, setMaskedTarget] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [generatedAbha, setGeneratedAbha] = useState<{ number: string; address: string } | null>(null);

  // OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (step === "OTP" && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  // Step 1: Request OTP or Link
  const handleRequestOtp = async () => {
    const clean = idInput.trim();
    if (!clean) {
      showError("Input Required", "Please enter your number to proceed.");
      return;
    }

    if (activeTab === "EXISTING") {
      try {
        setLoading(true);
        const result = await GovernmentAPI.linkExisting(clean);
        setGeneratedAbha({ number: result.abhaNumber, address: result.abhaAddress });
        setStep("SUCCESS");
        success("ABHA Linked!", "Your existing ABHA account is now linked to MediVault.");
        onSuccess();
      } catch (err: any) {
        showError("Linking Failed", err.message || "Failed to link existing ABHA.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const idType = activeTab === "AADHAAR" ? "AADHAAR_OTP" : "MOBILE_OTP";
      const result = await GovernmentAPI.generateOtp(idType, clean);
      setTransactionId(result.transactionId);
      setMaskedTarget(result.maskedId);
      setStep("OTP");
      setCountdown(60);
      setOtpInput("123456"); // Pre-fill sandbox OTP for convenience
      success("OTP Sent!", `Verification code sent to ${result.maskedId}`);
    } catch (err: any) {
      showError("Request Failed", err.message || "Could not initiate verification.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (otpInput.trim().length !== 6) {
      showError("6-Digit OTP Required", "Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const result = await GovernmentAPI.verifyOtp(transactionId, otpInput.trim());
      setGeneratedAbha({ number: result.abhaNumber, address: result.abhaAddress });
      setStep("SUCCESS");
      success("ABHA Generated!", "Your official National Health Account has been activated.");
      onSuccess();
    } catch (err: any) {
      showError("Verification Failed", err.message || "Invalid OTP entered.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("INPUT");
    setIdInput("");
    setOtpInput("");
    setTransactionId("");
    setGeneratedAbha(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-white font-bold text-xs shadow-md">
              🇮🇳
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Government ABHA Enrollment</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  ABDM NHA
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Ayushman Bharat Digital Mission (National Health Authority)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP: INPUT ── */}
        {step === "INPUT" && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setActiveTab("AADHAAR"); setIdInput(""); }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "AADHAAR"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Aadhaar OTP</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("MOBILE"); setIdInput(""); }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "MOBILE"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile OTP</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("EXISTING"); setIdInput(""); }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "EXISTING"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link ABHA</span>
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                {activeTab === "AADHAAR" && "Enter 12-Digit Aadhaar Number"}
                {activeTab === "MOBILE" && "Enter 10-Digit Mobile Number"}
                {activeTab === "EXISTING" && "Enter 14-Digit ABHA Number or ABHA Address"}
              </label>

              <input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder={
                  activeTab === "AADHAAR"
                    ? "e.g. 5412 8931 9024"
                    : activeTab === "MOBILE"
                    ? "e.g. 98412 89102"
                    : "e.g. 91-4521-8932-1140 or aniket@abdm"
                }
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {activeTab === "AADHAAR" 
                    ? "Your Aadhaar is protected under UIDAI regulations and is never stored in plaintext."
                    : "An OTP will be dispatched to verify ownership of this number."}
                </span>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>ABDM Developer Sandbox Mode</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                You can enter any sample number for testing. In the next step, use sandbox OTP: <code className="bg-amber-200/70 font-mono font-bold px-1.5 py-0.5 rounded">123456</code>.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to NHA Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>{activeTab === "EXISTING" ? "Verify & Link" : "Send Government OTP"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: OTP ── */}
        {step === "OTP" && (
          <div className="space-y-4">
            <div className="text-center space-y-1 py-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Enter Verification Code</h4>
              <p className="text-xs text-slate-500">
                A 6-digit OTP has been sent to <span className="font-bold text-slate-800">{maskedTarget}</span>
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  {countdown > 0 ? (
                    `Expires in ${countdown}s`
                  ) : (
                    <span className="text-rose-600">Code expired</span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={countdown > 0 || loading}
                  className="text-amber-600 font-bold hover:underline disabled:opacity-40 cursor-pointer"
                >
                  Resend OTP
                </button>
              </div>
            </div>

            {/* Sandbox hint */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 text-center">
              Sandbox Test OTP is <span className="font-bold font-mono text-slate-900">123456</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Change Number
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying e-KYC...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify &amp; Activate ABHA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === "SUCCESS" && (
          <div className="text-center space-y-4 py-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900">ABHA Health ID Activated!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your National Health Account is now verified and linked with MediVault.
              </p>
            </div>

            {generatedAbha && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">ABHA Number</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900">{generatedAbha.number}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">ABHA Address</div>
                  <div className="text-xs font-mono font-bold text-emerald-600">{generatedAbha.address}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 hover:brightness-110 cursor-pointer"
            >
              View My ABHA Health Card
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
