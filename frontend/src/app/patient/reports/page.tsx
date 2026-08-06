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
  Sparkles
} from "lucide-react";

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
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MedicalReportsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
  }, []);

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
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search_query", searchQuery);
      if (selectedCategory) queryParams.append("document_category", selectedCategory);
      if (doctorFilter) queryParams.append("doctor_name", doctorFilter);

      const res = await fetch(`${API_BASE_URL}/documents/search?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP status ${res.status}`);
      }
      const data = await res.json();

      if (data.success) {
        setDocuments(data.data || []);
      } else {
        throw new Error(data.message || "Failed to search documents");
      }
    } catch (err: any) {
      console.warn("Fetch documents error:", err);
      setError("Backend server connection status: offline or initializing. Make sure backend is running on http://localhost:5000");
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
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("patient_id", patientIdInput);
      formData.append("document_category", uploadCategory);
      if (documentName) formData.append("document_name", documentName);
      if (hospitalName) formData.append("hospital_name", hospitalName);
      if (doctorName) formData.append("doctor_name", doctorName);
      if (visitDate) formData.append("visit_date", visitDate);

      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Document upload failed");
      }

      setSuccessMsg("Document encrypted and uploaded to IPFS successfully!");
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
      const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        method: "DELETE",
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

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${doc.id}`);
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
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Medical Record</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDocuments} className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 text-[11px] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Category Controls Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by document name, doctor, or hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl text-xs ${viewMode === "grid" ? "bg-white text-sky-600 shadow-xs font-bold" : "text-slate-500"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-xl text-xs ${viewMode === "list" ? "bg-white text-sky-600 shadow-xs font-bold" : "text-slate-500"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedCategory === ""
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Records
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
                    {doc.document_category || "General"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {formatBytes(doc.file_size)}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                  {doc.document_name || doc.original_filename}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-500">
                  {doc.doctor_name && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.doctor_name}</span>
                    </div>
                  )}
                  {doc.hospital_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.hospital_name}</span>
                    </div>
                  )}
                  {doc.visit_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{doc.visit_date}</span>
                    </div>
                  )}
                </div>

                {/* Checksum Hash */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1 truncate">
                    <Lock className="w-3 h-3 text-teal-600 shrink-0" />
                    <span className="truncate">{doc.checksum_sha256 || doc.id}</span>
                  </span>
                  <span className="text-teal-700 font-bold font-sans shrink-0">IPFS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex-1 py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                <th className="pb-3 px-2">Document Name</th>
                <th className="pb-3 px-2">Category</th>
                <th className="pb-3 px-2">Doctor / Hospital</th>
                <th className="pb-3 px-2">Visit Date</th>
                <th className="pb-3 px-2">Size</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-2 font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="truncate max-w-xs">{doc.document_name || doc.original_filename}</span>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-bold text-[10px]">
                      {doc.document_category || "General"}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-slate-600">
                    {doc.doctor_name || doc.hospital_name || "—"}
                  </td>
                  <td className="py-3.5 px-2 text-slate-500">
                    {doc.visit_date || "—"}
                  </td>
                  <td className="py-3.5 px-2 font-mono text-slate-400">
                    {formatBytes(doc.file_size)}
                  </td>
                  <td className="py-3.5 px-2 text-right space-x-2">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
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

    </div>
  );
}
