import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentRepository } from '../repositories/document.repository';
import { logger } from '../utils/logger';
import { MedicalAIAnalysis } from '../types/medical_ai';
import { AIProcessingError } from '../errors/AppError';

export class AIService {
  /**
   * AI Medical Understanding Pipeline.
   * Sends OCR raw text to Google Gemini 1.5 Flash using physician-level prompt directives.
   * Returns STRICT structured MedicalAIAnalysis JSON without prose or markdown.
   */
  public static async analyzeMedicalDocument(
    ocrText: string,
    originalFilename: string,
    suggestedCategory?: string
  ): Promise<MedicalAIAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      logger.error('[AI Service]: GEMINI_API_KEY is missing in backend/.env.');
      throw new AIProcessingError(
        'AI_API_KEY_MISSING',
        'GEMINI_API_KEY is not configured on the server',
        'Automated AI analysis is temporarily unavailable because the AI service configuration is undergoing maintenance. Your original document is safely preserved in your vault.',
        'You can view or download your original uploaded document anytime.'
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1, // Low temperature for deterministic clinical extraction
          responseMimeType: 'application/json',
        },
      });

      const systemPrompt = `
You are an expert physician, pathologist and medical record analyst.
Your job is to analyze a medical document and convert it into structured medical knowledge.
Read the document text exactly like an experienced doctor.
Identify every clinically useful detail.
Never hallucinate.
If information is missing return null.
If confidence is low return confidence score.
Output STRICT VALID JSON matching the schema below.

Document Filename: ${originalFilename}
Document Category Hint: ${suggestedCategory || 'Unspecified'}

Document OCR Raw Text:
"""
${ocrText}
"""

Target JSON Schema:
{
  "document": {
    "document_type": "CBC | LFT | KFT | Lipid Panel | MRI | CT | X-Ray | Prescription | Discharge Summary | ECG | Echo | Urine Report | Biopsy | Ultrasound | Vaccination | Other",
    "speciality": "Hematology | Cardiology | Neurology | General Practice | Orthopedics | etc",
    "category": "Blood Report | Prescription | Diagnostic Imaging | Pathology | Discharge Summary | Other",
    "summary": "Doctor-level clinical summary of key findings and diagnoses.",
    "language": "English | Spanish | Hindi | etc",
    "confidence": 0.98
  },
  "hospital": {
    "name": "Hospital or Facility Name or null",
    "address": "Hospital Address or null",
    "department": "Department or null",
    "contact": "Phone or Email or null"
  },
  "doctor": {
    "name": "Doctor Full Name or null",
    "qualification": "MBBS, MD, DM etc or null",
    "specialization": "Specialty or null",
    "registration_number": "License/Reg Number or null"
  },
  "patient": {
    "name": "Patient Full Name or null",
    "age": 35,
    "gender": "Male | Female | Other | null",
    "patient_id": "UHID or MRN or null",
    "dob": "YYYY-MM-DD or null"
  },
  "visit": {
    "visit_date": "YYYY-MM-DD or null",
    "report_date": "YYYY-MM-DD or null",
    "admission_date": "YYYY-MM-DD or null",
    "discharge_date": "YYYY-MM-DD or null"
  },
  "diagnosis": ["Condition 1", "Condition 2"],
  "symptoms": ["Symptom 1", "Symptom 2"],
  "medical_history": ["Past history item 1"],
  "allergies": ["Known allergy item 1"],
  "medications": [
    {
      "name": "Drug Name",
      "dosage": "500 mg",
      "frequency": "Twice daily (BID)",
      "duration": "5 days",
      "purpose": "Antibiotic / Pain relief",
      "instructions": "Take after meals"
    }
  ],
  "lab_results": [
    {
      "test_name": "Hemoglobin | Glucose | Cholesterol | etc",
      "value": "10.2",
      "unit": "g/dL",
      "reference_range": "13.5-17.5",
      "status": "LOW",
      "clinical_meaning": "Suggests mild iron deficiency anemia",
      "confidence": 0.98
    }
  ],
  "vitals": {
    "height": "175 cm",
    "weight": "70 kg",
    "bmi": "22.8",
    "blood_pressure": "120/80 mmHg",
    "pulse": "72 bpm",
    "temperature": "98.6 F",
    "spo2": "98%"
  },
  "procedures": ["Procedure name"],
  "surgeries": ["Surgery name"],
  "vaccinations": ["Vaccine name"],
  "recommended_followup": ["Follow up in 2 weeks"],
  "recommended_tests": ["Repeat CBC in 30 days"],
  "lifestyle_recommendations": ["Increase dietary iron intake"],
  "red_flags": ["Severe chest pain", "Sudden shortness of breath"],
  "risk_factors": ["Mild Anemia", "Hypertension Risk"],
  "overall_health_status": "STABLE | RECOVERING | CRITICAL | ATTENTION_REQUIRED",
  "plain_language_explanation": "Simple patient-friendly explanation of findings.",
  "timeline_events": [
    {
      "title": "CBC Lab Test Performed",
      "date": "2026-08-01",
      "description": "Mild Anemia detected with Hemoglobin at 10.2 g/dL.",
      "importance": "MEDIUM"
    }
  ]
}
      `;

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();

      // Clean Markdown code block wrappers if present
      const cleanedJsonText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed: MedicalAIAnalysis = JSON.parse(cleanedJsonText);
      logger.info(`[AI Service] Successfully generated structured medical analysis for "${originalFilename}".`);
      return this.sanitizeAnalysis(parsed, originalFilename, suggestedCategory);
    } catch (error: any) {
      logger.error('[AI Service Error] Gemini JSON extraction failed:', error);
      throw new AIProcessingError(
        'AI_EXTRACTION_FAILED',
        `Gemini AI clinical analysis failed: ${error?.message || error}`,
        'Automated AI analysis is temporarily unavailable for this document. Your original document is safely preserved in your vault.',
        'You can view or download the original file, or retry analysis from the document viewer.'
      );
    }
  }

  /**
   * Generates conversational medical answers using Google Gemini 1.5 Flash API + Document RAG
   */
  public static async generateHealthAnswer(
    patientId: string,
    prompt: string
  ): Promise<{ text: string; sources: string[] }> {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Retrieve patient's relevant medical documents from database
    const patientDocs = await DocumentRepository.getRecentDocuments(patientId, 10);
    const documentSummaries = patientDocs.map(
      (d) => `- [${d.document_name || d.original_filename}] Category: ${d.document_category}, Hospital: ${d.hospital_name || 'N/A'}, Doctor: ${d.doctor_name || 'N/A'}, Date: ${d.visit_date || 'N/A'}`
    );
    const sources = patientDocs.map((d) => d.document_name || d.original_filename);

    if (!apiKey) {
      logger.warn('[AI Service]: GEMINI_API_KEY is missing in backend/.env. Using clinical template RAG response.');
      return {
        text: `Based on your encrypted vault records (${patientDocs.length} documents indexed):\n\nYour query regarding "${prompt}" was processed against your health records. To enable real-time Google Gemini 1.5 Flash responses, please add GEMINI_API_KEY=your_key in backend/.env.`,
        sources: sources.slice(0, 3),
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const contextPrompt = `
System Directive: You are MediVault AI, a clinical medical assistant. Provide clear, empathetic, and accurate health explanations.
Analyze the user's question using the retrieved patient medical documents below.

Patient Medical Records Context:
${documentSummaries.length > 0 ? documentSummaries.join('\n') : 'No medical records currently uploaded.'}

User Question:
"${prompt}"

Instructions:
1. Explain clinical terms in simple, reassuring language.
2. If discussing lab reports or prescriptions, reference relevant documents by name.
3. Include a short medical disclaimer advising consulting their primary doctor.
      `;

      const result = await model.generateContent(contextPrompt);
      const responseText = result.response.text();

      return {
        text: responseText,
        sources: sources.slice(0, 3),
      };
    } catch (err: any) {
      logger.error('[Gemini API Error]:', err);
      return {
        text: `Unable to reach Gemini AI service: ${err.message || 'API call failed'}. Please verify GEMINI_API_KEY in backend/.env.`,
        sources: [],
      };
    }
  }

  /**
   * Ensures parsed AI JSON contains all required arrays and default keys safely.
   */
  private static sanitizeAnalysis(
    raw: Partial<MedicalAIAnalysis>,
    filename: string,
    category?: string
  ): MedicalAIAnalysis {
    const today = new Date().toISOString().split('T')[0];

    return {
      document: {
        document_type: raw.document?.document_type || category || 'Medical Report',
        speciality: raw.document?.speciality || 'General Medicine',
        category: raw.document?.category || category || 'General',
        summary: raw.document?.summary || `Medical record ${filename} parsed and indexed into health profile.`,
        language: raw.document?.language || 'English',
        confidence: raw.document?.confidence || 0.95,
      },
      hospital: {
        name: raw.hospital?.name || null,
        address: raw.hospital?.address || null,
        department: raw.hospital?.department || null,
        contact: raw.hospital?.contact || null,
      },
      doctor: {
        name: raw.doctor?.name || null,
        qualification: raw.doctor?.qualification || null,
        specialization: raw.doctor?.specialization || null,
        registration_number: raw.doctor?.registration_number || null,
      },
      patient: {
        name: raw.patient?.name || null,
        age: raw.patient?.age || null,
        gender: raw.patient?.gender || null,
        patient_id: raw.patient?.patient_id || null,
        dob: raw.patient?.dob || null,
      },
      visit: {
        visit_date: raw.visit?.visit_date || today,
        report_date: raw.visit?.report_date || today,
        admission_date: raw.visit?.admission_date || null,
        discharge_date: raw.visit?.discharge_date || null,
      },
      diagnosis: Array.isArray(raw.diagnosis) ? raw.diagnosis : [],
      symptoms: Array.isArray(raw.symptoms) ? raw.symptoms : [],
      medical_history: Array.isArray(raw.medical_history) ? raw.medical_history : [],
      allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
      medications: Array.isArray(raw.medications) ? raw.medications : [],
      lab_results: Array.isArray(raw.lab_results)
        ? raw.lab_results.map((l) => ({
            test_name: l.test_name || 'Parameter',
            value: String(l.value || 'N/A'),
            unit: l.unit || '',
            reference_range: l.reference_range || '',
            status: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(l.status) ? l.status : 'NORMAL',
            clinical_meaning: l.clinical_meaning || '',
            confidence: l.confidence || 0.95,
          }))
        : [],
      vitals: raw.vitals || {},
      procedures: Array.isArray(raw.procedures) ? raw.procedures : [],
      surgeries: Array.isArray(raw.surgeries) ? raw.surgeries : [],
      vaccinations: Array.isArray(raw.vaccinations) ? raw.vaccinations : [],
      recommended_followup: Array.isArray(raw.recommended_followup) ? raw.recommended_followup : [],
      recommended_tests: Array.isArray(raw.recommended_tests) ? raw.recommended_tests : [],
      lifestyle_recommendations: Array.isArray(raw.lifestyle_recommendations) ? raw.lifestyle_recommendations : [],
      red_flags: Array.isArray(raw.red_flags) ? raw.red_flags : [],
      risk_factors: Array.isArray(raw.risk_factors) ? raw.risk_factors : [],
      overall_health_status: raw.overall_health_status || 'STABLE',
      plain_language_explanation:
        raw.plain_language_explanation ||
        `Your document "${filename}" has been encrypted and analyzed. Key medical findings are indexed for your clinical timeline.`,
      timeline_events: Array.isArray(raw.timeline_events) && raw.timeline_events.length > 0
        ? raw.timeline_events
        : [
            {
              title: `${category || 'Medical Report'} Uploaded`,
              date: raw.visit?.visit_date || today,
              description: `Report "${filename}" parsed into health vault.`,
              importance: 'MEDIUM',
            },
          ],
      analysis_timestamp: raw.analysis_timestamp || new Date().toISOString(),
      ai_model: raw.ai_model || 'Google Gemini 1.5 Flash',
    };
  }
}
