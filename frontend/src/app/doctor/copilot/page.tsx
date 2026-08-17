"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  UserRound,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Users,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsentedPatient {
  patient_id: string;
  user_id: string;
  full_name: string;
  blood_group: string | null;
  gender: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  consent_id: string;
  consent_granted_at: string;
}

interface CopilotMessage {
  id: string;
  sender: "doctor" | "assistant";
  text: string;
  sources?: string[];
  timestamp: string;
}

// ─── Quick prompts ────────────────────────────────────────────────────────────

const quickPrompts = [
  "Summarize this patient's medical history",
  "Check for drug interactions with current medications",
  "Show latest lab abnormalities",
  "What are the active diagnoses and conditions?",
  "List all allergies and critical alerts",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getAge(dob: string | null): string | null {
  if (!dob) return null;
  const age = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return isNaN(age) ? null : `${age}y`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const activeRole =
    (typeof window !== "undefined"
      ? localStorage.getItem("medivault_user_role")
      : null) || "doctor";

  return {
    "Content-Type": "application/json",
    "x-user-role": activeRole,
    "x-role": activeRole,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DoctorCopilotStudioPage() {
  const { loading: authLoading, userProfile } = useAuth();

  // Patients state — loaded from real API
  const [patients, setPatients] = useState<ConsentedPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  // Selected patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const selectedPatient =
    patients.find((p) => p.patient_id === selectedPatientId) || null;

  // Chat state
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [inputQuery, setInputQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Load consented patients from real API ───────────────────────────────

  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_BASE}/api/doctor/copilot/consented-patients`,
        { headers }
      );

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(
          errorJson.message || `Server returned status ${res.status}`
        );
      }

      const json = await res.json();
      const data: ConsentedPatient[] = json.data || json || [];
      setPatients(data);

      if (data.length > 0) {
        setSelectedPatientId((prev) => {
          const exists = data.some((p) => p.patient_id === prev);
          return exists ? prev : data[0].patient_id;
        });
      } else {
        setSelectedPatientId("");
      }
    } catch (err: any) {
      console.error("[DoctorCopilot] Failed to fetch consented patients:", err);
      setPatientsError(
        err.message ||
          "Could not load patients. Check your connection or re-login."
      );
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchPatients();
    }
  }, [authLoading, fetchPatients]);

  // ─── Reset chat when patient changes ────────────────────────────────────

  useEffect(() => {
    if (!selectedPatient) return;
    setSessionId(undefined);
    const age = getAge(selectedPatient.date_of_birth);
    const meta = [
      age,
      selectedPatient.gender,
      selectedPatient.blood_group,
    ]
      .filter(Boolean)
      .join(" · ");

    setMessages([
      {
        id: "msg-init",
        sender: "assistant",
        text: `Clinical context set to **${selectedPatient.full_name}**${meta ? ` (${meta})` : ""}.\n\nI have access to this patient's full medical history, lab results, medications, and reports. How can I assist with your clinical assessment today?`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  }, [selectedPatientId, selectedPatient]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // ─── Send message ────────────────────────────────────────────────────────

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || !selectedPatient || chatLoading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: "doctor",
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setChatLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/doctor/copilot/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          prompt: text,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Request failed (${res.status})`);
      }

      const json = await res.json();
      const data = json.data || json;

      // Persist session ID for conversation memory
      if (data.session?.id && !sessionId) {
        setSessionId(data.session.id);
      }

      const aiMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: data.message?.content || data.text || "Response received.",
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("[DoctorCopilot] Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ **Unable to process request.** ${err.message || "Please try again."}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Render: Loading state ───────────────────────────────────────────────

  if (authLoading || patientsLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#475569]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0891B2]" />
          <span className="text-sm font-medium">
            Loading consented patients from registry…
          </span>
        </div>
      </div>
    );
  }

  // ─── Render: No consented patients or Error ──────────────────────────────

  if (!patientsLoading && (patientsError || patients.length === 0)) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center gap-4 max-w-md text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-[#0F172A] text-lg mb-1">
              {patientsError ? "Connection Notice" : "No Consented Patients"}
            </h2>
            <p className="text-[#475569] text-sm leading-relaxed">
              {patientsError ||
                "You do not have active consent access for any patients yet. Patients who approve your access request will appear here automatically."}
            </p>
          </div>
          <button
            onClick={() => fetchPatients()}
            className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0891B2]" />
            <span>Patient consent is required before accessing any records</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Main copilot UI ─────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col font-body pb-6 animate-in fade-in duration-500">
      {/* ── Top Controls Bar ── */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-[#0F172A]">
              AI Clinical Copilot
            </h1>
            <p className="text-xs text-[#475569]">
              Grounded in patient EMR · Multi-model AI Engine
            </p>
          </div>
        </div>

        {/* Patient Selector — real patients only */}
        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-[#475569] font-bold whitespace-nowrap">
            Active Patient:
          </span>
          <div className="relative">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="pl-3.5 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0891B2] font-bold focus:border-[#0891B2] focus:outline-none min-h-[38px] cursor-pointer"
            >
              {patients.map((p) => {
                const age = getAge(p.date_of_birth);
                const label = [p.full_name, age, p.blood_group]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <option key={p.patient_id} value={p.patient_id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          {/* Consent badge */}
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap">
            <ShieldCheck className="w-3 h-3" />
            Consent Verified
          </span>
        </div>
      </div>

      {/* ── Messages Stream ── */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "doctor" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                msg.sender === "doctor"
                  ? "bg-[#0891B2] text-white"
                  : "bg-cyan-50 text-[#0891B2] border border-cyan-200"
              }`}
            >
              {msg.sender === "doctor" ? (
                <UserRound className="w-4 h-4" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs space-y-2 leading-relaxed ${
                msg.sender === "doctor"
                  ? "bg-cyan-50 border border-cyan-200/90 text-[#0F172A] rounded-tr-none font-medium"
                  : "bg-slate-50 border border-slate-200/80 text-[#0F172A] rounded-tl-none font-medium"
              }`}
            >
              {/* Render basic markdown bold */}
              <p className="whitespace-pre-wrap">
                {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </p>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-bold text-[#0891B2]">Sources:</span>
                  {msg.sources.map((src, idx) => (
                    <span
                      key={idx}
                      className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[#0F172A] font-mono"
                    >
                      📄 {src}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-[9px] text-slate-400 block text-right">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {chatLoading && (
          <div className="flex items-center gap-3 text-xs text-[#0891B2] font-bold animate-pulse pl-12">
            <Bot className="w-4 h-4" />
            <span>Analyzing EMR records · formulating clinical response…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Prompts Bar ── */}
      <div className="py-2.5 overflow-x-auto flex gap-2 text-xs shrink-0">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={chatLoading || !selectedPatient}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0891B2] text-[#475569] hover:text-[#0891B2] text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0891B2]" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* ── Input Form Bar ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-3 shrink-0 pt-1"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={
            selectedPatient
              ? `Ask about ${selectedPatient.full_name}'s history, lab trends, or drug interactions…`
              : "Select a patient to begin…"
          }
          disabled={!selectedPatient || chatLoading}
          className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/20 focus:outline-none placeholder:text-slate-400 shadow-xs min-h-[44px] disabled:bg-slate-50 disabled:cursor-not-allowed"
        />

        <button
          type="submit"
          disabled={chatLoading || !inputQuery.trim() || !selectedPatient}
          className="px-5 py-3 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px] transition-colors"
        >
          {chatLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
