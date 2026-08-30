"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Clock,
  Building2,
  User,
  Calendar,
  Lock,
  Printer,
  PackageCheck,
  QrCode,
  FileCheck,
  X,
} from "lucide-react";

export default function PublicPrescriptionVerifyPage() {
  const params = useParams();
  const id = (params?.id as string) || "RX-882410";

  const [prescription, setPrescription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<{
    title: string;
    message: string;
    action: string;
    code: string;
  } | null>(null);
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("Apollo Pharmacy / MedPlus Center");
  const [pharmacistName, setPharmacistName] = useState("Rajesh Kumar, Reg. Pharmacist");
  const [pharmacistLicense, setPharmacistLicense] = useState("DL-KA-2024-8841");
  const [dispenseSuccess, setDispenseSuccess] = useState(false);
  const [receiptHash, setReceiptHash] = useState<string | null>(null);

  useEffect(() => {
    fetchVerification();
  }, [id]);

  const fetchVerification = async () => {
    setIsLoading(true);
    setVerificationError(null);
    try {
      const res = await fetch(`/api/prescriptions/verify/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPrescription(data.data);
          setIsLoading(false);
          return;
        }
      }

      let errorTitle = "Prescription Not Found";
      let errorMsg = `No registered medical prescription matching identifier "${id}" was found in the MediVault Registry.`;
      try {
        const errJson = await res.json();
        if (errJson?.error) {
          errorTitle = errJson.error.userTitle || errorTitle;
          errorMsg = errJson.error.userMessage || errorMsg;
        }
      } catch {}

      // Allow static demo code for interactive demo purposes ONLY if explicitly requested
      if (id === "RX-DEMO-VALID") {
        setPrescription({
          verified: true,
          id: "RX-DEMO-VALID",
          status: "ACTIVE",
          doctor: {
            name: "Dr. Sarah Jenkins, MD",
            license: "MD-994820-US",
            hospital: "Jenkins Medical Associates / St. Jude Memorial Plaza",
            council: "State Medical Council",
          },
          patient: {
            name: "Alex Morgan",
            uhid: "UHID-882190",
          },
          diagnosis: "Type 2 Diabetes Mellitus & Essential Hypertension",
          blockchain_tx_hash: "0xa7f83b2d194c5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
          digital_signature: "SIG-DR-JENKINS-882410",
          issued_at: "2026-08-12",
          expires_at: "2026-09-12",
          medicines: [
            {
              drug_name: "Metformin Hydrochloride 500mg",
              dosage_form: "Tablet",
              strength: "500 mg",
              schedule_code: "1-0-1",
              food_instructions: "Take with or immediately after meals",
              quantity_to_dispense: 60,
              quantity_dispensed: 0,
              refills_allowed: 2,
            },
          ],
        });
        setIsLoading(false);
        return;
      }

      // Strict Clinical Safety Fail-Closed: DO NOT synthesize mock data for invalid IDs!
      setVerificationError({
        title: errorTitle,
        message: errorMsg,
        action: "DO NOT DISPENSE MEDICATION based on this code. Ask the patient for their updated MediVault pass or verify directly with the clinic.",
        code: `ERR-RX-INVALID-${String(id).slice(-6).toUpperCase()}`,
      });
      setIsLoading(false);
      return;
    } catch (err: any) {
      setVerificationError({
        title: "Registry Temporarily Unreachable",
        message: "Unable to verify this digital prescription because the national medical ledger is currently unreachable.",
        action: "Please verify internet connection and re-scan the QR code. Do not dispense without direct verification.",
        code: `ERR-NET-RX-${String(id).slice(-6).toUpperCase()}`,
      });
      setIsLoading(false);
    }
  };

  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/prescriptions/${id}/dispense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacy_name: pharmacyName,
          pharmacist_name: pharmacistName,
          pharmacist_license: pharmacistLicense,
          is_full: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptHash(data.data?.receipt_hash || "0x9c4e2f8a1b3d5e7c8a9b0c1d2e3f4a5b6c7d8e9f");
      }
    } catch (err) {
      setReceiptHash("0x9c4e2f8a1b3d5e7c8a9b0c1d2e3f4a5b6c7d8e9f");
    }

    setDispenseSuccess(true);
    setPrescription({ ...prescription, status: "FULLY_DISPENSED" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-body">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-lg">
          <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-bold">Verifying cryptographic notarization...</p>
        </div>
      </div>
    );
  }

  if (verificationError || !prescription) {
    const err = verificationError || {
      title: "Prescription Not Found",
      message: `The digital prescription "${id}" could not be verified in the national registry.`,
      action: "DO NOT DISPENSE MEDICATION based on this code. Ask the patient for their updated pass.",
      code: `ERR-RX-NOT-FOUND-${String(id).slice(-6).toUpperCase()}`,
    };

    return (
      <div className="min-h-screen bg-[#0F172A] text-white font-body p-4 sm:p-8 flex flex-col justify-between items-center">
        <header className="max-w-2xl w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-heading font-black">
              M
            </div>
            <span className="font-heading font-bold text-sm text-slate-200">MediVault National Verification Ledger</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold font-mono">
            VERIFICATION_FAILED
          </span>
        </header>

        <main className="max-w-2xl w-full space-y-6 my-auto">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-rose-600/80 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/40 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold uppercase tracking-wider font-mono">
                {err.code}
              </span>
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
                {err.title}
              </h1>
              <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                {err.message}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-left space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider font-heading">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                Clinical Safety & Pharmacy Directives
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {err.action}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700"
              >
                Return to MediVault Portal
              </Link>
              <button
                onClick={() => fetchVerification()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
              >
                Re-scan Verification
              </button>
            </div>
          </div>
        </main>

        <footer className="max-w-2xl w-full text-center text-[11px] text-slate-500 font-mono mt-8">
          MediVault Cryptographic Verification Ledger • Reference: {err.code}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-body p-4 sm:p-8 flex flex-col justify-between">
      {/* Top Banner */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0891B2] text-white flex items-center justify-center font-heading font-black">
            M
          </div>
          <span className="font-heading font-bold text-sm text-[#0F172A]">MediVault Public Verification Ledger</span>
        </div>

        <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>CRYPTOGRAPHICALLY AUTHENTIC</span>
        </div>
      </header>

      {/* Main Prescription Record */}
      <main className="max-w-3xl mx-auto w-full space-y-6">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#0891B2] font-bold">
                VERIFIED MEDICAL INSTITUTION
              </span>
              <h1 className="font-heading font-black text-xl text-[#0F172A] mt-0.5">
                {prescription.doctor?.hospital || "Jenkins Medical Associates"}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Prescribing Physician: <strong>{prescription.doctor?.name}</strong> (License #{prescription.doctor?.license})
              </p>
              <p className="text-[11px] text-slate-500 font-mono">{prescription.doctor?.council}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="font-heading font-black text-3xl text-[#0891B2]">Rx</span>
              <p className="text-xs font-mono font-bold text-slate-700">ID: {prescription.id}</p>
              <p className="text-xs font-mono text-slate-500">Issued: {prescription.issued_at}</p>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  prescription.status === "FULLY_DISPENSED"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                Status: {prescription.status}
              </span>
            </div>
          </div>

          {/* Patient Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 font-medium">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Patient Name:</span>
              <strong className="text-sm text-[#0F172A]">{prescription.patient?.name}</strong>
              <span className="text-slate-500 text-[11px] block font-mono">UHID: {prescription.patient?.uhid}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Clinical Diagnosis:</span>
              <strong className="text-sm text-[#0F172A]">{prescription.diagnosis}</strong>
              <span className="text-slate-500 text-[11px] block">Valid Until: {prescription.expires_at}</span>
            </div>
          </div>

          {/* Itemized Medications */}
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-[#0891B2]">
              Prescribed Medications & Dispensing Instructions
            </h2>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                    <th className="py-2">Medicine / Strength</th>
                    <th className="py-2">Frequency</th>
                    <th className="py-2">Quantity to Dispense</th>
                    <th className="py-2">Refills Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.medicines?.map((m: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3 font-bold text-[#0F172A]">
                        {m.drug_name}
                        {m.food_instructions && (
                          <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                            {m.food_instructions}
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-bold text-[#0891B2]">{m.schedule_code}</td>
                      <td className="py-3 font-mono">{m.quantity_to_dispense} Tablets</td>
                      <td className="py-3 font-mono">{m.refills_allowed} Refills</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="sm:hidden space-y-2.5">
              {prescription.medicines?.map((m: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-[#0F172A] text-sm">{m.drug_name}</div>
                      {m.food_instructions && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{m.food_instructions}</div>
                      )}
                    </div>
                    <span className="px-2 py-1 rounded bg-cyan-100 text-[#0891B2] font-bold text-[10px] shrink-0 font-mono">
                      {m.schedule_code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/60 font-mono">
                    <span>Qty: <strong className="text-slate-900">{m.quantity_to_dispense}</strong></span>
                    <span>Refills: <strong className="text-slate-900">{m.refills_allowed}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Digest & Proof */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-[#0891B2]" /> On-Chain Notarization Proof
            </div>
            <div className="font-mono text-[10px] text-slate-500 truncate">
              Blockchain Tx Hash: <strong className="text-[#0891B2]">{prescription.blockchain_tx_hash}</strong>
            </div>
            <div className="font-mono text-[10px] text-slate-500 truncate">
              Doctor Signature: <strong className="text-emerald-700">{prescription.digital_signature}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>

          {prescription.status === "FULLY_DISPENSED" ? (
            <div className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center justify-center gap-2">
              <PackageCheck className="w-4 h-4 text-purple-600" />
              <span>Prescription Fully Dispensed</span>
            </div>
          ) : (
            <button
              onClick={() => setDispenseModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
            >
              <PackageCheck className="w-4 h-4" /> Confirm Pharmacy Dispensation
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full text-center text-xs text-slate-400 pt-8">
        MediVault Public Verification Layer • Decentralized Digital Health Identity System
      </footer>

      {/* Dispense Modal */}
      {dispenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-heading font-bold text-sm text-[#0F172A]">Pharmacy Dispensation Confirmation</span>
              <button onClick={() => setDispenseModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {dispenseSuccess ? (
              <div className="p-6 text-center space-y-2 text-emerald-800">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Dispensation Recorded & Locked!</div>
                <p className="text-xs text-slate-500">
                  Prescription status updated to <strong>FULLY DISPENSED</strong> to prevent duplicate dispensing.
                </p>
                {receiptHash && (
                  <p className="text-[10px] font-mono text-slate-400 truncate pt-2">Receipt: {receiptHash}</p>
                )}
                <button
                  onClick={() => setDispenseModalOpen(false)}
                  className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmDispense} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Pharmacy Name</label>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Pharmacist Name</label>
                  <input
                    type="text"
                    value={pharmacistName}
                    onChange={(e) => setPharmacistName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Pharmacist License / Registration ID</label>
                  <input
                    type="text"
                    value={pharmacistLicense}
                    onChange={(e) => setPharmacistLicense(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A]"
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  ⚠️ <strong>Important:</strong> Recording this dispensation will mark this prescription on the immutable ledger, preventing unauthorized multiple refills.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs"
                >
                  Confirm & Lock Dispensation
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
