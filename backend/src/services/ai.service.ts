import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentRepository } from '../repositories/document.repository';
import { logger } from '../utils/logger';

export class AIService {
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
}
