"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, AlertTriangle, Info, CheckCircle2, Loader2, X, FileImage, ZapOff, Camera,
} from "lucide-react";
import { CameraScannerModal } from "@/app/components/scanner/CameraScannerModal";

interface UploadResult {
  jobId: string;
  documentId: string;
  storageKey: string;
  status: string;
}

interface OfflinePrescriptionUploadProps {
  patientId: string;
  token?: string;
  onUploadStarted: (result: UploadResult) => void;
}

export default function OfflinePrescriptionUpload({
  patientId,
  token,
  onUploadStarted,
}: OfflinePrescriptionUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrServiceAvailable, setOcrServiceAvailable] = useState<boolean | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkOcrService = async () => {
    try {
      const res = await fetch("/api/prescriptions/ocr/service-health");
      if (res.ok) {
        const data = await res.json();
        setOcrServiceAvailable(data.data?.available === true);
      }
    } catch {
      setOcrServiceAvailable(false);
    }
  };

  useEffect(() => {
    checkOcrService();
  }, []);

  const handleFile = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setUploadError("Unsupported format. Please upload a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 15 MB.");
      return;
    }
    setUploadError(null);
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", patientId);

      const res = await fetch("/api/prescriptions/upload-offline", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data) {
        onUploadStarted(data.data);
      } else {
        setUploadError(data.message || data.error || "Upload failed. Please try again.");
      }
    } catch (err: any) {
      setUploadError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-black text-lg text-[#0F172A] flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 items-center justify-center text-white shadow-sm">
              <Upload className="w-3.5 h-3.5" />
            </span>
            Upload Offline Prescription
          </h2>
          <p className="text-xs text-[#475569] mt-1 max-w-lg">
            Visited an offline doctor? Upload your handwritten or printed prescription photo.
            MediVault will intelligently extract the medicines and help you verify them.
          </p>
        </div>
        {ocrServiceAvailable === false && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium shrink-0">
            <ZapOff className="w-3.5 h-3.5 shrink-0" />
            <span>OCR service offline - text extraction unavailable</span>
          </div>
        )}
        {ocrServiceAvailable === true && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>OCR service ready</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { step: "1", label: "Upload photo", desc: "Clear, well-lit image" },
          { step: "2", label: "AI analyzes", desc: "chinmays18 OCR model" },
          { step: "3", label: "You verify", desc: "Check and fix extracted data" },
          { step: "4", label: "Saved forever", desc: "Timeline and history" },
        ].map((s) => (
          <div key={s.step} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
            <div className="w-6 h-6 rounded-full bg-[#0891B2] text-white text-xs font-bold flex items-center justify-center mx-auto">
              {s.step}
            </div>
            <div className="text-xs font-bold text-[#0F172A]">{s.label}</div>
            <div className="text-[10px] text-[#475569]">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* ─── Camera Scanner Quick Action ─── */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200/80 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white text-[#0891B2] shadow-xs border border-cyan-100">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A]">Scan Paper Prescription with Camera</div>
            <div className="text-[11px] text-slate-500">Auto-aligns Rx slip &amp; prepares for TrOCR AI</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          disabled={isUploading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold hover:brightness-105 shadow-sm shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Prescription</span>
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
          isDragging ? "border-[#0891B2] bg-cyan-50/60 scale-[1.01]" : "border-slate-300 hover:border-[#0891B2] bg-white hover:bg-cyan-50/30"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          disabled={isUploading}
        />

        {preview ? (
          <div className="relative">
            <img src={preview} alt="Prescription preview" className="w-full max-h-72 object-contain bg-slate-50" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="bg-white/90 px-4 py-2 rounded-lg text-sm font-bold text-[#0F172A]">Click to change</span>
            </div>
            {!isUploading && (
              <button
                onClick={(e) => { e.stopPropagation(); setPreview(null); setSelectedFile(null); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-600 hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-indigo-50 border border-cyan-200/60 flex items-center justify-center text-[#0891B2]">
              <FileImage className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-bold text-[#0F172A] text-sm">
                {isDragging ? "Drop your prescription here" : "Drag and drop or click to upload"}
              </p>
              <p className="text-xs text-[#475569] mt-1">JPG, PNG, WEBP, PDF - Max 15 MB - Take a clear, bright photo</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 flex gap-3 text-xs text-[#475569]">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#0F172A]">Photo tips for best results:</span>{" "}
          Place prescription on a flat dark surface. Ensure all text is clearly visible and not blurry.
          Use natural light or a flashlight. Avoid shadows and glare. Capture the entire prescription in one photo.
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700">
            <span className="font-bold">Upload failed: </span>{uploadError}
          </div>
        </div>
      )}

      {selectedFile && !isUploading && (
        <button
          onClick={handleUpload}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0d9488] hover:opacity-90 text-white font-bold text-sm shadow-md transition-all hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          id="btn-upload-prescription"
        >
          <Upload className="w-4 h-4" />
          Analyze This Prescription
        </button>
      )}

      {isUploading && (
        <div className="flex items-center justify-center gap-3 py-3.5">
          <Loader2 className="w-5 h-5 animate-spin text-[#0891B2]" />
          <span className="text-sm font-medium text-[#475569]">Uploading securely to MediVault...</span>
        </div>
      )}

      <p className="text-[10px] text-[#64748B] text-center">
        Your prescription image is encrypted and stored privately in MediVault. Only you and doctors you consent can access it.
        The original image is preserved unchanged - we only read from it, never modify it.
      </p>

      {/* ─── Camera Scanner Modal ─── */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onComplete={(file) => handleFile(file)}
        initialFormat="RX"
        defaultDocTitle="Doctor_Prescription"
      />
    </div>
  );
}