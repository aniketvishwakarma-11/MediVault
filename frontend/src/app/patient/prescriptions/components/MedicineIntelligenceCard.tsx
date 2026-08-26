"use client";

import React, { useState } from "react";
import {
  Pill, ChevronDown, ChevronUp, Info, AlertTriangle,
  Sparkles, IndianRupee, ShieldCheck, Loader2,
} from "lucide-react";

interface ExtractedMedication {
  raw_medicine_name: string;
  normalized_medicine_name?: string | null;
  brand_name?: string | null;
  generic_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  frequency?: string | null;
  schedule_code?: string | null;
  duration?: string | null;
  instructions?: string | null;
  drug_catalog_id?: string | null;
  confidence?: { medicine_name: number; strength: number; frequency: number; duration: number; overall: number };
  needs_verification?: boolean;
  candidates?: Array<{ drug: any; match_type: string; confidence: number }>;
}

interface MedicineIntelligenceCardProps {
  medication: ExtractedMedication;
  index: number;
  jobId: string;
  editable?: boolean;
  onChange?: (updated: ExtractedMedication) => void;
}

function ConfidencePill({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                pct >= 65 ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${color}`}>
      {label}: {pct}%
    </span>
  );
}

export default function MedicineIntelligenceCard({
  medication, index, jobId, editable = true, onChange,
}: MedicineIntelligenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intel, setIntel] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(medication);

  const overallConf = medication.confidence?.overall ?? 0.5;
  const needsVerification = medication.needs_verification || overallConf < 0.8;

  const loadIntelligence = async () => {
    if (!medication.drug_catalog_id || intel) {
      setExpanded(!expanded);
      return;
    }
    setExpanded(true);
    setLoadingIntel(true);
    try {
      const res = await fetch(
        `/api/prescriptions/ocr/${jobId}/medicine-info/${medication.drug_catalog_id}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setIntel(data.data);
      }
    } catch {}
    setLoadingIntel(false);
  };

  const scheduleToSlots = (code?: string | null) => {
    if (!code) return [];
    const parts = code.split("-");
    const slots = ["Morning", "Afternoon", "Evening"];
    return slots.filter((_, i) => parts[i] === "1");
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      needsVerification
        ? "border-amber-300 bg-amber-50/40"
        : "border-emerald-200 bg-emerald-50/20"
    }`}>
      {/* Card header */}
      <div className="p-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          needsVerification ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
        }`}>
          <Pill className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-[#0F172A]">
              {editMode ? (
                <input
                  className="border rounded-lg px-2 py-0.5 text-sm font-bold"
                  value={editData.normalized_medicine_name || editData.raw_medicine_name}
                  onChange={(e) => setEditData({ ...editData, normalized_medicine_name: e.target.value })}
                />
              ) : (
                editData.normalized_medicine_name || editData.raw_medicine_name
              )}
            </span>
            {needsVerification && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Verify
              </span>
            )}
            {!needsVerification && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Matched
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-[#475569]">
            {medication.generic_name && <span>Generic: <strong>{medication.generic_name}</strong></span>}
            {(editData.strength || medication.strength) && (
              <span>
                Strength:{" "}
                {editMode ? (
                  <input
                    className="border rounded px-1.5 py-0 text-xs w-20"
                    value={editData.strength || ""}
                    onChange={(e) => setEditData({ ...editData, strength: e.target.value })}
                  />
                ) : (
                  <strong>{editData.strength}</strong>
                )}
              </span>
            )}
            {medication.dosage_form && <span>Form: <strong>{medication.dosage_form}</strong></span>}
          </div>

          {/* Dosing slots visual */}
          {(editData.schedule_code || medication.schedule_code) && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {scheduleToSlots(editData.schedule_code || medication.schedule_code).map((slot) => (
                <span key={slot} className="px-2.5 py-1 rounded-lg bg-cyan-100 border border-cyan-200 text-cyan-800 text-[10px] font-bold">
                  {slot}
                </span>
              ))}
              {editData.duration && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                  {editData.duration}
                </span>
              )}
            </div>
          )}

          {/* Frequency edit */}
          {editMode && (
            <div className="flex gap-2 mt-2">
              <select
                className="text-xs border rounded-lg px-2 py-1"
                value={editData.schedule_code || ""}
                onChange={(e) => setEditData({ ...editData, schedule_code: e.target.value })}
              >
                <option value="">-- Schedule --</option>
                <option value="1-0-0">Morning only (1-0-0)</option>
                <option value="1-0-1">Morning + Evening (1-0-1)</option>
                <option value="1-1-1">3x Daily (1-1-1)</option>
                <option value="0-0-1">Bedtime (0-0-1)</option>
              </select>
              <input
                className="text-xs border rounded-lg px-2 py-1 w-24"
                placeholder="Duration (e.g. 30 days)"
                value={editData.duration || ""}
                onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
              />
            </div>
          )}

          {/* Confidence pills */}
          {medication.confidence && (
            <div className="flex flex-wrap gap-1 mt-2">
              <ConfidencePill value={medication.confidence.medicine_name} label="Name" />
              {medication.confidence.strength > 0 && (
                <ConfidencePill value={medication.confidence.strength} label="Dose" />
              )}
              {medication.confidence.frequency > 0 && (
                <ConfidencePill value={medication.confidence.frequency} label="Schedule" />
              )}
            </div>
          )}
        </div>

        {/* Expand & Edit controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editable && (
            <button
              onClick={() => {
                if (editMode && onChange) onChange(editData);
                setEditMode(!editMode);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                editMode
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white text-[#475569] border-slate-200 hover:border-[#0891B2] hover:text-[#0891B2]"
              }`}
            >
              {editMode ? "Save" : "Edit"}
            </button>
          )}
          {medication.drug_catalog_id && (
            <button
              onClick={loadIntelligence}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#0891B2] hover:border-[#0891B2] transition-colors"
              title="View medicine information"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {medication.instructions && (
        <div className="px-4 pb-3">
          <span className="text-xs text-[#475569]">
            Instructions: <span className="font-medium">{medication.instructions}</span>
          </span>
        </div>
      )}

      {/* Drug intelligence panel */}
      {expanded && (
        <div className="border-t border-slate-200/60 p-4 space-y-3">
          {loadingIntel ? (
            <div className="flex items-center gap-2 text-xs text-[#475569]">
              <Loader2 className="w-4 h-4 animate-spin text-[#0891B2]" />
              Loading medicine information...
            </div>
          ) : intel ? (
            <div className="space-y-3">
              {/* Explanation */}
              {intel.explanation?.what_it_does && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-[#0F172A] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800">
                    <Sparkles className="w-3.5 h-3.5" /> What this medicine does
                  </div>
                  <p className="text-[#475569] leading-relaxed">{intel.explanation.what_it_does}</p>
                </div>
              )}

              {/* Safety */}
              {intel.safety?.contraindications?.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs space-y-1">
                  <div className="font-bold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Important safety notes
                  </div>
                  {intel.safety.contraindications.slice(0, 2).map((c: string, i: number) => (
                    <p key={i} className="text-red-600">- {c}</p>
                  ))}
                </div>
              )}

              {/* Pricing */}
              {intel.pricing?.jan_aushadhi_price && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Jan Aushadhi Savings
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[#475569]">Generic (Govt): </span>
                      <strong className="text-emerald-700">Rs. {intel.pricing.jan_aushadhi_price}</strong>
                    </div>
                    {intel.pricing.market_brand_price && (
                      <div>
                        <span className="text-[#475569]">Brand: </span>
                        <strong className="text-slate-600">Rs. {intel.pricing.market_brand_price}</strong>
                      </div>
                    )}
                    {intel.pricing.potential_savings_pct && (
                      <div className="text-emerald-700 font-bold">Save up to {intel.pricing.potential_savings_pct}%</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#475569]">No additional information available for this medicine.</p>
          )}
        </div>
      )}
    </div>
  );
}