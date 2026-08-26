"use client";

import React, { useState } from "react";
import {
  CheckCircle2, AlertTriangle, Loader2, FileImage,
  UserRound, Building2, Calendar, Stethoscope, Save, X, Eye, Plus, Pill,
} from "lucide-react";
import MedicineIntelligenceCard from "./MedicineIntelligenceCard";

interface ReviewData {
  patient_name?: string | null;
  doctor_name?: string | null;
  clinic_hospital?: string | null;
  prescription_date?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  medications: any[];
  overall_confidence?: number;
  extraction_method?: string;
}

interface PrescriptionReviewScreenProps {
  jobId: string;
  imageUrl?: string | null;
  rawOcrText?: string;
  structuredExtraction: ReviewData;
  patientId: string;
  token?: string;
  onConfirmed: (prescriptionId: string) => void;
  onClose: () => void;
}

export default function PrescriptionReviewScreen({
  jobId,
  imageUrl,
  rawOcrText,
  structuredExtraction,
  patientId,
  token,
  onConfirmed,
  onClose,
}: PrescriptionReviewScreenProps) {
  const [reviewData, setReviewData] = useState<ReviewData>({
    ...structuredExtraction,
    medications: (structuredExtraction.medications || []).map((m: any) => ({ ...m })),
  });
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const saveReview = async () => {
    setIsSavingReview(true);
    try {
      await fetch(`/api/prescriptions/ocr/${jobId}/review`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(reviewData),
      });
    } catch {}
    setIsSavingReview(false);
  };

  const addEmptyMed = () => {
    const newMed = {
      raw_medicine_name: "Prescribed Medicine",
      normalized_medicine_name: "Prescribed Medicine",
      brand_name: null,
      generic_name: null,
      strength: "20 mg",
      dosage_form: "Tablet",
      route: "Oral",
      frequency: "1-0-1",
      schedule_code: "1-0-1",
      duration: "7 days",
      quantity: "14",
      instructions: "Take after meals",
      drug_catalog_id: null,
      candidates: [],
      confidence: { medicine_name: 1.0, strength: 1.0, frequency: 1.0, duration: 1.0, overall: 1.0 },
      needs_verification: true,
    };
    setReviewData({ ...reviewData, medications: [...reviewData.medications, newMed] });
  };

  const handleConfirm = async () => {
    if (!reviewData.medications || reviewData.medications.length === 0) {
      setConfirmError("Please add at least one verified medicine before confirming.");
      return;
    }

    for (const med of reviewData.medications) {
      const name = med.normalized_medicine_name || med.raw_medicine_name;
      if (!name || name.trim().length < 2) {
        setConfirmError("One or more medicines are missing a name. Please verify all entries.");
        return;
      }
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch(`/api/prescriptions/ocr/${jobId}/confirm`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...reviewData,
          patient_id: patientId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.prescription_id) {
        onConfirmed(data.data.prescription_id);
      } else {
        setConfirmError(data.message || "Confirmation failed. Please try again.");
      }
    } catch (err: any) {
      setConfirmError("Network error. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const updateMed = (idx: number, updated: any) => {
    const newMeds = [...reviewData.medications];
    newMeds[idx] = updated;
    setReviewData({ ...reviewData, medications: newMeds });
  };

  const removeMed = (idx: number) => {
    setReviewData({ ...reviewData, medications: reviewData.medications.filter((_, i) => i !== idx) });
  };

  const overallConf = structuredExtraction.overall_confidence || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-black text-lg text-[#0F172A] flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center text-white shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            Review Extracted Prescription
          </h2>
          <p className="text-xs text-[#475569] mt-1">
            Verify the extracted information below. Edit anything that looks wrong before confirming.
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs ${
        overallConf >= 0.8 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
        overallConf >= 0.5 ? "bg-amber-50 border-amber-200 text-amber-700" :
        "bg-red-50 border-red-200 text-red-700"
      }`}>
        {overallConf >= 0.8 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
        <div>
          <span className="font-bold">
            Extraction confidence: {Math.round(overallConf * 100)}%
            {overallConf < 0.7 ? " - Please carefully review all fields below." : " - Looks good! Still verify before confirming."}
          </span>
          {structuredExtraction.extraction_method && (
            <span className="ml-2 opacity-70">via {structuredExtraction.extraction_method}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
            <FileImage className="w-4 h-4 text-[#0891B2]" /> Original Prescription
          </h3>
          {imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={imageUrl}
                alt="Uploaded prescription"
                className="w-full object-contain max-h-80 bg-slate-50"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <FileImage className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-[#64748B]">Image preview not available</p>
            </div>
          )}

          {rawOcrText && (
            <div>
              <button
                onClick={() => setShowRawOcr(!showRawOcr)}
                className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0891B2] font-medium transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {showRawOcr ? "Hide" : "Show"} raw OCR text
              </button>
              {showRawOcr && (
                <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-[10px] max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {rawOcrText}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#0891B2]" /> Prescription Details
          </h3>
          <div className="space-y-2.5">
            {[
              { icon: UserRound, label: "Doctor Name", key: "doctor_name", placeholder: "e.g. Dr. Ramesh Sharma" },
              { icon: Building2, label: "Clinic / Hospital", key: "clinic_hospital", placeholder: "e.g. City Medical Center" },
              { icon: Calendar, label: "Prescription Date", key: "prescription_date", placeholder: "YYYY-MM-DD", type: "date" },
              { icon: Stethoscope, label: "Diagnosis / Condition", key: "diagnosis", placeholder: "e.g. Type 2 Diabetes, Hypertension" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[10px] font-bold text-[#475569] uppercase tracking-wide flex items-center gap-1 mb-1">
                  <field.icon className="w-3 h-3" /> {field.label}
                </label>
                <input
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={(reviewData as any)[field.key] || ""}
                  onChange={(e) => setReviewData({ ...reviewData, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-cyan-200"
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveReview}
            disabled={isSavingReview}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#475569] hover:border-[#0891B2] hover:text-[#0891B2] transition-colors font-medium cursor-pointer"
          >
            {isSavingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save progress
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
            Extracted Medicines
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {reviewData.medications.length}
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={addEmptyMed}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0891B2] text-xs font-bold hover:bg-cyan-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medicine
            </button>
            {reviewData.medications.some((m) => m.needs_verification) && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Needs verification
              </span>
            )}
          </div>
        </div>

        {reviewData.medications.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-[#0891B2] flex items-center justify-center mx-auto">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">No medicines auto-detected</p>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                The image text was difficult to extract automatically. You can add your medicine manually in seconds.
              </p>
            </div>
            <button
              onClick={addEmptyMed}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0d9488] text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Medicine Manually
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewData.medications.map((med: any, idx: number) => (
              <div key={idx} className="relative">
                <MedicineIntelligenceCard
                  medication={med}
                  index={idx}
                  jobId={jobId}
                  editable={true}
                  onChange={(updated) => updateMed(idx, updated)}
                />
                <button
                  onClick={() => removeMed(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                  title="Remove this medicine"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#475569] space-y-1">
        <p className="font-bold text-[#0F172A]">Important - Please read before confirming:</p>
        <ul className="list-disc list-inside space-y-1 text-[#475569]">
          <li>This prescription was extracted by AI from your uploaded image. It is <strong>not</strong> a digital prescription issued by MediVault.</li>
          <li>Verify that all medicines, dosages, and schedules match exactly what your doctor prescribed.</li>
          <li>If the AI could not identify a medicine, or if something looks wrong - correct it before confirming.</li>
          <li>Never take medicines that were not prescribed to you by a licensed doctor.</li>
        </ul>
      </div>

      {confirmError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {confirmError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-[#475569] font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirming || reviewData.medications.length === 0}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0d9488] text-white font-bold text-sm shadow-md hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          id="btn-confirm-prescription"
        >
          {isConfirming ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving to Medical History...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Confirm & Save to History</>
          )}
        </button>
      </div>
    </div>
  );
}