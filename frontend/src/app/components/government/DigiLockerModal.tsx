"use client";

import React, { useState } from "react";
import { 
  X, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  HeartHandshake, 
  ExternalLink,
  Sparkles,
  Lock
} from "lucide-react";
import { GovernmentAPI } from "@/lib/government-api";
import { useToast } from "@/context/ToastContext";

interface DigiLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DigiLockerModal: React.FC<DigiLockerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error: showError } = useToast();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "PMJAY_CARD",
    "COVID_VACCINE",
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [imported, setImported] = useState<boolean>(false);

  if (!isOpen) return null;

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
      setLoading(true);
      const res = await GovernmentAPI.importDigiLocker(selectedTypes);
      setImported(true);
      success("Import Completed!", `Successfully imported ${res.importedCount} documents from DigiLocker.`);
      onSuccess();
    } catch (err: any) {
      showError("DigiLocker Error", err.message || "Failed to import documents from DigiLocker.");
    } finally {
      setLoading(false);
    }
  };

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
                Directly import official government health records &amp; insurance policies
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

        {!imported ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              MediVault requests your consent to query your registered DigiLocker account for the following government-issued health records:
            </p>

            {/* Document Checkboxes */}
            <div className="space-y-2.5">
              {/* PMJAY Card */}
              <div 
                onClick={() => toggleType("PMJAY_CARD")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedTypes.includes("PMJAY_CARD")
                    ? "border-blue-500 bg-blue-50/40"
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
                      ₹5L Cover
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
                    ? "border-blue-500 bg-blue-50/40"
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
                Protected under MeitY DigiLocker Guidelines. Only the selected documents will be imported into your encrypted vault.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to DigiLocker...</span>
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
        ) : (
          /* Success state */
          <div className="text-center space-y-4 py-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900">Documents Imported Successfully!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your official DigiLocker records have been indexed into your Medical Documents vault.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:brightness-110 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
