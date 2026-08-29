"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, ShieldAlert, X, Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://medivault-653s.onrender.com";

interface AccountErasureCardProps {
  userId?: string;
  token?: string;
}

export const AccountErasureCard: React.FC<AccountErasureCardProps> = ({ userId, token }) => {
  const { success, error, warning } = useToast();
  const { logout } = useAuth();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      warning("Confirmation Required", "Please type DELETE exactly to confirm irreversible data erasure.");
      return;
    }

    setIsPurging(true);
    try {
      const authToken = token || localStorage.getItem("medivault_auth_token") || "";
      const res = await fetch(`${API_BASE}/api/users/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          confirmation: "DELETE_MY_ACCOUNT",
          reason: "Patient-invoked Right to Erasure under DPDPA 2023 Section 12",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || `Server responded with status ${res.status}`);
      }

      success(
        "Account & Health Vault Erased",
        "Your clinical records, prescriptions, and encryption keys have been permanently purged."
      );

      setIsModalOpen(false);

      // Log out patient and redirect to auth screen
      setTimeout(async () => {
        try {
          await logout();
        } catch {}
        router.push("/auth?erased=true");
      }, 1500);

    } catch (err: any) {
      console.error("[AccountErasure Error]:", err);
      error("Purge Failed", err.message || "Failed to execute account erasure. Please contact support.");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <>
      {/* Danger Zone Card */}
      <div className="bg-white rounded-3xl border border-rose-200 shadow-xs overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Data Sovereignty &amp; Account Erasure</h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold font-mono">
                    DPDPA 2023 § 12
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statutory &quot;Right to be Forgotten&quot; (Section 12 of India&apos;s Digital Personal Data Protection Act &amp; GDPR Art. 17).
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setConfirmText("");
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Permanently Erase Health Vault</span>
            </button>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              Under Indian and international data protection laws, you hold complete ownership of your health records. When you execute an erasure request, MediVault permanently deletes all medical documents, lab results, handwritten prescriptions, and derived AI summaries from our storage clusters and databases.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Note: System security logs are anonymized and retained for 180 days solely for statutory audit compliance under CERT-In directions of April 2022.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isPurging}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 text-lg">
                Permanently Erase Health Vault?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                This action is <strong className="text-rose-700">irreversible</strong>. All your encrypted medical documents, blood panels, and prescriptions will be immediately and permanently destroyed.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Statutory Irreversible Deletion:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-800">
                <li>All MinIO &amp; B2 encrypted files purged.</li>
                <li>All prescription records and clinical notes deleted.</li>
                <li>Associated biometric passkeys invalidated.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                To confirm, type <strong className="text-rose-600 font-mono">DELETE</strong> below:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isPurging}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isPurging}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                disabled={confirmText.trim().toUpperCase() !== "DELETE" || isPurging}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Purging Vault...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Erase Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
