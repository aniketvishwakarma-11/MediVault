"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Plus,
  FileText,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ChevronRight,
  Activity,
  AlertTriangle,
  Pill,
  Stethoscope,
  Heart,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Paperclip,
  CheckCircle2,
  FileSearch,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { DEMO_REPORTS } from "@/lib/demoData";

// ─── Types ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: string[];
  metadata: Record<string, any>;
  created_at: string;
}

interface ChatSession {
  id: string;
  patient_id: string;
  title: string;
  mode: "general" | "document";
  context_document_id: string | null;
  context_document_name: string | null;
  message_count: number;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

interface HealthInsights {
  totalDocuments: number;
  abnormalFindings: Array<{ name: string; value: string; status: string; reference_range?: string }>;
  activeMedications: Array<{ name: string; dosage: string; purpose: string }>;
  recentDiagnoses: string[];
  overallStatus: string;
}

interface PatientDocument {
  id: string;
  document_name: string;
  document_category: string;
  created_at: string;
  doctor_name?: string | null;
  hospital_name?: string | null;
  visit_date?: string | null;
}

// ─── API Helper ──────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {}

  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
}

// ─── Markdown Renderer (Lightweight) ─────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-900 text-green-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto my-2"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-[11px] font-mono">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-bold text-slate-800 text-xs mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-slate-800 text-sm mt-3 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-extrabold text-slate-900 text-sm mt-3 mb-1">$1</h2>')
    // Unordered lists
    .replace(/^[-•] (.+)$/gm, '<li class="ml-4 list-disc text-xs leading-relaxed">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-1.5 space-y-0.5">$&</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-xs leading-relaxed">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ─── Inner Copilot Content (with Search Params) ───────────────────────

function CopilotContent() {
  const { user, userProfile, isDemo } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlDocId = searchParams.get("docId");
  const urlDocName = searchParams.get("docName");

  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>([]);
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const [focusedDoc, setFocusedDoc] = useState<{ id: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [loadingInit, setLoadingInit] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = isDemo
    ? "Demo Patient"
    : userProfile?.displayName || (user?.email ? user.email.split("@")[0] : "Patient");
  const userInitial = displayName.charAt(0).toUpperCase();
  const patientId = (userProfile as any)?.uid || user?.id || "a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d";

  // ─── Initial Data Load ────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoadingInit(true);
      try {
        const [sessionsData, insightsData, suggestionsData, docsData] = await Promise.allSettled([
          api<ChatSession[]>(`/copilot/sessions?patient_id=${patientId}`),
          api<HealthInsights>(`/copilot/insights?patient_id=${patientId}`),
          api<string[]>(`/copilot/suggestions?patient_id=${patientId}`),
          api<any>(`/documents/search?limit=100`),
        ]);
        if (sessionsData.status === "fulfilled" && sessionsData.value) {
          setSessions(sessionsData.value);
        }
        if (insightsData.status === "fulfilled" && insightsData.value) {
          setInsights(insightsData.value);
        } else {
          setInsights({
            totalDocuments: 4,
            overallStatus: "STABLE",
            recentDiagnoses: ["Optimal Lipid Profile", "Mild Intermittent Asthma"],
            activeMedications: [{ name: "Albuterol Inhaler", dosage: "100 mcg", purpose: "Asthma management" }],
            abnormalFindings: [],
          });
        }
        if (suggestionsData.status === "fulfilled" && suggestionsData.value) {
          setSuggestions(suggestionsData.value);
        }

        let docsList: PatientDocument[] = [];
        if (docsData.status === "fulfilled" && docsData.value) {
          const rawDocs = docsData.value?.documents || docsData.value?.data || (Array.isArray(docsData.value) ? docsData.value : []);
          docsList = Array.isArray(rawDocs) ? rawDocs : [];
        }

        if (docsList.length === 0 || isDemo) {
          docsList = DEMO_REPORTS.map((d) => ({
            id: d.id,
            document_name: d.document_name,
            document_category: d.document_category,
            created_at: d.created_at,
            doctor_name: d.doctor_name,
            hospital_name: d.hospital_name,
            visit_date: d.visit_date,
          }));
        }
        setPatientDocuments(docsList);
      } catch {
        // Fallback demo documents & suggestions
        const demoList = DEMO_REPORTS.map((d) => ({
          id: d.id,
          document_name: d.document_name,
          document_category: d.document_category,
          created_at: d.created_at,
          doctor_name: d.doctor_name,
          hospital_name: d.hospital_name,
          visit_date: d.visit_date,
        }));
        setPatientDocuments(demoList);
        setSuggestions([
          "Summarize my overall health",
          "Explain my latest lab results",
          "What medications am I currently taking?",
          "Do I have any follow-up tests pending?",
        ]);
        setInsights({
          totalDocuments: 4,
          overallStatus: "STABLE",
          recentDiagnoses: ["Optimal Lipid Profile", "Mild Intermittent Asthma"],
          activeMedications: [{ name: "Albuterol Inhaler", dosage: "100 mcg", purpose: "Asthma management" }],
          abnormalFindings: [],
        });
      }
      setLoadingInit(false);
    }
    init();
  }, [patientId, isDemo]);

  // ─── Handle URL Document Context ───────────────────────────────────

  useEffect(() => {
    if (urlDocId && urlDocName) {
      setFocusedDoc({ id: urlDocId, name: decodeURIComponent(urlDocName) });
      setActiveSession(null);
      setMessages([]);
      setSuggestions([
        `Explain the key findings in ${decodeURIComponent(urlDocName)}`,
        `Are there any abnormal values or flags in this report?`,
        `What medications or dosages are mentioned?`,
        `What are the recommended next steps or follow-ups?`,
      ]);
    }
  }, [urlDocId, urlDocName]);

  // ─── Scroll to bottom on new messages ──────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ─── Load Session Messages ─────────────────────────────────────────

  const loadSession = useCallback(async (session: ChatSession) => {
    setActiveSession(session);
    if (session.context_document_id && session.context_document_name) {
      setFocusedDoc({ id: session.context_document_id, name: session.context_document_name });
    } else {
      setFocusedDoc(null);
    }
    try {
      const data = await api<{ session: ChatSession; messages: ChatMessage[] }>(`/copilot/sessions/${session.id}`);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  // ─── New Chat (General Mode) ───────────────────────────────────────

  const startNewChat = useCallback(() => {
    setActiveSession(null);
    setFocusedDoc(null);
    setMessages([]);
    setInputQuery("");
    // Clear URL search params
    if (urlDocId) {
      router.push("/patient/ai-copilot");
    }
    inputRef.current?.focus();
  }, [router, urlDocId]);

  // ─── Start Document-Focused Chat ───────────────────────────────────

  const startDocumentChat = useCallback((doc: PatientDocument) => {
    setFocusedDoc({ id: doc.id, name: doc.document_name });
    setActiveSession(null);
    setMessages([]);
    setIsDocPickerOpen(false);
    setInputQuery("");
    setSuggestions([
      `Explain the key findings in ${doc.document_name}`,
      `Are there any abnormal values or flags in this report?`,
      `What medications or treatments are prescribed?`,
      `Summarize the doctor's recommendations`,
    ]);
    inputRef.current?.focus();
  }, []);

  // ─── Send Message ──────────────────────────────────────────────────

  const handleSend = useCallback(async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isTyping) return;

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-usr-${Date.now()}`,
      role: "user",
      content: query,
      sources: [],
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuery("");
    setIsTyping(true);

    try {
      const docId = focusedDoc?.id || activeSession?.context_document_id;
      const body: any = { prompt: query, patient_id: patientId };
      if (activeSession?.id) body.session_id = activeSession.id;
      if (docId) body.document_id = docId;

      const endpoint = docId ? `/copilot/chat/document/${docId}` : "/copilot/chat";

      const result = await api<{
        message: ChatMessage;
        session: ChatSession;
        sources: string[];
        suggestedFollowUps: string[];
      }>(endpoint, { method: "POST", body: JSON.stringify(body) });

      // Replace temp message with real user msg + add AI response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        const userMsg: ChatMessage = {
          id: `usr-${Date.now()}`,
          role: "user",
          content: query,
          sources: [],
          metadata: {},
          created_at: new Date().toISOString(),
        };
        return [...withoutTemp, userMsg, result.message];
      });

      // Update session
      if (result.session) {
        setActiveSession(result.session);
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === result.session.id);
          if (exists) {
            return prev.map((s) => (s.id === result.session.id ? result.session : s));
          }
          return [result.session, ...prev];
        });
      }

      // Update suggestions
      if (result.suggestedFollowUps?.length > 0) {
        setSuggestions(result.suggestedFollowUps);
      }
    } catch (err: any) {
      // Fallback response if backend is unavailable
      const fallbackMsg: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        role: "assistant",
        content: `I'm currently unable to reach the AI engine. Please check that the backend server is running at ${API_URL}.\n\n**Details:** ${err.message || "Connection failed"}`,
        sources: [],
        metadata: { error: true },
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [inputQuery, isTyping, patientId, activeSession, focusedDoc]);

  // ─── Delete Session ────────────────────────────────────────────────

  const deleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api(`/copilot/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        startNewChat();
      }
    } catch { /* silent */ }
  }, [activeSession, startNewChat]);

  // ─── Copy Message ──────────────────────────────────────────────────

  const copyMessage = useCallback((text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────

  const formatTime = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return "Today";
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const isDocumentMode = Boolean(focusedDoc || activeSession?.mode === "document");
  const currentDocName = focusedDoc?.name || activeSession?.context_document_name;

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-3 animate-in fade-in duration-500 relative">

      {/* ═══ LEFT SIDEBAR — Sessions ═══ */}
      {sidebarOpen && (
        <div className="w-72 shrink-0 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Conversations</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={startNewChat}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all active:scale-[0.97] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
              <button
                onClick={() => setIsDocPickerOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold transition-all active:scale-[0.97] cursor-pointer"
                title="Select a specific medical document to chat about"
              >
                <FileSearch className="w-3.5 h-3.5" />
                Doc Chat
              </button>
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && !loadingInit && (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No conversations yet</p>
                <p className="text-[10px] text-slate-300 mt-1">Start a new chat to begin</p>
              </div>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session)}
                className={`w-full text-left p-3 rounded-2xl transition-all group cursor-pointer ${
                  activeSession?.id === session.id
                    ? "bg-sky-50 border border-sky-200/80 shadow-xs"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {session.mode === "document" ? (
                        <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : (
                        <MessageSquare className="w-3 h-3 text-sky-500 shrink-0" />
                      )}
                      <p className="text-xs font-semibold text-slate-800 truncate">{session.title}</p>
                    </div>
                    {session.last_message_preview && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 ml-[18px]">
                        {session.last_message_preview}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-300 mt-0.5 ml-[18px]">{formatDate(session.updated_at)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CENTER — Chat Area ═══ */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden min-w-0">

        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors mr-1 cursor-pointer"
                title="Show sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white shadow-md shadow-sky-600/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2 truncate">
                <span className="truncate">
                  {isDocumentMode ? `Chat with: ${currentDocName || "Document"}` : "AI Health Copilot"}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  isDocumentMode
                    ? "text-amber-800 bg-amber-50 border-amber-300"
                    : "text-teal-700 bg-teal-50 border-teal-200"
                }`}>
                  {isDocumentMode ? "Document-Focused Mode" : "RAG Active"}
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 truncate">
                {isDocumentMode
                  ? "Answers are strictly grounded in this document's text & clinical findings"
                  : "Gemini + NVIDIA NIM • Powered by your encrypted medical records"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsDocPickerOpen(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pick a document to chat about"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Attach Doc</span>
            </button>
            <button
              onClick={() => setInsightsOpen(!insightsOpen)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                insightsOpen
                  ? "border-sky-200 text-sky-600 bg-sky-50"
                  : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
              title="Toggle insights panel"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Insights</span>
            </button>
            <button
              onClick={startNewChat}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="New conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Focused Document Active Banner */}
        {isDocumentMode && (
          <div className="px-5 py-2 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                Focused on: <strong className="font-bold">{currentDocName}</strong>
              </span>
            </div>
            <button
              onClick={startNewChat}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer ml-3"
            >
              Switch to All Records (General Mode)
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Welcome State */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl mb-4 ${
                isDocumentMode
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20"
                  : "bg-gradient-to-tr from-sky-600 to-teal-500 shadow-sky-600/20"
              }`}>
                {isDocumentMode ? <FileText className="w-8 h-8 text-white" /> : <Bot className="w-8 h-8 text-white" />}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                {isDocumentMode ? `Chatting about ${currentDocName}` : `Hello, ${displayName}!`}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                {isDocumentMode
                  ? "Ask any question about this document. The AI will explain clinical terms, flag abnormal values, and summarize findings."
                  : "I'm your MediVault AI Health Copilot. I have access to your medical records and can explain lab results, review prescriptions, check drug interactions, and answer health questions."}
              </p>

              {/* Suggestion Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-700 group-hover:text-sky-700 leading-snug">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Thread */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-2xl font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white"
                    : isDocumentMode
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
                    : "bg-gradient-to-tr from-sky-600 to-teal-500 text-white"
                }`}
              >
                {msg.role === "user" ? userInitial : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl space-y-1.5 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`px-4 py-3 rounded-3xl text-xs leading-relaxed inline-block ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-tr-lg"
                      : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-lg shadow-xs"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div
                      className="prose-sm max-w-none [&_strong]:text-slate-900 [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_li]:text-xs [&_code]:text-[10px]"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}
                </div>

                {/* Sources */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Sources:</span>
                    {msg.sources.map((src) => (
                      <span
                        key={src}
                        className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[9px] font-medium border border-sky-200/80"
                      >
                        <FileText className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                        {src}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-300">{formatTime(msg.created_at)}</span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {msg.metadata?.provider && (
                    <span className="text-[8px] text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">
                      via {msg.metadata.provider}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-3xl rounded-tl-lg bg-slate-50 border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isDocumentMode ? "Analyzing document content..." : "Analyzing your medical records..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Follow-up Suggestions (shown after messages exist) */}
        {messages.length > 0 && !isTyping && suggestions.length > 0 && (
          <div className="px-5 pb-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-sky-400" />
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 text-[10px] font-medium border border-slate-200 hover:border-sky-300 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="px-5 pb-4 pt-2 border-t border-slate-100 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  isDocumentMode
                    ? `Ask about ${currentDocName || "this document"}...`
                    : "Ask about your health, lab results, medications..."
                }
                disabled={isTyping}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setIsDocPickerOpen(true)}
                className="absolute right-3 top-3 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                title="Select a specific document to focus chat"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="p-3 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-500 hover:shadow-lg hover:shadow-sky-600/25 disabled:opacity-40 text-white shadow-md shadow-sky-600/20 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-[9px] text-slate-400 text-center mt-2">
            🔒 AI Copilot uses your encrypted vault records. Always consult your physician for clinical diagnosis.
          </p>
        </div>
      </div>

      {/* ═══ RIGHT SIDEBAR — Health Insights ═══ */}
      {insightsOpen && (
        <div className="w-72 shrink-0 flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hidden lg:flex">
          {/* Insights Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-500" />
                Health Insights
              </h2>
              <button
                onClick={() => setInsightsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Overall Status */}
            <div
              className={`p-3 rounded-2xl border ${
                insights?.overallStatus === "CRITICAL"
                  ? "bg-red-50 border-red-200"
                  : insights?.overallStatus === "ATTENTION_REQUIRED"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Heart
                  className={`w-4 h-4 ${
                    insights?.overallStatus === "CRITICAL"
                      ? "text-red-500"
                      : insights?.overallStatus === "ATTENTION_REQUIRED"
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Overall Status
                </span>
              </div>
              <p
                className={`text-xs font-extrabold ${
                  insights?.overallStatus === "CRITICAL"
                    ? "text-red-700"
                    : insights?.overallStatus === "ATTENTION_REQUIRED"
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {insights?.overallStatus?.replace(/_/g, " ") || "STABLE"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {insights?.totalDocuments || 0} documents analyzed
              </p>
            </div>

            {/* Abnormal Findings */}
            {insights?.abnormalFindings && insights.abnormalFindings.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Flagged Values</span>
                </div>
                <div className="space-y-1.5">
                  {insights.abnormalFindings.slice(0, 5).map((f, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-700">{f.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            f.status === "critical"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {f.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{f.value}</p>
                      <button
                        onClick={() => handleSend(`Why is my ${f.name} ${f.status}?`)}
                        className="text-[9px] text-sky-600 font-medium mt-1 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        Ask about this <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Medications */}
            {insights?.activeMedications && insights.activeMedications.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Pill className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Medications</span>
                </div>
                <div className="space-y-1.5">
                  {insights.activeMedications.slice(0, 5).map((m, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-violet-50/50 border border-violet-100">
                      <p className="text-[10px] font-semibold text-slate-700">{m.name}</p>
                      {m.dosage && <p className="text-[9px] text-slate-500">{m.dosage}</p>}
                      {m.purpose && <p className="text-[9px] text-violet-600">{m.purpose}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Diagnoses */}
            {insights?.recentDiagnoses && insights.recentDiagnoses.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-500" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Diagnoses</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {insights.recentDiagnoses.slice(0, 6).map((d, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[9px] font-medium border border-sky-200"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* No Data State */}
            {!insights && (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Upload medical documents to see health insights</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ DOCUMENT PICKER MODAL ═══ */}
      {isDocPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Document to Chat</h3>
                  <p className="text-[11px] text-slate-400">AI will ground all answers in this specific document</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocPickerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {patientDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">No documents found in your vault</p>
                  <p className="text-[10px] text-slate-400 mt-1">Upload records in the Medical Records section first</p>
                </div>
              ) : (
                patientDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => startDocumentChat(doc)}
                    className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-sky-100 text-slate-600 group-hover:text-sky-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-700">
                          {doc.document_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {doc.document_category} • {doc.visit_date || formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 shrink-0 ml-2" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function PatientAICopilotPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    }>
      <CopilotContent />
    </Suspense>
  );
}
