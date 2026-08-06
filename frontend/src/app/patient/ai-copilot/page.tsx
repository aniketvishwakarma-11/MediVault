"use client";

import React, { useState } from "react";
import { 
  Bot, 
  Sparkles, 
  Send, 
  User, 
  ShieldCheck, 
  Paperclip, 
  AlertCircle, 
  RefreshCw,
  FileText,
  CheckCircle2,
  Copy,
  ThumbsUp
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  sources?: string[];
}

export default function PatientAICopilotPage() {
  const { user, userProfile } = useAuth();
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const displayName = userProfile?.displayName || user?.email?.split("@")[0] || "Patient";
  const userInitial = displayName.charAt(0).toUpperCase();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: `Hello ${displayName}! I am your MediVault AI Health Copilot. I can analyze your uploaded medical reports, explain lab values, check potential drug interactions, or clarify medical terminology. How can I assist your health today?`,
      timestamp: "10:30 AM",
    },
  ]);

  const quickPrompts = [
    "Explain my latest Lipid Panel report",
    "What are the normal ranges for HbA1c?",
    "Check drug interactions for Paracetamol and Amoxicillin",
    "Summarize my recent cardiology follow-up note",
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsTyping(true);

    // Simulate AI Copilot Response
    setTimeout(() => {
      let aiResponseText = "Based on your encrypted vault records and clinical knowledge base: ";
      if (query.toLowerCase().includes("lipid")) {
        aiResponseText += "Your HDL cholesterol is 58 mg/dL (optimal, >40 mg/dL target) and Triglycerides are 110 mg/dL (normal). Overall cardiovascular biomarker trends show positive improvement compared to last quarter.";
      } else if (query.toLowerCase().includes("hba1c")) {
        aiResponseText += "Normal HbA1c levels are below 5.7%. A level between 5.7% and 6.4% indicates prediabetes, while 6.5% or higher on two separate tests indicates diabetes.";
      } else if (query.toLowerCase().includes("paracetamol")) {
        aiResponseText += "Paracetamol (Acetaminophen) and Amoxicillin have no major adverse drug-drug interactions. Always take Amoxicillin as directed by your prescribing doctor to complete the antibiotic course.";
      } else {
        aiResponseText += "Your query has been analyzed against your vault records. Your vital signs, blood panels, and recent prescriptions indicate stable health parameters. Always consult your primary physician for specific clinical diagnosis.";
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ["Lipid_Panel_Report.pdf", "Prescription_Aug2026.pdf"],
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white shadow-md shadow-sky-600/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              AI Medical Copilot
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                RAG Engine Online
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Conversational assistant trained on clinical FHIR schemas & your encrypted vault records
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1"
          title="Reset Chat"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset Conversation</span>
        </button>
      </div>

      {/* Chat Messages Workspace */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6 overflow-y-auto space-y-4 flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs shrink-0 shadow-xs ${
                  msg.sender === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-gradient-to-tr from-sky-600 to-teal-500 text-white"
                }`}
              >
                {msg.sender === "user" ? userInitial : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Content Bubble */}
              <div className={`max-w-2xl space-y-2 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`p-4 rounded-3xl text-xs leading-relaxed inline-block ${
                    msg.sender === "user"
                      ? "bg-sky-600 text-white rounded-tr-xs"
                      : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Sources pill for AI responses */}
                {msg.sources && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-500">Document References:</span>
                    {msg.sources.map((src) => (
                      <span key={src} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                        {src}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-400">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-3 text-slate-400 text-xs animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span>AI Copilot is analyzing vault documents...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-3 border-t border-slate-100 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Questions:</span>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium border border-sky-200/80 transition-all text-left truncate max-w-xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about your lab tests, symptoms, or prescriptions..."
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                title="Attach Document Context"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="p-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white shadow-md shadow-sky-600/20 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-slate-400 text-center">
            🔒 Medical Disclaimer: AI Copilot provides informational summaries. Always consult a certified physician for medical diagnoses.
          </p>
        </div>
      </div>

    </div>
  );
}
