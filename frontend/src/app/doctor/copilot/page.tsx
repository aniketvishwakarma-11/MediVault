"use client";

import React, { useState } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Search,
  FileText,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { mockDoctorPatients } from "@/lib/doctorDemoData";

interface CopilotMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  sources?: string[];
  timestamp: string;
}

const quickPrompts = [
  "Summarize diabetes & glucose history",
  "Check for drug interactions with Metformin",
  "Show latest CBC lab abnormalities",
  "Has Hemoglobin improved over last 3 months?",
  "List active allergies and critical alerts",
];

export default function DoctorCopilotStudioPage() {
  const [selectedPatientId, setSelectedPatientId] = useState("pat-1001");
  const selectedPatient = mockDoctorPatients.find((p) => p.id === selectedPatientId) || mockDoctorPatients[0];

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "msg-1",
      sender: "copilot",
      text: `Hello Dr. Sarah Jenkins. I am your MediVault AI Clinical Copilot. Active context set to patient: **${selectedPatient.fullName} (${selectedPatient.uhid})**. How can I assist your clinical analysis today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSendMessage = async (queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim()) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/doctor/copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          prompt: text,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const copilotMsg: CopilotMessage = {
          id: `cop-${Date.now()}`,
          sender: "copilot",
          text: json.data?.text || json.message || "RAG query processed.",
          sources: json.data?.sources || ["CBC_Report_Aug2026.pdf", "Prescription_Rx77201.pdf"],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, copilotMsg]);
      } else {
        throw new Error("Failed to reach API");
      }
    } catch (err) {
      setTimeout(() => {
        let responseText = `Based on encrypted vault records for **${selectedPatient.fullName}**:\n\n`;

        if (text.toLowerCase().includes("diabetes") || text.toLowerCase().includes("glucose")) {
          responseText += `• Patient has a history of Type 2 Diabetes Mellitus.\n• Fasting Blood Glucose registered at **108 mg/dL** (Slight elevation above normal 99 mg/dL).\n• Currently maintained on **Metformin 500mg (TID)**.\n• HbA1c panel recommended for follow-up.`;
        } else if (text.toLowerCase().includes("allergy") || text.toLowerCase().includes("alert")) {
          responseText += `• **Critical Flag**: Penicillin allergy recorded (High anaphylaxis risk).\n• Peanuts sensitivity logged.\n• No recorded adverse reactions with current cardiovascular medications.`;
        } else if (text.toLowerCase().includes("cbc") || text.toLowerCase().includes("hemoglobin") || text.toLowerCase().includes("abnormal")) {
          responseText += `• **Hemoglobin**: 10.2 g/dL (Below reference range of 13.5 - 17.5 g/dL).\n• Diagnosis: Mild Iron Deficiency Anemia.\n• Ferrous Sulfate 325mg supplementation initiated.`;
        } else {
          responseText += `Patient **${selectedPatient.fullName}** is 36 yrs old, blood group **O+**, with diagnosed Type 2 Diabetes and Mild Anemia. Active medications: Metformin 500mg, Lisinopril 10mg, Ferrous Sulfate 325mg.`;
        }

        const copilotMsg: CopilotMessage = {
          id: `cop-${Date.now()}`,
          sender: "copilot",
          text: responseText,
          sources: ["CBC_Report_Aug2026.pdf", "Consultation_Note_Aug1.pdf"],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, copilotMsg]);
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col font-body pb-6 animate-in fade-in duration-500">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-[#0F172A]">AI Medical Copilot RAG Studio</h1>
            <p className="text-xs text-[#475569]">Contextual query engine powered by Google Gemini 1.5 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569] font-bold">Active Patient:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0891B2] font-bold focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            {mockDoctorPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.uhid})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                msg.sender === "user"
                  ? "bg-[#0891B2] text-white"
                  : "bg-cyan-50 text-[#0891B2] border border-cyan-200"
              }`}
            >
              {msg.sender === "user" ? "DR" : <Bot className="w-5 h-5" />}
            </div>

            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs space-y-2 leading-relaxed ${
                msg.sender === "user"
                  ? "bg-cyan-50 border border-cyan-200/90 text-[#0F172A] rounded-tr-none font-medium"
                  : "bg-slate-50 border border-slate-200/80 text-[#0F172A] rounded-tl-none font-medium"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-bold text-[#0891B2]">RAG Sources:</span>
                  {msg.sources.map((src, idx) => (
                    <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[#0F172A] font-mono">
                      📄 {src}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-[9px] text-slate-400 block text-right">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-xs text-[#0891B2] font-bold animate-pulse">
            <Bot className="w-5 h-5 animate-spin-slow text-[#0891B2]" />
            <span>Analyzing EHR documents & formulating clinical answer...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="py-2.5 overflow-x-auto flex gap-2 text-xs shrink-0">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0891B2] text-[#475569] hover:text-[#0891B2] text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0891B2]" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-3 shrink-0 pt-1"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={`Ask AI Copilot about ${selectedPatient.fullName}'s history, lab trends, or drug interactions...`}
          className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/20 focus:outline-none placeholder:text-slate-400 shadow-xs min-h-[44px]"
        />

        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="px-5 py-3 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
