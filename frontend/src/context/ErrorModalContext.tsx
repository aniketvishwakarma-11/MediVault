"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Database,
  Bot,
  Lock,
  FileQuestion,
  X,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
} from "lucide-react";

export interface ClinicalErrorDetails {
  code?: string;
  category?: string;
  statusCode?: number;
  userTitle: string;
  userMessage: string;
  actionHint?: string;
  traceId?: string;
  onRetry?: () => void | Promise<void>;
  details?: any;
}

interface ErrorModalContextValue {
  showClinicalError: (err: ClinicalErrorDetails) => void;
  dismissClinicalError: () => void;
  isErrorOpen: boolean;
}

const ErrorModalContext = createContext<ErrorModalContextValue | null>(null);

const CATEGORY_CONFIG: Record<
  string,
  { badge: string; icon: React.ElementType; color: string; border: string; bg: string }
> = {
  CLINICAL_SAFETY: {
    badge: "Clinical Safety Precaution",
    icon: ShieldAlert,
    color: "text-rose-600",
    border: "border-rose-200",
    bg: "bg-rose-50",
  },
  DATABASE: {
    badge: "Medical Database Unavailable",
    icon: Database,
    color: "text-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50",
  },
  AI_SERVICE: {
    badge: "AI Medical Analysis Notice",
    icon: Bot,
    color: "text-[#0891B2]",
    border: "border-cyan-200",
    bg: "bg-cyan-50",
  },
  AUTHORIZATION: {
    badge: "Clinical Clearance Required",
    icon: Lock,
    color: "text-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
  },
  NOT_FOUND: {
    badge: "Clinical Record Notice",
    icon: FileQuestion,
    color: "text-slate-600",
    border: "border-slate-200",
    bg: "bg-slate-50",
  },
  DEFAULT: {
    badge: "System Notice",
    icon: AlertTriangle,
    color: "text-rose-600",
    border: "border-rose-200",
    bg: "bg-rose-50",
  },
};

export function ErrorModalProvider({ children }: { children: ReactNode }) {
  const [activeError, setActiveError] = useState<ClinicalErrorDetails | null>(null);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const showClinicalError = useCallback((err: ClinicalErrorDetails) => {
    setActiveError(err);
    setCopied(false);
    setRetrying(false);
  }, []);

  const dismissClinicalError = useCallback(() => {
    setActiveError(null);
  }, []);

  const handleCopyTrace = () => {
    if (!activeError?.traceId) return;
    navigator.clipboard.writeText(activeError.traceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = async () => {
    if (!activeError?.onRetry) return;
    setRetrying(true);
    try {
      await activeError.onRetry();
      dismissClinicalError();
    } catch {
      // Let error handler re-open if needed
    } finally {
      setRetrying(false);
    }
  };

  const catKey = (activeError?.category || "DEFAULT").toUpperCase();
  const config = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.DEFAULT;
  const IconComp = config.icon;

  return (
    <ErrorModalContext.Provider
      value={{
        showClinicalError,
        dismissClinicalError,
        isErrorOpen: Boolean(activeError),
      }}
    >
      {children}

      {/* ── Global Clinical Error Modal ── */}
      {activeError && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 font-body"
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Status Header */}
            <div className={`px-6 py-4 border-b ${config.border} ${config.bg} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-white shadow-xs ${config.color}`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <div>
                  <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${config.color}`}>
                    {config.badge}
                  </span>
                  {activeError.code && (
                    <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-white/80 border border-slate-200 text-slate-600">
                      {activeError.code}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={dismissClinicalError}
                className="p-1.5 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Modal Body */}
            <div className="p-6 sm:p-7 space-y-5">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-heading font-black text-[#0F172A] tracking-tight">
                  {activeError.userTitle}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {activeError.userMessage}
                </p>
              </div>

              {/* Action Hint Card */}
              {activeError.actionHint && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 font-heading">
                    <HelpCircle className="w-3.5 h-3.5 text-[#0891B2]" />
                    Recommended Next Step
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {activeError.actionHint}
                  </p>
                </div>
              )}

              {/* Support Reference / Trace ID Bar */}
              {activeError.traceId && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 font-mono text-[10px] uppercase">Incident Ref:</span>
                    <span className="font-mono font-bold text-slate-800 truncate">
                      {activeError.traceId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyTrace}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 transition-all shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy Ref</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={dismissClinicalError}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Acknowledge &amp; Dismiss
              </button>
              {activeError.onRetry && (
                <button
                  type="button"
                  disabled={retrying}
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                  {retrying ? "Retrying..." : "Retry Action"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ErrorModalContext.Provider>
  );
}

export function useClinicalError(): ErrorModalContextValue {
  const ctx = useContext(ErrorModalContext);
  if (!ctx) throw new Error("useClinicalError must be used within <ErrorModalProvider>");
  return ctx;
}
