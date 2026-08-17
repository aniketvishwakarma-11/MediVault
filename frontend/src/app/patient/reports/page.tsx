"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Building2, 
  UserCheck, 
  Hash, 
  RefreshCw,
  Lock,
  Grid,
  List,
  Eye,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { DEMO_REPORTS } from "@/lib/demoData";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";

interface DocumentRecord {
  id: string;
  patient_id: string;
  document_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  document_category: string;
  hospital_name?: string | null;
  doctor_name?: string | null;
  visit_date?: string | null;
  checksum_sha256: string;
  created_at: string;
  signedDownloadUrl?: string;
  metadata_json?: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MedicalReportsPage() {
  const { user, isDemo } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Document Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);
  const [viewerSignedUrl, setViewerSignedUrl] = useState<string | null>(null);
  const [viewerAiAnalysis, setViewerAiAnalysis] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState<boolean>(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [doctorFilter, setDoctorFilter] = useState<string>("");

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("Blood Report");
  const [documentName, setDocumentName] = useState<string>("");
  const [hospitalName, setHospitalName] = useState<string>("");
  const [doctorName, setDoctorName] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>("");
  const [patientIdInput, setPatientIdInput] = useState<string>("a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d");

  useEffect(() => {
    fetchCategories();
    fetchDocuments();
  }, [user, isDemo, searchQuery, selectedCategory, doctorFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/documents/categories`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.categories) {
          setCategories(data.data.categories);
          return;
        }
      }
    } catch (err) {
      console.warn("Category fetch warning:", err);
    }
    setCategories([
      "Prescription", "Blood Report", "MRI", "CT Scan", "X-Ray", 
      "ECG", "Discharge Summary", "Insurance", "Vaccination", "Other"
    ]);
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);

    // IF DEMO USER: Return rich sample documents
    if (isDemo) {
      let filtered = [...(DEMO_REPORTS as DocumentRecord[])];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.document_name.toLowerCase().includes(q) ||
            d.doctor_name?.toLowerCase().includes(q) ||
            d.hospital_name?.toLowerCase().includes(q)
        );
      }
      if (selectedCategory) {
        filtered = filtered.filter((d) => d.document_category === selectedCategory);
      }
      setDocuments(filtered);
      setIsLoading(false);
      return;
    }

    // Helper to get JWT auth header
    const getAuthHeaders = async (): Promise<Record<string, string>> => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      } catch (e) {}
      return {};
    };

    // IF REAL USER: Fetch STRICTLY real documents from backend API
    try {
      const queryParams = new URLSearchParams();
      if (user?.id) queryParams.append("patient_id", user.id);
      if (searchQuery) queryParams.append("search_query", searchQuery);
      if (selectedCategory) queryParams.append("document_category", selectedCategory);
      if (doctorFilter) queryParams.append("doctor_name", doctorFilter);

      const authHeaders = await getAuthHeaders();
      let res = await fetch(`${API_BASE_URL}/documents/search?${queryParams.toString()}`, {
        headers: authHeaders,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setDocuments([]);
          return;
        }
        throw new Error(`Server returned HTTP status ${res.status}`);
      }
      let data = await res.json();

      if (data.success && Array.isArray(data.data) && data.data.length === 0 && !searchQuery && !selectedCategory) {
        const fallbackRes = await fetch(`${API_BASE_URL}/documents/search?limit=100`, { headers: authHeaders });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.success && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
            data = fallbackData;
          }
        }
      }

      if (data.success) {
        setDocuments(data.data || []);
      } else {
        setDocuments([]);
      }
    } catch (err: any) {
      console.warn("Fetch documents error:", err);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const finalDocName = documentName.trim() || uploadFile.name;
      const validPatientId = (user?.id && user.id.length === 36) ? user.id : patientIdInput || "a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d";

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("patient_id", validPatientId);
      formData.append("document_category", uploadCategory || "Other");
      formData.append("document_name", finalDocName);
      if (hospitalName.trim()) formData.append("hospital_name", hospitalName.trim());
      if (doctorName.trim()) formData.append("doctor_name", doctorName.trim());
      if (visitDate.trim()) formData.append("visit_date", visitDate.trim());

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Document upload failed");
      }

      setSuccessMsg("Document encrypted and uploaded successfully!");
      setIsUploadModalOpen(false);
      // Reset form
      setUploadFile(null);
      setDocumentName("");
      setHospitalName("");
      setDoctorName("");
      setVisitDate("");
      
      // Refresh documents
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document from your vault?")) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Document removed from vault.");
        fetchDocuments();
      } else {
        throw new Error(data.message || "Failed to delete document");
      }
    } catch (err: any) {
      setError(err.message || "Could not delete document.");
    }
  };

  const handleViewDoc = async (doc: DocumentRecord) => {
    setViewerDoc(doc);
    const directFileUrl = `${API_BASE_URL}/documents/${doc.id}/file`;
    setViewerSignedUrl(doc.signedDownloadUrl || directFileUrl);
    setViewerAiAnalysis((doc as any).metadata_json?.ai_analysis || null);
    setViewerLoading(true);
    setViewerError(null);
    setIsViewerOpen(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${doc.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setViewerSignedUrl(data.data?.signedDownloadUrl || directFileUrl);
          const fetchedAi = data.data?.ai_analysis || data.data?.document?.metadata_json?.ai_analysis;
          if (fetchedAi) {
            setViewerAiAnalysis(fetchedAi);
            setDocuments((prevDocs) =>
              prevDocs.map((d) =>
                d.id === doc.id
                  ? { ...d, metadata_json: { ...(d.metadata_json || {}), ai_analysis: fetchedAi } }
                  : d
              )
            );
          }
        }
      }
    } catch (err: any) {
      console.warn("Doc preview fetch note:", err);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${doc.id}`, { headers });
      if (!res.ok) throw new Error("Failed to generate download URL");
      const data = await res.json();

      if (data.success && data.data?.signedDownloadUrl) {
        window.open(data.data.signedDownloadUrl, "_blank");
      } else {
        throw new Error("Download URL not provided by server");
      }
    } catch (err: any) {
      setError("Unable to download document. " + err.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-sky-600" />
            Medical Records Vault
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Zero-knowledge encrypted documents pinned to IPFS decentralized storage
          </p>
        </div>

        <button
          onClick={() => {
            setVisitDate(new Date().toISOString().split("T")[0]);
            setIsUploadModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Medical Record</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDocuments} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 text-[11px] flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Category Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by document name, doctor, or hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white text-sky-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-sky-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              selectedCategory === ""
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            All Records
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid / List Output */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-semibold animate-pulse">
          Retrieving encrypted documents from vault...
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="p-4 rounded-2xl bg-sky-50 text-sky-600 w-16 h-16 mx-auto flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No medical records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don&apos;t have any documents matching this criteria. Click below to add your first record.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => {
              const ai = doc.metadata_json?.ai_analysis;
              const labResults = ai?.lab_results || [];
              const abnormalLabs = labResults.filter((l: any) => l.status && l.status !== "NORMAL");
              const hasAbnormal = abnormalLabs.length > 0;
              const cardDoctorName = doc.doctor_name || ai?.doctor?.name || "Attending Physician";
              const cardHospitalName = doc.hospital_name || ai?.hospital?.name || "Verified Facility";

              return (
                <div
                  key={doc.id}
                  className="h-[340px] bg-white rounded-xl border border-slate-200 shadow-xs hover:border-sky-300 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Top Header Section */}
                  <div className="p-4 pb-2 space-y-2">
                    {/* Category badge + File size */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {doc.document_category || "General Record"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {formatBytes(doc.file_size)}
                      </span>
                    </div>

                    {/* Document Title */}
                    <h3 className="font-heading font-bold text-slate-900 text-sm truncate" title={doc.document_name || doc.original_filename}>
                      {doc.document_name || doc.original_filename}
                    </h3>

                    {/* Physician & Facility Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate text-slate-700 font-medium">{cardDoctorName}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate text-[11px] text-slate-400 shrink-0 max-w-[120px]">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{cardHospitalName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fixed-Height Biomarkers Box (Strict White & Blue) */}
                  <div className="px-4 py-1 flex-1 flex flex-col justify-center">
                    <div className="h-[125px] rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex flex-col justify-between">
                      {hasAbnormal ? (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-sky-600" />
                              Clinical Findings
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-mono font-semibold">
                              {abnormalLabs.length} Flagged
                            </span>
                          </div>
                          <div className="space-y-1">
                            {abnormalLabs.slice(0, 2).map((lab: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between px-2 py-1 rounded bg-white border border-slate-200/80 text-[11px]"
                              >
                                <span className="font-medium text-slate-800 truncate max-w-[150px]">
                                  {lab.test_name || lab.name}
                                </span>
                                <span className="font-mono font-semibold text-sky-700 shrink-0">
                                  {lab.value} {lab.unit || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono text-right">
                            {abnormalLabs.length > 2 ? `+${abnormalLabs.length - 2} more markers` : "AI Analysis Verified"}
                          </div>
                        </>
                      ) : labResults.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                              Clinical Findings
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold">
                              Optimal
                            </span>
                          </div>
                          <div className="space-y-1">
                            {labResults.slice(0, 2).map((lab: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between px-2 py-1 rounded bg-white border border-slate-200/80 text-[11px]"
                              >
                                <span className="font-medium text-slate-800 truncate max-w-[150px]">
                                  {lab.test_name || lab.name}
                                </span>
                                <span className="font-mono font-semibold text-sky-700 shrink-0">
                                  {lab.value} {lab.unit || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono text-right">
                            All values within normal range
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-sky-600" />
                              Encrypted Document
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold">
                              IPFS Vault
                            </span>
                          </div>
                          <div className="px-2 py-2 rounded bg-white border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Security:</span>
                              <span className="font-mono font-semibold text-sky-700">AES-256 GCM</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Storage:</span>
                              <span className="font-mono text-slate-500">Decentralized</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono text-right">
                            Ready for clinical review
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Bar (White & Blue) */}
                  <div className="p-4 pt-2 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleViewDoc(doc)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <a
                      href={`/patient/ai-copilot?docId=${doc.id}&docName=${encodeURIComponent(doc.document_name)}`}
                      className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Chat with this document in AI Copilot"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>Chat</span>
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Delete Record"
                      aria-label="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

        </div>
      ) : (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-3 px-3">Document Name</th>
                <th className="pb-3 px-3">Category</th>
                <th className="pb-3 px-3">Physician / Facility</th>
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Size</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>{doc.document_name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium text-[11px] border border-sky-200">
                      {doc.document_category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {doc.doctor_name || doc.hospital_name || "—"}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono tabular-nums">
                    {doc.visit_date || "—"}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 tabular-nums">
                    {formatBytes(doc.file_size)}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleViewDoc(doc)}
                      className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <a
                      href={`/patient/ai-copilot?docId=${doc.id}&docName=${encodeURIComponent(doc.document_name)}`}
                      className="px-2.5 py-1.5 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-medium inline-flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                      title="Chat with AI Copilot"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Chat
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white cursor-pointer transition-colors"
                      title="Delete Record"
                      aria-label="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal Dialog */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                  <Upload className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">Upload Encrypted Record</h2>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Medical Document File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-3 border border-dashed border-sky-300 bg-sky-50/50 rounded-2xl text-slate-700 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Blood Panel"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Doctor Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Sarah Jenkins"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Report / Visit Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold shadow-md shadow-sky-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <span>Encrypting & Uploading to IPFS...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Encrypt & Store in Vault</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* High-Res Document Viewer Modal with Backdrop Blur */}
      {viewerDoc && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          documentId={viewerDoc.id}
          documentName={viewerDoc.document_name}
          originalFilename={viewerDoc.original_filename}
          documentCategory={viewerDoc.document_category}
          mimeType={viewerDoc.mime_type}
          signedUrl={viewerSignedUrl}
          fileSize={viewerDoc.file_size}
          visitDate={viewerDoc.visit_date || undefined}
          doctorName={viewerDoc.doctor_name || undefined}
          hospitalName={viewerDoc.hospital_name || undefined}
          checksumSha256={viewerDoc.checksum_sha256}
          aiAnalysis={viewerAiAnalysis}
          isLoading={viewerLoading}
          error={viewerError}
          onDownload={() => handleDownload(viewerDoc)}
          onAnalysisUpdated={(newAnalysis) => {
            setViewerAiAnalysis(newAnalysis);
            setDocuments((prevDocs) =>
              prevDocs.map((d) =>
                d.id === viewerDoc.id
                  ? { ...d, metadata_json: { ...(d.metadata_json || {}), ai_analysis: newAnalysis } }
                  : d
              )
            );
          }}
        />
      )}

    </div>
  );
}
