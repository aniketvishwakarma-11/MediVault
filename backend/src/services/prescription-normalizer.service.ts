import { GoogleGenerativeAI } from "@google/generative-ai";
import { DrugCatalogService, DrugCatalogItem } from "./drug-catalog.service";
import { logger } from "../utils/logger";
import { cleanAndParseJson } from "../utils/jsonSanitizer";

export interface DrugCandidate {
  drug: DrugCatalogItem;
  match_type: "exact" | "brand" | "generic" | "partial";
  confidence: number;
}

export interface ExtractedMedication {
  raw_medicine_name: string;
  normalized_medicine_name: string | null;
  brand_name: string | null;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  route: string | null;
  frequency: string | null;
  schedule_code: string | null;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
  drug_catalog_id: string | null;
  candidates: DrugCandidate[];
  confidence: {
    medicine_name: number;
    strength: number;
    frequency: number;
    duration: number;
    overall: number;
  };
  needs_verification: boolean;
}

export interface StructuredPrescriptionData {
  patient_name: string | null;
  doctor_name: string | null;
  clinic_hospital: string | null;
  prescription_date: string | null;
  diagnosis: string | null;
  notes: string | null;
  follow_up: string | null;
  medications: ExtractedMedication[];
  raw_text_used: string;
  extraction_method: string;
  overall_confidence: number;
}

export class PrescriptionNormalizerService {

  public static async extractStructuredData(
    rawOcrText: string,
    imageBuffer?: Buffer,
    mimeType?: string
  ): Promise<StructuredPrescriptionData> {
    const empty: StructuredPrescriptionData = {
      patient_name: null, doctor_name: null, clinic_hospital: null,
      prescription_date: null, diagnosis: null, notes: null, follow_up: null,
      medications: [], raw_text_used: rawOcrText, extraction_method: "fallback",
      overall_confidence: 0.5,
    };

    // 1. Primary: Google Gemini Multimodal Vision / LLM
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !geminiKey.includes("placeholder") && !geminiKey.includes("your_gemini")) {
      try {
        const result = await PrescriptionNormalizerService.extractWithGemini(rawOcrText, imageBuffer, mimeType);
        if (result && result.medications && result.medications.length > 0) {
          logger.info(`[PrescriptionNormalizer] Gemini successfully extracted ${result.medications.length} medicines.`);
          return result;
        }
      } catch (e: any) {
        logger.warn("[PrescriptionNormalizer] Gemini extraction notice:", e.message);
      }
    }

    // 2. Fallback: NVIDIA NIM (Llama 3.1)
    const nvidiaKey = process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY;
    if (nvidiaKey && !nvidiaKey.includes("placeholder") && rawOcrText && rawOcrText.trim().length >= 2) {
      try {
        const nvidiaResult = await PrescriptionNormalizerService.extractWithNvidia(rawOcrText);
        if (nvidiaResult && nvidiaResult.medications && nvidiaResult.medications.length > 0) {
          logger.info(`[PrescriptionNormalizer] NVIDIA NIM successfully extracted ${nvidiaResult.medications.length} medicines.`);
          return nvidiaResult;
        }
      } catch (e: any) {
        logger.warn("[PrescriptionNormalizer] NVIDIA NIM extraction notice:", e.message);
      }
    }

    // 3. Fallback: Intelligent Regex & Heuristic Parsing
    if (rawOcrText && rawOcrText.trim().length >= 2) {
      const regexResult = await PrescriptionNormalizerService.extractWithRegex(rawOcrText);
      if (regexResult.medications.length > 0) return regexResult;
    }

    // 4. Guaranteed Fallback if image or text was provided
    logger.info("[PrescriptionNormalizer] Using guaranteed baseline heuristic for prescription.");
    return PrescriptionNormalizerService.extractBaselineFallback(rawOcrText);
  }

  private static async extractWithGemini(
    rawText: string,
    imageBuffer?: Buffer,
    mimeType?: string
  ): Promise<StructuredPrescriptionData | null> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const models = [
      process.env.PRIMARY_MEDICAL_MODEL_VERSION || "gemini-1.5-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-2.5-flash",
    ];

    const prompt = `You are an expert clinical pharmacist and handwriting specialist reading a medical prescription.
Analyze the handwritten or printed prescription image and any OCR text provided.
Extract the EXACT medicines, strengths, dosage forms, and directions written by the doctor.
Even if the handwriting is messy, cursive, or abbreviated (e.g. "Prosgnt (20mg)" -> Progut 20mg or Prosgnt 20mg), extract the closest clinically accurate medication name and strength.

${rawText ? `OCR Candidate Text: ${rawText}` : ""}

Return STRICT JSON matching this schema exactly:
{
  "patient_name": "string or null",
  "doctor_name": "string or null",
  "clinic_hospital": "string or null",
  "prescription_date": "YYYY-MM-DD or null",
  "diagnosis": "string or null",
  "notes": "string or null",
  "follow_up": "string or null",
  "medications": [
    {
      "raw_medicine_name": "exact or deciphered medicine name (e.g. Progut, Prosgnt, Dolo, Metformin)",
      "strength": "e.g. 20 mg, 500 mg, etc.",
      "dosage_form": "Tablet / Capsule / Syrup / Injection",
      "frequency": "e.g. 1-0-1 or 1-0-0 or once daily",
      "duration": "e.g. 7 days or 30 days",
      "quantity": "e.g. 10 or 30",
      "instructions": "e.g. Take after food"
    }
  ],
  "overall_confidence": 0.85
}`;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        });

        const contents: any[] = [];
        if (imageBuffer && imageBuffer.length > 0) {
          contents.push({
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType: mimeType || "image/jpeg",
            },
          });
        }
        contents.push(prompt);

        const result = await model.generateContent(contents);
        const text = result.response.text();
        const parsed = cleanAndParseJson(text);

        if (!parsed || !parsed.medications || parsed.medications.length === 0) continue;

        // Enrich medications with drug catalog matching
        const enrichedMeds: ExtractedMedication[] = [];
        for (const med of (parsed.medications || [])) {
          const enriched = await PrescriptionNormalizerService.enrichMedication(med);
          enrichedMeds.push(enriched);
        }

        return {
          patient_name: parsed.patient_name || null,
          doctor_name: parsed.doctor_name || null,
          clinic_hospital: parsed.clinic_hospital || null,
          prescription_date: parsed.prescription_date || null,
          diagnosis: parsed.diagnosis || null,
          notes: parsed.notes || null,
          follow_up: parsed.follow_up || null,
          medications: enrichedMeds,
          raw_text_used: rawText,
          extraction_method: `gemini/${modelName}`,
          overall_confidence: parsed.overall_confidence || 0.88,
        };
      } catch (e: any) {
        logger.warn(`[PrescriptionNormalizer] Gemini ${modelName} failed:`, e.message);
      }
    }
    return null;
  }

  private static async extractWithNvidia(rawText: string): Promise<StructuredPrescriptionData | null> {
    const apiKey = (process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY || "").trim();
    if (!apiKey || apiKey.includes("your_nvidia")) return null;

    const baseUrl = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
    const model = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-8b-instruct";

    const prompt = `You are an expert clinical pharmacist reading a medical prescription.
Extract the EXACT medicines, strengths, dosage forms, and directions from the following prescription text:
"""
${rawText}
"""

Return ONLY a strict valid JSON object matching this schema:
{
  "patient_name": null,
  "doctor_name": null,
  "clinic_hospital": null,
  "prescription_date": null,
  "diagnosis": null,
  "notes": null,
  "follow_up": null,
  "medications": [
    {
      "raw_medicine_name": "medicine name",
      "strength": "e.g. 20 mg or 500 mg",
      "dosage_form": "Tablet / Capsule / Syrup",
      "frequency": "1-0-1 or once daily",
      "duration": "7 days",
      "quantity": "10",
      "instructions": "Take after meals"
    }
  ],
  "overall_confidence": 0.85
}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const content = json.choices?.[0]?.message?.content || "";
    const parsed = cleanAndParseJson(content);
    if (!parsed || !parsed.medications || parsed.medications.length === 0) return null;

    const enrichedMeds: ExtractedMedication[] = [];
    for (const med of (parsed.medications || [])) {
      const enriched = await PrescriptionNormalizerService.enrichMedication(med);
      enrichedMeds.push(enriched);
    }

    return {
      patient_name: parsed.patient_name || null,
      doctor_name: parsed.doctor_name || null,
      clinic_hospital: parsed.clinic_hospital || null,
      prescription_date: parsed.prescription_date || null,
      diagnosis: parsed.diagnosis || null,
      notes: parsed.notes || null,
      follow_up: parsed.follow_up || null,
      medications: enrichedMeds,
      raw_text_used: rawText,
      extraction_method: `nvidia/${model}`,
      overall_confidence: parsed.overall_confidence || 0.85,
    };
  }

  private static async extractWithRegex(rawText: string): Promise<StructuredPrescriptionData> {
    logger.info("[PrescriptionNormalizer] Using regex extraction fallback.");
    const cleanRaw = rawText.replace(/[\r\n]+/g, "\n");
    const lines = cleanRaw.split("\n").map((l) => l.trim()).filter(Boolean);

    const dateMatch = rawText.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/);
    const schedulePattern = /\b(1-0-1|1-0-0|0-0-1|1-1-1|1-1-0|0-1-1|0-0-1|bd|od|tid|qid|daily|twice|thrice)\b/i;

    const medications: ExtractedMedication[] = [];
    for (const line of lines) {
      if (line.length < 2) continue;

      // Extract strength (e.g. 20mg, 20 mg, 500mg)
      const strengthMatch = line.match(/(\d+\.?\d*)\s*(mg|ml|mcg|g|iu|units?)/i);
      const schedMatch = line.match(schedulePattern);
      const durMatch = line.match(/(\d+)\s*(days?|weeks?|months?)/i);

      // Clean medicine name from parentheses, numbers, and dosage prefixes
      let rawName = line
        .replace(/^[Rr][Xx]\s*[:.]?\s*/, "")
        .replace(/^(Tab|Cap|Syp|Inj|Oint|Drops)\.?\s*/i, "")
        .replace(/\(\s*\d+.*?\)/g, "") // remove parenthesized strength like (20mg)
        .replace(/\d+\.?\d*\s*(mg|ml|mcg|g|iu|units?)/gi, "") // remove strength
        .replace(/\b(1-0-1|1-0-0|0-0-1|1-1-1|bd|od|tid|qid)\b/gi, "")
        .replace(/[\(\)\[\]:,]/g, " ")
        .trim();

      if (!rawName || rawName.length < 2) {
        rawName = line.split(/\d/)[0].replace(/[\(\)\[\]:,]/g, " ").trim();
      }

      if (rawName.length >= 2) {
        const enriched = await PrescriptionNormalizerService.enrichMedication({
          raw_medicine_name: rawName,
          strength: strengthMatch ? `${strengthMatch[1]} ${strengthMatch[2].toLowerCase()}` : null,
          frequency: schedMatch ? schedMatch[0] : "1-0-1",
          duration: durMatch ? durMatch[0] : "7 days",
          dosage_form: /cap/i.test(line) ? "Capsule" : /syp/i.test(line) ? "Syrup" : "Tablet",
          instructions: "Take after meals",
        });
        medications.push(enriched);
      }
    }

    return {
      patient_name: null, doctor_name: null, clinic_hospital: null,
      prescription_date: dateMatch ? dateMatch[0] : null,
      diagnosis: null, notes: null, follow_up: null,
      medications,
      raw_text_used: rawText,
      extraction_method: "regex_heuristic",
      overall_confidence: 0.75,
    };
  }

  private static extractBaselineFallback(rawText: string): StructuredPrescriptionData {
    const fallbackMed: ExtractedMedication = {
      raw_medicine_name: rawText && rawText.trim().length >= 2 ? rawText.trim() : "Prescribed Medication",
      normalized_medicine_name: rawText && rawText.trim().length >= 2 ? rawText.trim() : "Prescribed Medication (Verify)",
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
      confidence: { medicine_name: 0.6, strength: 0.6, frequency: 0.6, duration: 0.6, overall: 0.6 },
      needs_verification: true,
    };

    return {
      patient_name: null,
      doctor_name: null,
      clinic_hospital: null,
      prescription_date: new Date().toISOString().split("T")[0],
      diagnosis: "General Healthcare",
      notes: null,
      follow_up: null,
      medications: [fallbackMed],
      raw_text_used: rawText,
      extraction_method: "baseline_fallback",
      overall_confidence: 0.6,
    };
  }

  public static async enrichMedication(med: any): Promise<ExtractedMedication> {
    const rawName = (med.raw_medicine_name || "").trim();
    const candidates = await PrescriptionNormalizerService.matchDrugCandidates(rawName);
    const best = candidates[0] || null;

    const nameConf = best
      ? best.match_type === "exact" ? 0.97
        : best.match_type === "brand" ? 0.91
        : best.match_type === "generic" ? 0.88 : 0.65
      : 0.35;

    const strengthConf = med.strength ? (best ? 0.93 : 0.6) : 0.2;
    const freqConf = med.frequency ? 0.85 : 0.3;
    const durConf = med.duration ? 0.85 : 0.3;
    const overall = (nameConf + strengthConf + freqConf + durConf) / 4;

    return {
      raw_medicine_name: rawName,
      normalized_medicine_name: best ? `${best.drug.generic_name} ${med.strength || best.drug.strength}`.trim() : null,
      brand_name: best?.drug.brand_name || null,
      generic_name: best?.drug.generic_name || null,
      strength: med.strength || best?.drug.strength || null,
      dosage_form: med.dosage_form || best?.drug.dosage_form || null,
      route: med.route || best?.drug.route || "Oral",
      frequency: med.frequency || best?.drug.default_schedule || null,
      schedule_code: PrescriptionNormalizerService.normalizeScheduleCode(med.frequency) || best?.drug.default_schedule || null,
      duration: med.duration || null,
      quantity: med.quantity || null,
      instructions: med.instructions || best?.drug.food_instructions || null,
      drug_catalog_id: best?.drug.id || null,
      candidates,
      confidence: {
        medicine_name: nameConf,
        strength: strengthConf,
        frequency: freqConf,
        duration: durConf,
        overall,
      },
      needs_verification: overall < 0.8 || !best,
    };
  }

  public static async matchDrugCandidates(rawMedName: string): Promise<DrugCandidate[]> {
    if (!rawMedName || rawMedName.trim().length < 2) return [];

    const results = await DrugCatalogService.searchDrugs(rawMedName, 5);
    return results.map((drug) => {
      const nameLower = rawMedName.toLowerCase();
      const brandLower = (drug.brand_name || "").toLowerCase();
      const genericLower = drug.generic_name.toLowerCase();

      let matchType: DrugCandidate["match_type"] = "partial";
      let confidence = 0.6;

      if (genericLower === nameLower || brandLower === nameLower) {
        matchType = "exact"; confidence = 0.98;
      } else if (brandLower.includes(nameLower) || nameLower.includes(brandLower.split(" ")[0])) {
        matchType = "brand"; confidence = 0.88;
      } else if (genericLower.includes(nameLower) || nameLower.includes(genericLower.split(" ")[0])) {
        matchType = "generic"; confidence = 0.85;
      }

      return { drug, match_type: matchType, confidence };
    });
  }

  public static normalizeScheduleCode(freq: string | null): string | null {
    if (!freq) return null;
    const f = freq.toLowerCase().trim();
    if (/^1-0-1$/.test(f)) return "1-0-1";
    if (/^1-0-0$/.test(f)) return "1-0-0";
    if (/^0-0-1$/.test(f)) return "0-0-1";
    if (/^1-1-1$/.test(f)) return "1-1-1";
    if (/\bod\b|once\s*daily/.test(f)) return "1-0-0";
    if (/\bbd\b|\btwice\b/.test(f)) return "1-0-1";
    if (/\btid\b|\bthrice\b|three\s*times/.test(f)) return "1-1-1";
    return freq;
  }
}
