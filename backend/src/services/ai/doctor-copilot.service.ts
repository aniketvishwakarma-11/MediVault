import { AIProviderRegistry } from './providers/provider.registry';
import { AIExecutionMetrics } from './providers/ai_provider.interface';
import {
  DoctorCopilotRepository,
  DoctorChatSession,
  DoctorChatMessage,
  PatientClinicalBrief,
  ClinicalAlert,
} from '../../repositories/doctor-copilot.repository';
import { logger } from '../../utils/logger';

/**
 * MediVault — Doctor AI Copilot Service
 *
 * Clinical-grade AI copilot for physicians with access to consented patient EMRs.
 *
 * Capabilities:
 *   1. Clinical RAG chat — Q&A over patient's full medical history in clinical language
 *   2. Auto patient brief — structured brief generated when doctor opens a patient
 *   3. Clinical tools:
 *      - Drug interaction analysis (LLM-based)
 *      - Lab trend analysis
 *      - Differential diagnosis
 *      - Risk stratification
 *      - Report comparison
 *   4. Proactive clinical alerts
 *   5. Smart clinical follow-up suggestions
 *
 * Architecture mirrors CopilotService but uses:
 *   - DoctorCopilotRepository (doctor + patient scoped sessions)
 *   - Clinical-grade system prompt (clinical language, ICD codes, evidence-based)
 *   - Consent verification gate before any RAG access
 *   - Tool audit logging for compliance
 */
export class DoctorCopilotService {

  // ─── Core Clinical Chat ────────────────────────────────────────────────────

  /**
   * Processes a doctor's clinical question about a consented patient.
   * Full RAG over all patient documents (OCR text + AI analysis + medical knowledge).
   *
   * Flow:
   *   1. Verify active consent (doctor → patient)
   *   2. Load or create doctor-scoped session
   *   3. Persist doctor message
   *   4. Build clinical RAG context from all patient documents
   *   5. Inject conversation history
   *   6. Build clinical system prompt
   *   7. Call Gemini (primary) → NVIDIA NIM (fallback)
   *   8. Persist AI response with sources
   *   9. Generate clinical follow-up suggestions
   */
  public static async chat(params: {
    doctorId: string;
    patientId: string;
    prompt: string;
    sessionId?: string;
  }): Promise<{
    message: DoctorChatMessage;
    session: DoctorChatSession;
    sources: string[];
    metrics: AIExecutionMetrics;
    suggestedFollowUps: string[];
  }> {
    const { doctorId, patientId, prompt, sessionId } = params;

    // 1. Verify consent
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) {
      throw new Error('Access denied: No active consent grant from this patient.');
    }

    // 2. Load or create session
    let session: DoctorChatSession;
    if (sessionId) {
      const existing = await DoctorCopilotRepository.getSession(sessionId);
      session = existing || await DoctorCopilotRepository.createSession(doctorId, patientId);
    } else {
      session = await DoctorCopilotRepository.createSession(doctorId, patientId);
    }

    // 3. Persist doctor message
    await DoctorCopilotRepository.addMessage(session.id, 'doctor', prompt);

    // 4. Build clinical RAG context (all patient documents — full consent model)
    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 15);
    const ragContext = this.buildClinicalRAGContext(ragData);
    const sources = ragData.documents.map((d) => d.document_name).slice(0, 6);

    // 5. Conversation history
    const recentMessages = await DoctorCopilotRepository.getRecentMessages(session.id, 16);
    const conversationHistory = this.buildConversationHistory(recentMessages);

    // 6. Clinical system prompt
    const systemPrompt = this.buildClinicalSystemPrompt(ragContext, conversationHistory, prompt);

    // 7. AI call with failover
    const primaryName = (process.env.COPILOT_PRIMARY_MODEL || 'gemini').toLowerCase();
    const fallbackName = (process.env.COPILOT_FALLBACK_MODEL || 'nvidia').toLowerCase();
    const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '2', 10);

    const primaryProvider = AIProviderRegistry.getProvider(primaryName);
    const fallbackProvider = AIProviderRegistry.getProvider(fallbackName);

    const startTime = Date.now();
    let aiText: string = '';
    let metrics: AIExecutionMetrics = {
      providerUsed: primaryName,
      processingTimeMs: 0,
      retries: 0,
      fallbackTriggered: false,
      confidence: 0,
    };
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
          await new Promise((r) => setTimeout(r, delay));
        }
        const result = await primaryProvider.chat(systemPrompt, sources);
        aiText = result.text;
        metrics = { ...result.metrics, retries, fallbackTriggered: false };
        break;
      } catch (err: any) {
        retries++;
        const isTransient = /429|quota|500|timeout/i.test(err.message || '');
        if (!isTransient || retries > maxRetries) break;
      }
    }

    if (!aiText) {
      try {
        const fallbackResult = await fallbackProvider.chat(systemPrompt, sources);
        aiText = fallbackResult.text;
        metrics = { ...fallbackResult.metrics, retries, fallbackTriggered: true };
      } catch (fallbackErr: any) {
        logger.error('[DoctorCopilotService] Both providers failed:', fallbackErr);
        aiText = `I'm temporarily unable to process this request — both AI engines are unavailable. Please retry in a moment.`;
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

    // 8. Persist AI response
    const aiMessage = await DoctorCopilotRepository.addMessage(
      session.id, 'assistant', aiText, sources, [],
      { provider: metrics.providerUsed, latencyMs: metrics.processingTimeMs }
    );

    // Auto-title session after first message
    if (session.message_count <= 1) {
      const title = this.generateSessionTitle(prompt);
      await DoctorCopilotRepository.updateSessionTitle(session.id, title);
      session.title = title;
    }

    // 9. Clinical follow-up suggestions
    const suggestedFollowUps = this.generateClinicalFollowUps(prompt, aiText);

    return { message: aiMessage, session, sources, metrics, suggestedFollowUps };
  }

  // ─── Session Management ────────────────────────────────────────────────────

  public static async createSession(doctorId: string, patientId: string, title?: string): Promise<DoctorChatSession> {
    return DoctorCopilotRepository.createSession(doctorId, patientId, title);
  }

  public static async listSessions(doctorId: string, patientId: string): Promise<DoctorChatSession[]> {
    return DoctorCopilotRepository.listSessions(doctorId, patientId);
  }

  public static async getSessionWithMessages(sessionId: string): Promise<{
    session: DoctorChatSession;
    messages: DoctorChatMessage[];
  } | null> {
    const session = await DoctorCopilotRepository.getSession(sessionId);
    if (!session) return null;
    const messages = await DoctorCopilotRepository.getMessages(sessionId);
    return { session, messages };
  }

  public static async archiveSession(sessionId: string): Promise<boolean> {
    return DoctorCopilotRepository.archiveSession(sessionId);
  }

  // ─── AI Patient Brief ──────────────────────────────────────────────────────

  /**
   * Returns a cached brief if available and fresh (<30 min), otherwise regenerates.
   * The brief is a structured clinical summary auto-generated when the doctor opens a patient.
   */
  public static async getOrGenerateBrief(doctorId: string, patientId: string): Promise<PatientClinicalBrief> {
    // Try cache first
    const cached = await DoctorCopilotRepository.getCachedBrief(doctorId, patientId);
    if (cached) return cached;

    // Generate fresh brief
    return this.generateBrief(doctorId, patientId);
  }

  public static async generateBrief(doctorId: string, patientId: string): Promise<PatientClinicalBrief> {
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) {
      throw new Error('Access denied: No active consent grant from this patient.');
    }

    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 15);
    const ragContext = this.buildClinicalRAGContext(ragData);

    const briefPrompt = this.buildBriefGenerationPrompt(ragContext);
    const primaryProvider = AIProviderRegistry.getProvider('gemini');

    let rawBrief: string;
    try {
      const result = await primaryProvider.chat(briefPrompt, []);
      rawBrief = result.text;
    } catch (err: any) {
      logger.warn('[DoctorCopilotService] Brief generation failed, trying fallback:', err.message);
      const fallback = AIProviderRegistry.getProvider('nvidia');
      const fallbackResult = await fallback.chat(briefPrompt, []);
      rawBrief = fallbackResult.text;
    }

    const brief: PatientClinicalBrief = {
      patient_name: ragData.patient_profile?.full_name || 'Unknown Patient',
      age: this.calculateAge(ragData.patient_profile?.date_of_birth),
      gender: ragData.patient_profile?.gender || null,
      blood_group: ragData.patient_profile?.blood_group || null,
      critical_flags: this.extractCriticalFlags(ragData),
      active_conditions: ragData.patient_profile?.chronic_conditions || [],
      current_medications: this.extractCurrentMedications(ragData),
      drug_warnings: [],
      pending_items: [],
      trend_snapshot: '',
      generated_at: new Date().toISOString(),
      raw_brief: rawBrief,
    };

    // Cache it
    await DoctorCopilotRepository.saveBrief(doctorId, patientId, brief);

    // Generate and save alerts as a side effect
    this.generateAndSaveAlerts(doctorId, patientId, ragData).catch((e) =>
      logger.warn('[DoctorCopilotService] Alert generation error:', e)
    );

    return brief;
  }

  // ─── Clinical Tools ────────────────────────────────────────────────────────

  /**
   * LLM-based drug interaction checker.
   * Lists all medications from patient documents and asks the LLM to identify interactions.
   */
  public static async checkDrugInteractions(
    doctorId: string,
    patientId: string,
    additionalDrugs: string[] = []
  ): Promise<{
    interactions: string;
    medications_checked: string[];
    sources: string[];
  }> {
    const t0 = Date.now();
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) throw new Error('Access denied: No active consent grant.');

    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 15);
    const medications = this.extractCurrentMedications(ragData);
    const allMeds = [
      ...medications.map((m) => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`.trim()),
      ...additionalDrugs,
    ];

    if (allMeds.length === 0) {
      return { interactions: 'No medications found in patient records.', medications_checked: [], sources: [] };
    }

    const prompt = `You are a clinical pharmacologist AI reviewing a patient's medication list for drug-drug interactions.

PATIENT MEDICATION LIST:
${allMeds.map((m, i) => `${i + 1}. ${m}`).join('\n')}

PATIENT CONTEXT:
${ragData.patient_profile?.allergies?.length ? `Known Allergies: ${(ragData.patient_profile.allergies as string[]).join(', ')}` : 'No known allergies on record.'}
${ragData.patient_profile?.chronic_conditions?.length ? `Chronic Conditions: ${(ragData.patient_profile.chronic_conditions as string[]).join(', ')}` : ''}

TASK:
1. Identify all clinically significant drug-drug interactions in this list.
2. Flag any contraindications given the patient's conditions/allergies.
3. Rate each interaction: [MAJOR] [MODERATE] [MINOR]
4. Provide a brief clinical management note for each significant interaction.
5. Conclude with an overall safety assessment.

Be precise and clinically accurate. Use established pharmacology references (Micromedex, FDA labeling).`;

    const provider = AIProviderRegistry.getProvider('gemini');
    let interactionText: string;
    try {
      const result = await provider.chat(prompt, []);
      interactionText = result.text;
    } catch {
      const fallback = AIProviderRegistry.getProvider('nvidia');
      const result = await fallback.chat(prompt, []);
      interactionText = result.text;
    }

    const sources = ragData.documents
      .filter((d) => d.ai_analysis?.medications?.length > 0)
      .map((d) => d.document_name)
      .slice(0, 5);

    await DoctorCopilotRepository.logToolUse(
      doctorId, patientId, 'drug_interaction_check',
      { medications: allMeds },
      interactionText.slice(0, 200),
      Date.now() - t0
    );

    return { interactions: interactionText, medications_checked: allMeds, sources };
  }

  /**
   * Differential diagnosis suggestion based on symptoms + patient history.
   */
  public static async differentialDiagnosis(
    doctorId: string,
    patientId: string,
    symptoms: string[],
    additionalContext: string = ''
  ): Promise<{ differential: string; sources: string[] }> {
    const t0 = Date.now();
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) throw new Error('Access denied: No active consent grant.');

    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 12);
    const ragContext = this.buildClinicalRAGContext(ragData);

    const prompt = `You are a clinical diagnostician AI assisting a physician with differential diagnosis.

PRESENTING SYMPTOMS:
${symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${additionalContext ? `\nAdditional Clinical Context: ${additionalContext}` : ''}

PATIENT MEDICAL HISTORY:
${ragContext}

TASK:
Generate a structured differential diagnosis list. For each diagnosis:
1. **Diagnosis name** (include ICD-10 code)
2. Supporting evidence from patient history
3. Arguments against
4. Recommended confirmatory workup
5. Priority level: [MUST RULE OUT] [HIGH PROBABILITY] [CONSIDER] [UNLIKELY]

Format clinically. Be thorough but ranked by probability given this patient's specific history.`;

    const provider = AIProviderRegistry.getProvider('gemini');
    let differential: string;
    try {
      const result = await provider.chat(prompt, []);
      differential = result.text;
    } catch {
      const fallback = AIProviderRegistry.getProvider('nvidia');
      const result = await fallback.chat(prompt, []);
      differential = result.text;
    }

    const sources = ragData.documents.map((d) => d.document_name).slice(0, 5);

    await DoctorCopilotRepository.logToolUse(
      doctorId, patientId, 'differential_diagnosis',
      { symptoms, additionalContext },
      differential.slice(0, 200),
      Date.now() - t0
    );

    return { differential, sources };
  }

  /**
   * Lab trend analysis — asks AI to interpret a specific lab value's trend over time.
   */
  public static async analyzeLabTrend(
    doctorId: string,
    patientId: string,
    testName: string
  ): Promise<{ analysis: string; data_points: Array<{ date: string; value: string; unit: string; status: string }>; sources: string[] }> {
    const t0 = Date.now();
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) throw new Error('Access denied: No active consent grant.');

    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 20);

    // Collect all data points for this test across all documents
    const dataPoints: Array<{ date: string; value: string; unit: string; status: string }> = [];
    const sources: string[] = [];

    for (const doc of ragData.documents) {
      if (!doc.ai_analysis?.lab_results) continue;
      const matchingLabs = (doc.ai_analysis.lab_results as any[]).filter(
        (l) => l.test_name?.toLowerCase().includes(testName.toLowerCase())
      );
      for (const lab of matchingLabs) {
        dataPoints.push({
          date: doc.visit_date || doc.created_at.slice(0, 10),
          value: lab.value || 'N/A',
          unit: lab.unit || '',
          status: lab.status || 'N/A',
        });
        if (!sources.includes(doc.document_name)) sources.push(doc.document_name);
      }
    }

    // Also check medical_knowledge table
    const mkPoints = ragData.medical_knowledge.filter(
      (mk) => mk.name?.toLowerCase().includes(testName.toLowerCase())
    );
    for (const mk of mkPoints) {
      dataPoints.push({
        date: mk.recorded_date || 'Unknown',
        value: mk.value || 'N/A',
        unit: mk.unit || '',
        status: mk.status || 'N/A',
      });
    }

    // Sort by date ascending
    dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (dataPoints.length === 0) {
      return {
        analysis: `No ${testName} values found in patient records.`,
        data_points: [],
        sources: [],
      };
    }

    const trendSummary = dataPoints
      .map((p) => `${p.date}: ${p.value} ${p.unit} [${p.status}]`)
      .join('\n');

    const prompt = `You are a clinical laboratory medicine specialist interpreting lab trends.

TEST: ${testName}
PATIENT HISTORY:
${ragData.patient_profile ? `Conditions: ${(ragData.patient_profile.chronic_conditions || []).join(', ') || 'None'}` : ''}

TREND DATA (chronological):
${trendSummary}

Provide a concise clinical interpretation:
1. Is this value trending up, down, or stable?
2. Is the trend clinically significant?
3. At what point did it become abnormal, if at all?
4. What could be driving this trend given the patient's conditions?
5. What immediate clinical action (if any) is recommended?
6. When should this be re-checked?`;

    const provider = AIProviderRegistry.getProvider('gemini');
    let analysis: string;
    try {
      const result = await provider.chat(prompt, []);
      analysis = result.text;
    } catch {
      const fallback = AIProviderRegistry.getProvider('nvidia');
      const result = await fallback.chat(prompt, []);
      analysis = result.text;
    }

    await DoctorCopilotRepository.logToolUse(
      doctorId, patientId, 'lab_trend_analysis',
      { testName, dataPoints: dataPoints.length },
      analysis.slice(0, 200),
      Date.now() - t0
    );

    return { analysis, data_points: dataPoints, sources };
  }

  /**
   * Risk stratification using established clinical scoring rubrics.
   */
  public static async calculateRiskScore(
    doctorId: string,
    patientId: string,
    scoreType: 'cardiovascular' | 'diabetes_complications' | 'ckd_progression' | 'general'
  ): Promise<{ score: string; sources: string[] }> {
    const t0 = Date.now();
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) throw new Error('Access denied: No active consent grant.');

    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 15);
    const ragContext = this.buildClinicalRAGContext(ragData);

    const scorePrompts: Record<string, string> = {
      cardiovascular: 'Use Framingham Risk Score and ACC/AHA ASCVD 10-year risk calculator principles',
      diabetes_complications: 'Assess risk using ADA 2024 Standards of Care (HbA1c, nephropathy, retinopathy, neuropathy markers)',
      ckd_progression: 'Apply KDIGO 2024 CKD staging (GFR + albuminuria), assess progression risk',
      general: 'Provide a comprehensive multi-system risk assessment covering cardiovascular, metabolic, and renal risks',
    };

    const prompt = `You are a clinical risk assessment AI. ${scorePrompts[scoreType]}.

PATIENT DATA:
${ragContext}

TASK:
1. Identify all relevant risk factors from the patient's records
2. Apply the appropriate risk scoring methodology
3. Calculate/estimate the risk score or category
4. Provide a clinical interpretation of the score
5. List the 3 most important modifiable risk factors for this patient
6. Recommend specific interventions based on risk level and current guidelines`;

    const provider = AIProviderRegistry.getProvider('gemini');
    let score: string;
    try {
      const result = await provider.chat(prompt, []);
      score = result.text;
    } catch {
      const fallback = AIProviderRegistry.getProvider('nvidia');
      const result = await fallback.chat(prompt, []);
      score = result.text;
    }

    const sources = ragData.documents.map((d) => d.document_name).slice(0, 5);

    await DoctorCopilotRepository.logToolUse(
      doctorId, patientId, 'risk_stratification',
      { scoreType },
      score.slice(0, 200),
      Date.now() - t0
    );

    return { score, sources };
  }

  /**
   * Side-by-side comparison of two patient documents.
   */
  public static async compareReports(
    doctorId: string,
    patientId: string,
    docId1: string,
    docId2: string
  ): Promise<{ comparison: string; sources: string[] }> {
    const t0 = Date.now();
    const hasConsent = await DoctorCopilotRepository.hasActiveConsent(doctorId, patientId);
    if (!hasConsent) throw new Error('Access denied: No active consent grant.');

    const ragData = await DoctorCopilotRepository.getPatientRAGContext(patientId, 30);
    const doc1 = ragData.documents.find((d) => d.document_id === docId1);
    const doc2 = ragData.documents.find((d) => d.document_id === docId2);

    if (!doc1 || !doc2) {
      throw new Error('One or both documents not found in patient records.');
    }

    const formatDoc = (doc: typeof doc1) => `
Document: "${doc.document_name}" (${doc.document_category})
Date: ${doc.visit_date || doc.created_at.slice(0, 10)}
${doc.clinical_summary ? `Summary: ${doc.clinical_summary}` : ''}
${doc.ai_analysis?.lab_results?.length
  ? `Lab Results:\n${(doc.ai_analysis.lab_results as any[]).map((l: any) => `  - ${l.test_name}: ${l.value} ${l.unit || ''} [${l.status}]`).join('\n')}`
  : ''}
${doc.ai_analysis?.medications?.length
  ? `Medications:\n${(doc.ai_analysis.medications as any[]).map((m: any) => `  - ${m.name} ${m.dosage || ''}`).join('\n')}`
  : ''}
${doc.ai_analysis?.diagnosis?.length ? `Diagnosis: ${(doc.ai_analysis.diagnosis as string[]).join(', ')}` : ''}
`;

    const prompt = `You are a clinical AI comparing two medical reports for the same patient.

REPORT 1:
${formatDoc(doc1)}

REPORT 2:
${formatDoc(doc2)}

Provide a structured clinical comparison:
1. **What has IMPROVED** between these two reports?
2. **What has WORSENED**?
3. **What is UNCHANGED** (notable findings present in both)?
4. **New findings** in Report 2 not present in Report 1
5. **Clinical significance** of the changes
6. **Recommended next steps** based on the trajectory`;

    const provider = AIProviderRegistry.getProvider('gemini');
    let comparison: string;
    try {
      const result = await provider.chat(prompt, []);
      comparison = result.text;
    } catch {
      const fallback = AIProviderRegistry.getProvider('nvidia');
      const result = await fallback.chat(prompt, []);
      comparison = result.text;
    }

    await DoctorCopilotRepository.logToolUse(
      doctorId, patientId, 'report_comparison',
      { docId1, docId2, doc1Name: doc1.document_name, doc2Name: doc2.document_name },
      comparison.slice(0, 200),
      Date.now() - t0
    );

    return { comparison, sources: [doc1.document_name, doc2.document_name] };
  }

  // ─── Clinical Alerts ───────────────────────────────────────────────────────

  public static async getAlerts(doctorId: string, patientId: string): Promise<ClinicalAlert[]> {
    return DoctorCopilotRepository.getAlerts(doctorId, patientId);
  }

  public static async dismissAlert(alertId: string): Promise<boolean> {
    return DoctorCopilotRepository.dismissAlert(alertId);
  }

  /**
   * Generates proactive clinical alerts for a patient (runs as background task).
   * Called after brief generation. Saves results to ai_clinical_alerts table.
   */
  private static async generateAndSaveAlerts(
    doctorId: string,
    patientId: string,
    ragData: Awaited<ReturnType<typeof DoctorCopilotRepository.getPatientRAGContext>>
  ): Promise<void> {
    const alerts: Array<{ alert_type: string; severity: string; title: string; body: string }> = [];

    // Check for overdue lab tests (simple heuristic — no HbA1c in >6 months for diabetics)
    const conditions = (ragData.patient_profile?.chronic_conditions || []) as string[];
    const hasDiabetes = conditions.some((c) => /diabet/i.test(c));
    if (hasDiabetes) {
      const latestHbA1c = ragData.medical_knowledge
        .filter((mk) => /hba1c|a1c|glycat/i.test(mk.name))
        .sort((a, b) => new Date(b.recorded_date || 0).getTime() - new Date(a.recorded_date || 0).getTime())[0];

      if (!latestHbA1c) {
        alerts.push({
          alert_type: 'overdue_test',
          severity: 'warning',
          title: 'HbA1c Not on Record',
          body: 'No HbA1c result found for this diabetic patient. ADA guidelines recommend testing every 3-6 months.',
        });
      } else if (latestHbA1c.recorded_date) {
        const monthsAgo = (Date.now() - new Date(latestHbA1c.recorded_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo > 6) {
          alerts.push({
            alert_type: 'overdue_test',
            severity: 'warning',
            title: 'HbA1c Overdue',
            body: `Last HbA1c: ${Math.round(monthsAgo)} months ago (${latestHbA1c.value}${latestHbA1c.unit || '%'}). ADA recommends testing every 3–6 months.`,
          });
        }
        if (latestHbA1c.status === 'CRITICAL' || parseFloat(latestHbA1c.value || '0') > 9) {
          alerts.push({
            alert_type: 'trend_alert',
            severity: 'critical',
            title: 'HbA1c Critically Elevated',
            body: `HbA1c is ${latestHbA1c.value}% — above 9%. Consider medication intensification per ADA 2024 guidelines.`,
          });
        }
      }
    }

    // Check for eGFR / renal decline
    const eGFRValues = ragData.medical_knowledge
      .filter((mk) => /egfr|gfr|creatinine/i.test(mk.name))
      .sort((a, b) => new Date(a.recorded_date || 0).getTime() - new Date(b.recorded_date || 0).getTime());

    if (eGFRValues.length >= 2) {
      const latest = parseFloat(eGFRValues[eGFRValues.length - 1]?.value || '100');
      const previous = parseFloat(eGFRValues[eGFRValues.length - 2]?.value || '100');
      if (latest < previous * 0.85) {
        alerts.push({
          alert_type: 'trend_alert',
          severity: latest < 45 ? 'critical' : 'warning',
          title: 'Declining Renal Function',
          body: `eGFR trending down: ${previous.toFixed(0)} → ${latest.toFixed(0)} mL/min/1.73m². ${latest < 45 ? 'KDIGO Stage ≥3b — nephrology referral recommended.' : 'Monitor closely, consider nephrology referral.'}`,
        });
      }
    }

    // Allergies present but medications may overlap
    const allergies = (ragData.patient_profile?.allergies || []) as string[];
    if (allergies.length > 0) {
      const medications = this.extractCurrentMedications(ragData);
      const allergyWarnings = allergies.filter((allergy) =>
        medications.some((med) => med.name.toLowerCase().includes(allergy.toLowerCase()))
      );
      for (const allergy of allergyWarnings) {
        alerts.push({
          alert_type: 'drug_interaction',
          severity: 'critical',
          title: 'Potential Allergy-Medication Conflict',
          body: `Patient has a documented allergy to "${allergy}" but a medication with a similar name appears in records. Please verify before prescribing.`,
        });
      }
    }

    await DoctorCopilotRepository.saveAlerts(doctorId, patientId, alerts);
  }

  // ─── RAG Context Builder (Clinical Grade) ─────────────────────────────────

  /**
   * Builds a rich clinical RAG context string from all patient data.
   * Uses clinical language — NOT simplified patient-facing language.
   */
  private static buildClinicalRAGContext(ragData: Awaited<ReturnType<typeof DoctorCopilotRepository.getPatientRAGContext>>): string {
    const parts: string[] = [];

    // Patient demographics
    if (ragData.patient_profile) {
      const p = ragData.patient_profile;
      const age = this.calculateAge(p.date_of_birth);
      const lines = [
        p.full_name ? `Patient: ${p.full_name}` : null,
        age ? `Age: ${age}` : null,
        p.gender ? `Sex: ${p.gender}` : null,
        p.blood_group ? `Blood Group: ${p.blood_group}` : null,
        p.allergies.length > 0 ? `⚠️ Allergies: ${(p.allergies as string[]).join(', ')}` : null,
        p.chronic_conditions.length > 0 ? `Active Conditions: ${(p.chronic_conditions as string[]).join(', ')}` : null,
      ].filter(Boolean);
      if (lines.length > 0) {
        parts.push(`=== PATIENT DEMOGRAPHICS ===\n${lines.join('\n')}`);
      }
    }

    // Medical documents — full clinical content
    if (ragData.documents.length > 0) {
      parts.push('\n=== CLINICAL DOCUMENTS ===');
      for (const doc of ragData.documents) {
        const docParts = [`\n--- "${doc.document_name}" [${doc.document_category}] ---`];
        if (doc.visit_date) docParts.push(`Date: ${doc.visit_date}`);
        if (doc.hospital_name) docParts.push(`Institution: ${doc.hospital_name}`);
        if (doc.doctor_name) docParts.push(`Attending: ${doc.doctor_name}`);
        if (doc.clinical_summary) docParts.push(`Clinical Summary: ${doc.clinical_summary}`);

        if (doc.ai_analysis) {
          const a = doc.ai_analysis;
          if (a.diagnosis?.length > 0) docParts.push(`Diagnosis: ${(a.diagnosis as string[]).join(', ')}`);
          if (a.medications?.length > 0) {
            const medList = (a.medications as any[])
              .map((m) => `${m.name} ${m.dosage || ''}${m.frequency ? ` ${m.frequency}` : ''}${m.purpose ? ` [${m.purpose}]` : ''}`)
              .join('; ');
            docParts.push(`Medications: ${medList}`);
          }
          if (a.lab_results?.length > 0) {
            const labs = (a.lab_results as any[]).slice(0, 10)
              .map((l) => `${l.test_name}: ${l.value} ${l.unit || ''} [${l.status}] (Ref: ${l.reference_range || 'N/A'})`)
              .join('; ');
            docParts.push(`Lab Results: ${labs}`);
          }
          if (a.red_flags?.length > 0) docParts.push(`⚠️ Red Flags: ${(a.red_flags as string[]).join(', ')}`);
          if (a.recommended_followup?.length > 0) docParts.push(`Recommended Follow-up: ${(a.recommended_followup as string[]).join(', ')}`);
        }

        // Include OCR raw text excerpt for maximum grounding
        if (doc.ocr_text) {
          docParts.push(`Raw Report (excerpt): ${doc.ocr_text.slice(0, 2000)}`);
        }

        parts.push(docParts.join('\n'));
      }
    }

    // Structured medical knowledge (biomarkers, diagnoses, etc.)
    if (ragData.medical_knowledge.length > 0) {
      parts.push('\n=== STRUCTURED MEDICAL KNOWLEDGE ===');
      const grouped = new Map<string, string[]>();
      for (const mk of ragData.medical_knowledge) {
        const type = mk.knowledge_type || 'general';
        if (!grouped.has(type)) grouped.set(type, []);
        grouped.get(type)!.push(`${mk.name}: ${mk.value || 'N/A'} ${mk.unit || ''} [${mk.status}]${mk.recorded_date ? ` (${mk.recorded_date.slice(0, 10)})` : ''}`);
      }
      for (const [type, entries] of grouped) {
        parts.push(`${type.toUpperCase()}: ${entries.join('; ')}`);
      }
    }

    return parts.join('\n') || 'No medical records available for this patient.';
  }

  // ─── Prompt Builders ───────────────────────────────────────────────────────

  private static buildClinicalSystemPrompt(
    ragContext: string,
    conversationHistory: string,
    question: string
  ): string {
    return `You are MediVault Clinical AI — a precision medical intelligence copilot designed to assist licensed physicians.

OPERATING DIRECTIVES:
1. Use precise clinical language — this physician is a licensed medical professional.
2. Ground every response exclusively in the patient's medical records provided below.
3. Cite specific document names and dates when referencing clinical findings (e.g., "Per CBC dated 2025-11-15...").
4. Flag critical findings with [⚠️ CRITICAL] and warnings with [⚠️ WARNING].
5. When relevant, include ICD-10 codes for diagnoses.
6. Apply current evidence-based guidelines (ADA, ACC/AHA, JNC, KDIGO, WHO) where applicable.
7. If information is insufficient for a definitive answer, state clearly what additional data is needed.
8. Structure responses with clinical headers: **Assessment**, **Evidence**, **Recommendation**.
9. NEVER minimize clinical risk — be forthright about potential concerns.
10. If asked about medications, reference pharmacological principles and flag potential interactions.
11. Do not include disclaimers asking the doctor to "consult a physician" — the user IS the physician.

PATIENT MEDICAL RECORDS:
${ragContext}

${conversationHistory ? `\n${conversationHistory}\n` : ''}
Physician Query: "${question}"

Clinical Response:`;
  }

  private static buildBriefGenerationPrompt(ragContext: string): string {
    return `You are a clinical AI generating a pre-consultation patient brief for a physician.

PATIENT RECORDS:
${ragContext}

Generate a structured clinical brief in the following format:

## PATIENT BRIEF

### 🔴 CRITICAL FLAGS
List any critical lab values, dangerous trends, or urgent clinical concerns. If none, write "None identified."

### ⚕️ ACTIVE CONDITIONS
List current active diagnoses in order of clinical significance.

### 💊 CURRENT MEDICATIONS
List all current medications with dosage. Flag any that appear discontinued or changed.

### ⚠️ DRUG & ALLERGY ALERTS
List any potential drug-drug interactions or allergy-medication conflicts.

### 📋 PENDING CLINICAL ITEMS
List overdue tests, missing follow-ups, or unresolved clinical items.

### 📊 KEY TRENDS
In 2-3 sentences, summarize the most important lab/vital trends (improving, stable, deteriorating).

### 🎯 CLINICAL SUMMARY
2-3 sentence overview of this patient's overall clinical status for a physician seeing them today.

Be precise, factual, and clinically relevant. Only include information present in the records.`;
  }

  private static buildConversationHistory(messages: DoctorChatMessage[]): string {
    if (messages.length === 0) return '';
    const history = messages.slice(0, -1);
    if (history.length === 0) return '';
    const lines = history.map((m) => {
      const role = m.role === 'doctor' ? 'Physician' : 'Clinical AI';
      const content = m.content.length > 600 ? m.content.slice(0, 600) + '...' : m.content;
      return `${role}: ${content}`;
    });
    return `=== CONVERSATION HISTORY ===\n${lines.join('\n')}\n=== END HISTORY ===`;
  }

  // ─── Utility Methods ───────────────────────────────────────────────────────

  private static calculateAge(dob: string | null | undefined): string | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const ageDiff = Date.now() - birth.getTime();
    const age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
    return isNaN(age) ? null : `${age}`;
  }

  private static extractCurrentMedications(
    ragData: Awaited<ReturnType<typeof DoctorCopilotRepository.getPatientRAGContext>>
  ): Array<{ name: string; dosage?: string; frequency?: string }> {
    const meds: Array<{ name: string; dosage?: string; frequency?: string }> = [];
    const seen = new Set<string>();

    for (const doc of ragData.documents) {
      if (!doc.ai_analysis?.medications) continue;
      for (const m of doc.ai_analysis.medications as any[]) {
        const key = m.name?.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          meds.push({ name: m.name, dosage: m.dosage, frequency: m.frequency });
        }
      }
    }

    // Also from medical_knowledge
    const mkMeds = ragData.medical_knowledge.filter((mk) => mk.knowledge_type === 'medication');
    for (const mk of mkMeds) {
      const key = mk.name?.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        meds.push({ name: mk.name, dosage: mk.value || undefined });
      }
    }

    return meds;
  }

  private static extractCriticalFlags(
    ragData: Awaited<ReturnType<typeof DoctorCopilotRepository.getPatientRAGContext>>
  ): Array<{ label: string; value: string; severity: 'critical' | 'warning' | 'info' }> {
    const flags: Array<{ label: string; value: string; severity: 'critical' | 'warning' | 'info' }> = [];

    for (const mk of ragData.medical_knowledge) {
      if (mk.status === 'CRITICAL' || mk.status === 'critical') {
        flags.push({ label: mk.name, value: `${mk.value} ${mk.unit || ''}`.trim(), severity: 'critical' });
      } else if (mk.status === 'ABNORMAL' || mk.status === 'HIGH' || mk.status === 'LOW') {
        flags.push({ label: mk.name, value: `${mk.value} ${mk.unit || ''}`.trim(), severity: 'warning' });
      }
    }

    for (const doc of ragData.documents) {
      const redFlags = doc.ai_analysis?.red_flags as string[] | undefined;
      if (redFlags?.length) {
        for (const flag of redFlags) {
          flags.push({ label: 'Red Flag', value: flag, severity: 'warning' });
        }
      }
    }

    return flags.slice(0, 8);
  }

  private static generateSessionTitle(firstMessage: string): string {
    const cleaned = firstMessage.trim().replace(/[?!.]+$/, '');
    if (cleaned.length <= 45) return cleaned;
    return cleaned.split(/\s+/).slice(0, 7).join(' ') + '...';
  }

  private static generateClinicalFollowUps(question: string, response: string): string[] {
    const suggestions: string[] = [];
    const lq = question.toLowerCase();
    const lr = response.toLowerCase();

    if (lq.includes('hba1c') || lr.includes('hba1c') || lq.includes('diabet')) {
      suggestions.push('What medication adjustments are recommended for this HbA1c level?');
      suggestions.push('Check for any drug interactions with current diabetes medications');
    }
    if (lq.includes('kidney') || lr.includes('egfr') || lr.includes('creatinine') || lq.includes('renal')) {
      suggestions.push('Analyze the eGFR trend over the past 12 months');
      suggestions.push('Which of this patient\'s medications require renal dose adjustment?');
    }
    if (lq.includes('medication') || lq.includes('drug') || lq.includes('prescription')) {
      suggestions.push('Run a drug interaction check on all current medications');
    }
    if (lq.includes('lab') || lq.includes('result') || lq.includes('report')) {
      suggestions.push('Compare this with the previous report');
      suggestions.push('What follow-up tests are clinically indicated?');
    }
    if (lr.includes('referral') || lr.includes('specialist')) {
      suggestions.push('Generate a referral summary for the specialist');
    }

    const general = [
      'Summarize the patient\'s overall clinical status',
      'What are the top 3 clinical priorities for today\'s visit?',
      'Identify any overdue preventive care or follow-ups',
      'What does the cardiovascular risk profile look like?',
    ];

    while (suggestions.length < 4 && general.length > 0) {
      suggestions.push(general.shift()!);
    }

    return [...new Set(suggestions)].slice(0, 4);
  }
}
