import { AIProviderRegistry } from './providers/provider.registry';
import { AIExecutionMetrics } from './providers/ai_provider.interface';
import { CopilotRepository, ChatSession, ChatMessage, PatientRAGContext } from '../../repositories/copilot.repository';
import { logger } from '../../utils/logger';

/**
 * MediVault V2 — AI Copilot Service
 *
 * Core orchestration engine for the patient AI Health Copilot.
 * Implements:
 *   1. SQL-based RAG context building (real document content, not just metadata)
 *   2. Conversation memory via persistent chat sessions
 *   3. Document-focused chat mode
 *   4. Gemini (primary) + NVIDIA NIM (fallback) dual-provider with auto-failover
 *   5. Proactive health insights generation
 *   6. Smart contextual question suggestions
 */
export class CopilotService {

  // ─── Main Chat Handler ─────────────────────────────────────────────

  /**
   * Processes a patient chat message with full RAG context and conversation memory.
   * Supports both general mode (all documents) and document-focused mode.
   *
   * Flow:
   *   1. Load or create chat session
   *   2. Persist user message
   *   3. Build RAG context (actual document content from PostgreSQL)
   *   4. Inject conversation history
   *   5. Call Gemini (primary) → NVIDIA NIM (fallback)
   *   6. Persist AI response
   *   7. Return response with sources + metrics
   */
  public static async chat(params: {
    patientId: string;
    prompt: string;
    sessionId?: string;
    documentId?: string;
  }): Promise<{
    message: ChatMessage;
    session: ChatSession;
    sources: string[];
    metrics: AIExecutionMetrics;
    suggestedFollowUps: string[];
  }> {
    const { patientId, prompt, sessionId, documentId } = params;

    // 1. Load or create session
    let session: ChatSession;
    if (sessionId) {
      const existing = await CopilotRepository.getSession(sessionId);
      session = existing || await CopilotRepository.createSession(
        patientId,
        documentId ? 'document' : 'general',
        documentId
      );
    } else {
      session = await CopilotRepository.createSession(
        patientId,
        documentId ? 'document' : 'general',
        documentId
      );
    }

    // 2. Persist user message
    await CopilotRepository.addMessage(session.id, 'user', prompt);

    // 3. Build RAG context
    let ragContext: string;
    let sources: string[] = [];
    const effectiveDocId = documentId || session.context_document_id;

    if (effectiveDocId) {
      // Document-focused mode — ground answers exclusively in this document
      const docContent = await CopilotRepository.getDocumentFullContent(effectiveDocId);
      if (docContent) {
        ragContext = this.buildDocumentFocusedContext(docContent);
        sources = [docContent.document_name];
      } else {
        ragContext = 'No document content available for the specified document.';
      }
    } else {
      // General mode — pull context from all patient documents
      const fullContext = await CopilotRepository.getPatientRAGContext(patientId, 8);
      ragContext = this.buildGeneralRAGContext(fullContext);
      sources = fullContext.documents.map((d) => d.document_name).slice(0, 5);
    }

    // 4. Load conversation history
    const recentMessages = await CopilotRepository.getRecentMessages(session.id, 16);
    const conversationHistory = this.buildConversationHistory(recentMessages);

    // 5. Build the full system prompt
    const systemPrompt = this.buildSystemPrompt(ragContext, conversationHistory, prompt, effectiveDocId ? 'document' : 'general');

    // 6. Call AI with failover (Gemini → NVIDIA NIM)
    const startTime = Date.now();
    let aiText: string;
    let metrics: AIExecutionMetrics;

    const primaryName = (process.env.COPILOT_PRIMARY_MODEL || process.env.PRIMARY_MEDICAL_MODEL || 'gemini').toLowerCase();
    const fallbackName = (process.env.COPILOT_FALLBACK_MODEL || process.env.FALLBACK_MEDICAL_MODEL || 'nvidia').toLowerCase();
    const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '2', 10);

    const primaryProvider = AIProviderRegistry.getProvider(primaryName);
    const fallbackProvider = AIProviderRegistry.getProvider(fallbackName);

    let retries = 0;
    let fallbackTriggered = false;

    // Try primary provider (Gemini) with retries
    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          const delayMs = Math.min(1000 * Math.pow(2, retries - 1) + Math.random() * 200, 6000);
          logger.info(`[Copilot Service] Retrying primary "${primaryName}" (Attempt ${retries}/${maxRetries}) after ${Math.round(delayMs)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          logger.info(`[Copilot Service] Invoking primary chat provider "${primaryName}"...`);
        }

        const result = await primaryProvider.chat(systemPrompt, sources);
        aiText = result.text;
        metrics = {
          ...result.metrics,
          retries,
          fallbackTriggered: false,
        };

        // Successful — break out of retry loop
        break;
      } catch (err: any) {
        retries++;
        const errMessage = err.message || String(err);
        const isTransient = errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('500') || errMessage.includes('timeout');

        logger.warn(`[Copilot Service] Primary "${primaryName}" failed (Attempt ${retries}/${maxRetries + 1}): ${errMessage}`);

        if (!isTransient || retries > maxRetries) {
          logger.warn(`[Copilot Service] Triggering failover to "${fallbackName}"...`);
          break;
        }
      }
    }

    // If primary failed all retries, try fallback (NVIDIA NIM)
    if (!aiText!) {
      fallbackTriggered = true;
      try {
        logger.info(`[Copilot Service] Executing fallback provider "${fallbackName}"...`);
        const fallbackResult = await fallbackProvider.chat(systemPrompt, sources);
        aiText = fallbackResult.text;
        metrics = {
          ...fallbackResult.metrics,
          retries,
          fallbackTriggered: true,
        };
      } catch (fallbackErr: any) {
        logger.error(`[Copilot Service] Both providers failed:`, fallbackErr);
        aiText = `I apologize, but I'm temporarily unable to process your request. Both AI engines (${primaryName} and ${fallbackName}) are currently unavailable. Please try again in a few moments.\n\nIn the meantime, you can review your uploaded documents directly in the Reports section.`;
        metrics = {
          providerUsed: 'fallback_error',
          processingTimeMs: Date.now() - startTime,
          retries,
          fallbackTriggered: true,
          confidence: 0,
          errorMessage: fallbackErr.message,
        };
      }
    }

    // 7. Persist AI response
    const aiMessage = await CopilotRepository.addMessage(
      session.id,
      'assistant',
      aiText!,
      sources,
      { ...metrics!, provider: metrics!.providerUsed }
    );

    // 8. Auto-title the session after first user message
    if (session.message_count <= 1) {
      const autoTitle = this.generateSessionTitle(prompt);
      await CopilotRepository.updateSessionTitle(session.id, autoTitle);
      session.title = autoTitle;
    }

    // 9. Generate follow-up suggestions
    const suggestedFollowUps = this.generateFollowUpSuggestions(prompt, aiText!, effectiveDocId ? 'document' : 'general');

    return {
      message: aiMessage,
      session,
      sources,
      metrics: metrics!,
      suggestedFollowUps,
    };
  }

  // ─── Session Management ────────────────────────────────────────────

  public static async createSession(patientId: string, mode: 'general' | 'document', documentId?: string): Promise<ChatSession> {
    return CopilotRepository.createSession(patientId, mode, documentId);
  }

  public static async listSessions(patientId: string): Promise<ChatSession[]> {
    return CopilotRepository.listSessions(patientId);
  }

  public static async getSessionWithMessages(sessionId: string): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
  } | null> {
    const session = await CopilotRepository.getSession(sessionId);
    if (!session) return null;
    const messages = await CopilotRepository.getMessages(sessionId);
    return { session, messages };
  }

  public static async archiveSession(sessionId: string): Promise<boolean> {
    return CopilotRepository.archiveSession(sessionId);
  }

  // ─── Health Insights ───────────────────────────────────────────────

  public static async getHealthInsights(patientId: string) {
    return CopilotRepository.getHealthInsights(patientId);
  }

  // ─── Smart Suggestions ─────────────────────────────────────────────

  /**
   * Generates context-aware question suggestions based on the patient's actual documents.
   */
  public static async getSmartSuggestions(patientId: string): Promise<string[]> {
    const context = await CopilotRepository.getPatientRAGContext(patientId, 5);
    const suggestions: string[] = [];

    // Generate suggestions based on actual documents
    for (const doc of context.documents) {
      const analysis = doc.ai_analysis;
      if (!analysis) continue;

      if (doc.document_category === 'Blood Report' || analysis.document?.document_type?.includes('CBC')) {
        suggestions.push(`Explain the results of my ${doc.document_name}`);
      }

      if (analysis.medications && analysis.medications.length > 0) {
        suggestions.push(`What are the side effects of ${analysis.medications[0].name}?`);
      }

      if (analysis.diagnosis && analysis.diagnosis.length > 0) {
        suggestions.push(`Tell me more about ${analysis.diagnosis[0]}`);
      }

      if (analysis.lab_results && analysis.lab_results.some((l: any) => l.status === 'HIGH' || l.status === 'LOW' || l.status === 'CRITICAL')) {
        const abnormal = analysis.lab_results.find((l: any) => l.status !== 'NORMAL');
        if (abnormal) {
          suggestions.push(`Why is my ${abnormal.test_name} ${abnormal.status?.toLowerCase()}?`);
        }
      }
    }

    // Add general health suggestions if we don't have enough document-specific ones
    const generalSuggestions = [
      'Give me a summary of my overall health',
      'What follow-up tests do I need?',
      'Do I have any drug interactions I should know about?',
      'Explain my most recent diagnosis in simple terms',
    ];

    while (suggestions.length < 4 && generalSuggestions.length > 0) {
      suggestions.push(generalSuggestions.shift()!);
    }

    // Deduplicate and limit to 6
    return [...new Set(suggestions)].slice(0, 6);
  }

  // ─── RAG Context Builders ──────────────────────────────────────────

  /**
   * Builds rich context from ALL patient documents for general chat mode.
   * Includes actual OCR text and AI analysis summaries — real RAG, not fake metadata.
   */
  private static buildGeneralRAGContext(context: PatientRAGContext): string {
    const parts: string[] = [];

    // Patient profile
    if (context.patient_profile) {
      const p = context.patient_profile;
      const profileLines = [
        p.blood_group ? `Blood Group: ${p.blood_group}` : null,
        p.gender ? `Gender: ${p.gender}` : null,
        p.date_of_birth ? `Date of Birth: ${p.date_of_birth}` : null,
        p.allergies.length > 0 ? `Known Allergies: ${p.allergies.join(', ')}` : null,
        p.chronic_conditions.length > 0 ? `Chronic Conditions: ${p.chronic_conditions.join(', ')}` : null,
      ].filter(Boolean);
      if (profileLines.length > 0) {
        parts.push(`=== PATIENT PROFILE ===\n${profileLines.join('\n')}`);
      }
    }

    // Document summaries with actual content
    if (context.documents.length > 0) {
      parts.push('=== MEDICAL DOCUMENTS ===');
      for (const doc of context.documents) {
        const docParts = [`\n--- Document: "${doc.document_name}" (${doc.document_category}) ---`];
        if (doc.visit_date) docParts.push(`Date: ${doc.visit_date}`);
        if (doc.hospital_name) docParts.push(`Hospital: ${doc.hospital_name}`);
        if (doc.doctor_name) docParts.push(`Doctor: ${doc.doctor_name}`);

        // ACTUAL CLINICAL CONTENT — this is the real RAG
        if (doc.clinical_summary) {
          docParts.push(`Clinical Summary: ${doc.clinical_summary}`);
        }

        // Include AI analysis details
        if (doc.ai_analysis) {
          const a = doc.ai_analysis;
          if (a.diagnosis?.length > 0) docParts.push(`Diagnoses: ${a.diagnosis.join(', ')}`);
          if (a.medications?.length > 0) {
            const medList = a.medications.map((m: any) => `${m.name} ${m.dosage || ''} (${m.frequency || ''})`).join('; ');
            docParts.push(`Medications: ${medList}`);
          }
          if (a.lab_results?.length > 0) {
            const labList = a.lab_results.slice(0, 8).map((l: any) =>
              `${l.test_name}: ${l.value} ${l.unit || ''} [${l.status || 'N/A'}] (Ref: ${l.reference_range || 'N/A'})`
            ).join('; ');
            docParts.push(`Lab Results: ${labList}`);
          }
          if (a.overall_health_status) docParts.push(`Status: ${a.overall_health_status}`);
          if (a.plain_language_explanation) docParts.push(`Summary: ${a.plain_language_explanation}`);
        }

        // Include a portion of OCR text for deep grounding
        if (doc.ocr_text) {
          const truncated = doc.ocr_text.slice(0, 1500);
          docParts.push(`Raw Document Text (excerpt): ${truncated}`);
        }

        parts.push(docParts.join('\n'));
      }
    }

    // Structured medical knowledge
    if (context.medical_knowledge.length > 0) {
      parts.push('\n=== MEDICAL KNOWLEDGE (Structured Records) ===');
      const grouped = new Map<string, string[]>();
      for (const mk of context.medical_knowledge) {
        const type = mk.knowledge_type || 'general';
        if (!grouped.has(type)) grouped.set(type, []);
        grouped.get(type)!.push(
          `${mk.name}: ${mk.value || 'N/A'} ${mk.unit || ''} [${mk.status}] (Ref: ${mk.reference_range || 'N/A'})`
        );
      }
      for (const [type, entries] of grouped) {
        parts.push(`${type.toUpperCase()}: ${entries.join('; ')}`);
      }
    }

    return parts.join('\n') || 'No medical records found in the patient vault.';
  }

  /**
   * Builds deep context for document-focused chat mode.
   * Provides the FULL document content so AI answers are grounded exclusively in it.
   */
  private static buildDocumentFocusedContext(doc: {
    document_name: string;
    document_category: string;
    ocr_text: string | null;
    clinical_summary: string | null;
    ai_analysis: any;
  }): string {
    const parts: string[] = [
      `=== FOCUSED DOCUMENT: "${doc.document_name}" (${doc.document_category}) ===`,
      'You must answer ONLY based on the content of this specific document.',
      'If the answer is not found in this document, say so clearly.',
    ];

    if (doc.clinical_summary) {
      parts.push(`\nClinical Summary:\n${doc.clinical_summary}`);
    }

    if (doc.ai_analysis) {
      const a = doc.ai_analysis;
      if (a.document?.summary) parts.push(`\nDetailed Summary:\n${a.document.summary}`);
      if (a.diagnosis?.length > 0) parts.push(`\nDiagnoses: ${a.diagnosis.join(', ')}`);
      if (a.symptoms?.length > 0) parts.push(`Symptoms: ${a.symptoms.join(', ')}`);
      if (a.medications?.length > 0) {
        parts.push('\nMedications:');
        a.medications.forEach((m: any) => {
          parts.push(`  - ${m.name} ${m.dosage || ''}, ${m.frequency || ''}, ${m.duration || ''} — ${m.purpose || ''} | ${m.instructions || ''}`);
        });
      }
      if (a.lab_results?.length > 0) {
        parts.push('\nLab Results:');
        a.lab_results.forEach((l: any) => {
          parts.push(`  - ${l.test_name}: ${l.value} ${l.unit || ''} [${l.status}] (Ref: ${l.reference_range || 'N/A'}) — ${l.clinical_meaning || ''}`);
        });
      }
      if (a.red_flags?.length > 0) parts.push(`\nRed Flags: ${a.red_flags.join(', ')}`);
      if (a.recommended_followup?.length > 0) parts.push(`Follow-up: ${a.recommended_followup.join(', ')}`);
      if (a.recommended_tests?.length > 0) parts.push(`Recommended Tests: ${a.recommended_tests.join(', ')}`);
      if (a.plain_language_explanation) parts.push(`\nPatient Explanation:\n${a.plain_language_explanation}`);
    }

    // Include full OCR text for maximum grounding
    if (doc.ocr_text) {
      parts.push(`\nFull Document Text:\n${doc.ocr_text.slice(0, 4000)}`);
    }

    return parts.join('\n');
  }

  /**
   * Converts recent chat messages into a conversation history string for the LLM.
   */
  private static buildConversationHistory(messages: ChatMessage[]): string {
    if (messages.length === 0) return '';

    // Exclude the current user message (already part of the prompt)
    const history = messages.slice(0, -1);
    if (history.length === 0) return '';

    const lines = history.map((m) => {
      const role = m.role === 'user' ? 'Patient' : 'MediVault AI';
      // Truncate very long messages in history to save tokens
      const content = m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content;
      return `${role}: ${content}`;
    });

    return `=== CONVERSATION HISTORY ===\n${lines.join('\n')}\n=== END HISTORY ===`;
  }

  /**
   * Builds the complete system prompt with RAG context, conversation history, and user question.
   */
  private static buildSystemPrompt(
    ragContext: string,
    conversationHistory: string,
    userQuestion: string,
    mode: 'general' | 'document'
  ): string {
    const modeInstruction = mode === 'document'
      ? 'You are in DOCUMENT-FOCUSED MODE. Answer ONLY based on the specific document provided. If the information is not in the document, clearly state that.'
      : 'You are in GENERAL MODE. Use all available patient medical records to provide comprehensive answers.';

    return `You are MediVault AI Health Copilot — a clinical medical assistant designed to help patients understand their health records.

CORE DIRECTIVES:
1. ${modeInstruction}
2. Explain medical terms in clear, empathetic language that patients can understand.
3. When discussing lab results, always mention the value, reference range, and what it means clinically.
4. Reference specific documents by name when citing information.
5. If discussing medications, include dosage, purpose, and any important safety notes.
6. Always include a brief medical disclaimer advising the patient to consult their physician for diagnosis.
7. Use markdown formatting: **bold** for key terms, bullet lists for clarity, and headers for sections.
8. Be concise but thorough. Structure your response for readability.
9. If you don't have enough information to answer accurately, say so honestly rather than guessing.

PATIENT MEDICAL CONTEXT:
${ragContext}

${conversationHistory ? `\n${conversationHistory}\n` : ''}
Patient's Question: "${userQuestion}"

Respond helpfully and professionally:`;
  }

  // ─── Utility Methods ───────────────────────────────────────────────

  /**
   * Generates a concise session title from the first user message.
   */
  private static generateSessionTitle(firstMessage: string): string {
    const cleaned = firstMessage.trim().replace(/[?!.]+$/, '');
    if (cleaned.length <= 40) return cleaned;
    // Take first meaningful portion
    const words = cleaned.split(/\s+/).slice(0, 6);
    return words.join(' ') + '...';
  }

  /**
   * Generates context-aware follow-up question suggestions.
   */
  private static generateFollowUpSuggestions(
    userQuestion: string,
    aiResponse: string,
    mode: 'general' | 'document'
  ): string[] {
    const suggestions: string[] = [];
    const lowerQ = userQuestion.toLowerCase();
    const lowerA = aiResponse.toLowerCase();

    // Pattern-based follow-up generation
    if (lowerQ.includes('lab') || lowerQ.includes('report') || lowerQ.includes('test') || lowerQ.includes('result')) {
      suggestions.push('Are any of my values outside the normal range?');
      suggestions.push('How do my results compare to my previous reports?');
    }

    if (lowerQ.includes('medication') || lowerQ.includes('medicine') || lowerQ.includes('drug') || lowerQ.includes('prescription')) {
      suggestions.push('Are there any drug interactions I should be aware of?');
      suggestions.push('What are the common side effects?');
    }

    if (lowerQ.includes('diagnosis') || lowerQ.includes('condition') || lowerA.includes('diagnosis')) {
      suggestions.push('What lifestyle changes would help with this condition?');
      suggestions.push('What follow-up tests should I get?');
    }

    if (lowerA.includes('hemoglobin') || lowerA.includes('anemia') || lowerA.includes('iron')) {
      suggestions.push('What foods can help improve my iron levels?');
    }

    if (lowerA.includes('cholesterol') || lowerA.includes('lipid') || lowerA.includes('triglyceride')) {
      suggestions.push('What diet changes would improve my cholesterol levels?');
    }

    // General follow-ups
    if (suggestions.length < 3) {
      suggestions.push('Summarize my overall health status');
      suggestions.push('What should I discuss with my doctor at my next visit?');
    }

    if (mode === 'document') {
      suggestions.push('Explain this document in simpler terms');
    }

    return [...new Set(suggestions)].slice(0, 4);
  }
}
