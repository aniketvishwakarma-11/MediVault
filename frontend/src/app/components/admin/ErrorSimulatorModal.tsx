"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Database,
  Bot,
  Pill,
  Lock,
  UserX,
  AlertTriangle,
  Play,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code2,
  Eye,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useClinicalError } from "@/context/ErrorModalContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SimulationScenario {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  description: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: "DATABASE_OUTAGE",
    name: "Database Connection Failure",
    category: "Infrastructure",
    expectedStatus: 503,
    description: "Simulates PostgreSQL connection timeout or pool exhaustion. Verifies safe fail-closed behavior without uncommitted writes.",
    icon: Database,
    color: "text-amber-600",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: "AI_INFERENCE_TIMEOUT",
    name: "AI Clinical Inference Timeout",
    category: "Clinical AI",
    expectedStatus: 502,
    description: "Simulates Google Gemini API downtime. Verifies document safe preservation without synthesizing fake medical history.",
    icon: Bot,
    color: "text-[#0891B2]",
    badgeColor: "bg-cyan-100 text-[#0891B2] border-cyan-200",
  },
  {
    id: "PRESCRIPTION_NOT_FOUND",
    name: "Counterfeit / Invalid Prescription",
    category: "Verification",
    expectedStatus: 404,
    description: "Simulates pharmacy QR scan of a non-existent or counterfeit ID. Verifies immediate dispensary rejection notice.",
    icon: Pill,
    color: "text-rose-600",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    id: "UNVERIFIED_DOCTOR_LICENSE",
    name: "Unverified Prescribing Physician",
    category: "Clinical Safety",
    expectedStatus: 422,
    description: "Simulates prescription issuance by an unverified or suspended physician. Verifies license check enforcement.",
    icon: Lock,
    color: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    id: "PATIENT_SESSION_MISMATCH",
    name: "Missing Patient Identifier",
    category: "Privacy & HIPAA",
    expectedStatus: 400,
    description: "Simulates missing patient session to verify elimination of shared dummy UUID cross-patient data bleed.",
    icon: UserX,
    color: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: "UNHANDLED_SYSTEM_CRASH",
    name: "Sanitized Internal Crash",
    category: "Security Masking",
    expectedStatus: 500,
    description: "Simulates an unhandled internal exception. Verifies that SQL errors and stack traces are completely masked from users.",
    icon: AlertTriangle,
    color: "text-rose-700",
    badgeColor: "bg-red-100 text-red-800 border-red-200",
  },
];

export function ErrorSimulatorModal() {
  const { showClinicalError } = useClinicalError();
  const { error: showToastError, success: showToastSuccess } = useToast();

  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<any | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<"modal" | "toast">("modal");
  const [copied, setCopied] = useState(false);

  const runSimulation = async (scenario: SimulationScenario) => {
    setRunningId(scenario.id);
    setLastResponse(null);
    setLastStatus(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/system/simulate-error`, {
        method: "POST",
        headers,
        body: JSON.stringify({ errorType: scenario.id }),
      });

      setLastStatus(res.status);
      const json = await res.json();
      setLastResponse(json);

      const errPayload = json.error || {
        userTitle: json.message || "Simulated Error",
        userMessage: json.message || "Error details",
        actionHint: "Simulated testing hint",
        traceId: `ERR-SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        category: scenario.category,
      };

      if (previewMode === "modal") {
        showClinicalError({
          code: errPayload.code || scenario.id,
          category: errPayload.category || "DEFAULT",
          statusCode: res.status,
          userTitle: errPayload.userTitle,
          userMessage: errPayload.userMessage,
          actionHint: errPayload.actionHint,
          traceId: errPayload.traceId,
          details: errPayload.details,
          onRetry: () => runSimulation(scenario),
        });
      } else {
        showToastError(errPayload.userTitle, errPayload.userMessage);
      }
    } catch (fetchErr: any) {
      setLastStatus(500);
      setLastResponse({ error: { message: fetchErr.message } });
      showToastError("Simulation Network Error", fetchErr.message);
    } finally {
      setRunningId(null);
    }
  };

  const handleCopyJson = () => {
    if (!lastResponse) return;
    navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6 font-body">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider border border-rose-200 mb-1.5 font-heading">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Clinical Error Handling &amp; Safety Diagnostic Suite
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-black text-[#0F172A] tracking-tight">
            System Error Simulator &amp; User Experience Sandbox
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Test how the healthcare platform handles unexpected outages, AI timeouts, and invalid clinical credentials.
            Verify that technical exceptions are transformed into empathetic, plain-language patient and physician alerts.
          </p>
        </div>

        {/* UI Presentation Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-500 px-2 font-heading">Trigger View:</span>
          <button
            type="button"
            onClick={() => setPreviewMode("modal")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              previewMode === "modal"
                ? "bg-white text-[#0891B2] shadow-sm font-heading"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Clinical Modal
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("toast")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              previewMode === "toast"
                ? "bg-white text-[#0891B2] shadow-sm font-heading"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Toast Notification
          </button>
        </div>
      </div>

      {/* Grid of Simulation Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCENARIOS.map((sc) => {
          const IconComponent = sc.icon;
          const isRunning = runningId === sc.id;

          return (
            <div
              key={sc.id}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:bg-white hover:border-[#0891B2]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs ${sc.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.badgeColor}`}>
                      {sc.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                      HTTP {sc.expectedStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-heading font-black text-[#0F172A] leading-snug">
                    {sc.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isRunning}
                onClick={() => runSimulation(sc)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition-all shadow-xs hover:border-slate-300 disabled:opacity-60 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0891B2]" />
                    <span>Executing Simulation...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#0891B2]" />
                    <span>Trigger Scenario</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Real-Time Telemetry & Response Inspector */}
      {lastResponse && (
        <div className="mt-6 p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3 animate-in fade-in duration-200 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-sans">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white font-heading">
                Live Server Response Payload
              </span>
              {lastStatus && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    lastStatus < 400
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : lastStatus < 500
                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                      : "bg-rose-950 text-rose-300 border border-rose-800"
                  }`}
                >
                  HTTP {lastStatus}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-emerald-400">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
