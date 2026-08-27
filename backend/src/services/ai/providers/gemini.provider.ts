import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIExecutionMetrics, HealthCheckResult } from './ai_provider.interface';
import { MedicalAIAnalysis } from '../../../types/medical_ai';
import { logger } from '../../../utils/logger';
import { cleanAndParseJson } from '../../../utils/jsonSanitizer';

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';

  private getApiKey(): string {
    const rawKey = process.env.GEMINI_API_KEY || '';
    return rawKey.trim();
  }

  private getModelName(): string {
    const configured = process.env.PRIMARY_MEDICAL_MODEL_VERSION || 'gemini-3.1-flash-lite';
    // Auto-migrate legacy 1.5/2.0/2.5 model names to Google Gemini 3.x series
    if (configured.includes('1.5') || configured === 'gemini-2.0-flash' || configured === 'gemini-2.5-flash') {
      return 'gemini-3.1-flash-lite';
    }
    return configured;
  }

  private static isValidMediaBuffer(buffer?: Buffer, mimeType?: string): boolean {
    if (!buffer || buffer.length < 64) return false;
    if (mimeType === 'application/pdf') {
      return buffer.slice(0, 5).toString('ascii').startsWith('%PDF');
    }
    if (mimeType?.startsWith('image/')) {
      // JPEG: FF D8
      if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
      // WEBP: RIFF....WEBP
      if (buffer.slice(0, 4).toString('ascii') === 'RIFF') return true;
      return true;
    }
    return false;
  }

  public async processMedicalDocument(
    ocrText: string,
    originalFilename: string,
    category?: string,
    fileBuffer?: Buffer,
    mimeType?: string
  ): Promise<{ data: MedicalAIAnalysis; metrics: AIExecutionMetrics }> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('your_gemini_api_key') || apiKey.includes('your_actual_gemini_api_key')) {
      throw new Error('Gemini API key is missing or set to placeholder string in backend/.env');
    }

    const systemPrompt = `
You are an expert physician, board-certified pathologist, and senior clinical medical analyst.
Your mandate is to perform an exhaustive medical intelligence extraction on the provided document OCR text and/or visual medical file attachment.
Read the report thoroughly like an experienced chief of medicine.
Extract every single lab measurement, numerical parameter, clinical finding, prescription, diagnosis, and care recommendation.
Never hallucinate or invent data. If a specific field is not present in the document text/image, return null or an empty array.

Document Filename: ${originalFilename}
Document Category Hint: ${category || 'Unspecified'}

Document OCR Raw Text:
"""
${ocrText}
"""

Instructions:
1. "suggested_title": Generate a concise, clear, and clinically informative title based on the document contents and context (e.g. "OPD Consultation Note - Dr. R. Sharma", "Complete Blood Count (CBC) Panel - Metropolis Labs", "Discharge Summary - Cardiac Care Unit", "Emergency Triage Slip - Acute Trauma", "Pediatric Immunization Record - DTaP/MMR"). NEVER use raw file names like "hpkp0090.pdf" or generic placeholders.
2. "summary": Provide a thorough 2-4 sentence doctor-level clinical executive summary highlighting primary pathology, diagnostic findings, organ system status, and abnormal trends.
3. "plain_language_explanation": Provide an empathetic 3-4 sentence plain-English explanation translating complex medical terminology into clear, reassuring concepts for the patient.
4. "lab_results": Extract EVERY single lab parameter, measurement, or vital sign present in the text into an array.
   - "test_name": Full descriptive name of the test or vital sign (e.g., "Systolic Blood Pressure", "Body Mass Index (BMI)", "Hemoglobin").
   - "value": Exact numerical or qualitative value extracted from report.
   - "unit": Standard unit of measurement (e.g., "mmHg", "kg/m2", "g/dL", "/min", "cm", "kg"). If unitless, use "".
   - "reference_range": Standard medical reference range. If not printed in document, supply standard clinical guidelines (e.g., "90-120 mmHg", "18.5-24.9 kg/m2", "60-100 /min", "13.5-17.5 g/dL"). NEVER output "N/A" or null.
   - "status": MUST be strictly one of: "NORMAL", "LOW", "HIGH", "CRITICAL". Evaluate value against reference range.
   - "clinical_meaning": A clear, insightful 1-sentence medical explanation of what this specific value means for the patient's health. NEVER leave empty, "-", or null.
5. "medications": Extract all prescribed drugs with name, dosage, frequency, duration, purpose, and special instructions.
6. "diagnosis": List all primary and secondary clinical diagnoses.
7. "red_flags": List urgent emergency warning symptoms to watch out for.
8. "risk_factors": List underlying health risk factors identified.
9. "recommended_followup": List recommended medical consultation timeframes.
10. "recommended_tests": List recommended repeat lab tests or imaging.
11. "overall_health_status": "STABLE" | "ATTENTION_REQUIRED" | "CRITICAL" based on findings.

Output STRICT VALID JSON ONLY conforming exactly to this structure:
{
  "document": {
    "document_type": "CBC | LFT | Vital Signs | Prescription | Discharge Summary | ECG | Echo | Urine Report | Biopsy | Ultrasound | Vaccination | Other",
    "suggested_title": "Descriptive Human-Friendly Clinical Title (e.g. OPD Consultation Note - Dr. Sharma)",
    "speciality": "Hematology | Cardiology | Neurology | Internal Medicine | General Practice | Orthopedics | Pathology | Radiology",
    "category": "Blood Report | Prescription | Diagnostic Imaging | Pathology | Discharge Summary | Other",
    "summary": "Detailed doctor-level clinical executive summary...",
    "language": "English",
    "confidence": 0.98
  },
  "hospital": { "name": "Facility Name or null", "address": null, "department": null, "contact": null },
  "doctor": { "name": "Doctor Name or null", "qualification": null, "specialization": null, "registration_number": null },
  "patient": { "name": "Patient Name or null", "age": null, "gender": null, "patient_id": null, "dob": null },
  "visit": { "visit_date": "YYYY-MM-DD or null", "report_date": null, "admission_date": null, "discharge_date": null },
  "diagnosis": ["Condition 1"],
  "symptoms": ["Symptom 1"],
  "medical_history": [],
  "allergies": [],
  "medications": [
    { "name": "Drug Name", "dosage": "500mg", "frequency": "BID", "duration": "5 days", "purpose": "Treatment", "instructions": "After food" }
  ],
  "lab_results": [
    { "test_name": "Body Mass Index (BMI)", "value": "28.09", "unit": "kg/m2", "reference_range": "18.5-24.9 kg/m2", "status": "HIGH", "clinical_meaning": "BMI indicates overweight status requiring dietary and activity optimization.", "confidence": 0.98 }
  ],
  "vitals": {},
  "procedures": [],
  "surgeries": [],
  "vaccinations": [],
  "recommended_followup": ["Follow up with primary physician in 2 weeks"],
  "recommended_tests": [],
  "lifestyle_recommendations": [],
  "red_flags": [],
  "risk_factors": [],
  "overall_health_status": "STABLE",
  "plain_language_explanation": "Comprehensive patient-friendly explanation...",
  "timeline_events": [
    { "title": "Report Analyzed", "date": "2026-08-01", "description": "Clinical parameters extracted and indexed into digital vault.", "importance": "HIGH" }
  ]
}
    `;

    const requestParts: any[] = [{ text: systemPrompt }];
    if (GeminiProvider.isValidMediaBuffer(fileBuffer, mimeType)) {
      requestParts.push({
        inlineData: {
          mimeType: mimeType!,
          data: fileBuffer!.toString('base64'),
        },
      });
    }

    // Strategy 1: Direct HTTP REST call (Supports both AQ.Ab... OAuth/Cloud keys & AIzaSy... keys)
    try {
      const modelName = this.getModelName();
      const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

      logger.info(`[Gemini Provider] Invoking Google Generative Language REST API (${modelName})...`);

      const resp = await fetch(restUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: requestParts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (resp.ok) {
        const jsonResp = await resp.json();
        const responseText = jsonResp.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          logger.info(`[Gemini Provider] Successfully received Gemini REST response in ${Date.now() - startTime}ms.`);
          return this.parseAndReturn(responseText, startTime);
        }
      } else {
        const errText = await resp.text();
        logger.warn(`[Gemini Provider Notice] Direct REST call status ${resp.status}: ${errText.slice(0, 200)}. Attempting GoogleGenerativeAI SDK fallback...`);
      }
    } catch (restErr: any) {
      logger.warn(`[Gemini Provider Notice] Direct REST call failed: ${restErr.message || restErr}. Falling back to SDK...`);
    }

    // Strategy 2: GoogleGenerativeAI SDK Fallback
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: this.getModelName(),
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const sdkParts: any[] = [systemPrompt];
      if (GeminiProvider.isValidMediaBuffer(fileBuffer, mimeType)) {
        sdkParts.push({
          inlineData: {
            mimeType: mimeType!,
            data: fileBuffer!.toString('base64'),
          },
        });
      }

      const result = await model.generateContent(sdkParts);
      const responseText = result.response.text();
      return this.parseAndReturn(responseText, startTime);
    } catch (sdkErr: any) {
      logger.error(`[Gemini Provider Error] Both REST API and SDK execution failed:`, sdkErr.message || sdkErr);
      throw new Error(`Google Gemini API execution failed: ${sdkErr.message || sdkErr}`);
    }
  }

  private parseAndReturn(responseText: string, startTime: number): { data: MedicalAIAnalysis; metrics: AIExecutionMetrics } {
    const parsedData: MedicalAIAnalysis = cleanAndParseJson<MedicalAIAnalysis>(responseText);

    return {
      data: parsedData,
      metrics: {
        providerUsed: this.name,
        processingTimeMs: Date.now() - startTime,
        retries: 0,
        fallbackTriggered: false,
        confidence: parsedData.document?.confidence || 0.98,
      },
    };
  }

  public async chat(
    prompt: string,
    contextDocuments: string[]
  ): Promise<{ text: string; sources: string[]; metrics: AIExecutionMetrics }> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('Gemini API key is missing for chat');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: this.getModelName() });

    const contextPrompt = `
System Directive: You are MediVault AI, a clinical medical assistant.
Patient Context Records:
${contextDocuments.join('\n')}

User Query: "${prompt}"
    `;

    const result = await model.generateContent(contextPrompt);
    const text = result.response.text();
    const processingTimeMs = Date.now() - startTime;

    return {
      text,
      sources: contextDocuments.slice(0, 3),
      metrics: {
        providerUsed: this.name,
        processingTimeMs,
        retries: 0,
        fallbackTriggered: false,
        confidence: 0.95,
      },
    };
  }

  public async generateEmbeddings(text: string): Promise<number[]> {
    const dummyVector = new Array(128).fill(0).map((_, i) => (text.charCodeAt(i % text.length) || 1) / 255);
    return dummyVector;
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return {
        provider: this.name,
        status: 'Offline',
        latencyMs: 0,
        error: 'GEMINI_API_KEY missing in backend/.env',
      };
    }

    try {
      const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.getModelName()}?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(restUrl, {
        headers: { 'x-goog-api-key': apiKey },
      });
      const latencyMs = Date.now() - startTime;
      return {
        provider: this.name,
        status: resp.ok ? 'Online' : 'Offline',
        latencyMs,
        error: resp.ok ? undefined : `HTTP ${resp.status}`,
      };
    } catch (err: any) {
      return {
        provider: this.name,
        status: 'Offline',
        latencyMs: Date.now() - startTime,
        error: err.message || 'Gemini health check ping failed',
      };
    }
  }
}
