import { TimelineRepository } from '../repositories/timeline.repository';
import { LabTrendService } from './lab-trend.service';
import { MedicationHistoryService } from './medication-history.service';
import { ConditionJourneyService } from './condition-journey.service';
import { ClinicalEpisodeService } from './clinical-episode.service';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Timeline Service
 *
 * Orchestrates all timeline intelligence services.
 * Responsible for assembling the final patient health journey response.
 */
export class TimelineService {
  /**
   * Full timeline summary for the snapshot + AI overview panel.
   */
  public static async getTimelineSummary(patientId: string): Promise<{
    summary: any;
    record_gaps: any[];
    notable_changes: any[];
  }> {
    const [summary, record_gaps, notable_changes] = await Promise.all([
      TimelineRepository.getPatientTimelineSummary(patientId),
      TimelineRepository.getTimelineGaps(patientId),
      TimelineRepository.getNotableChanges(patientId),
    ]);

    logger.info(`[TIMELINE_REBUILT] patientId=${patientId}`);
    return { summary, record_gaps, notable_changes };
  }

  /**
   * Paginated clinical events with filters.
   */
  public static async getTimelineEvents(
    patientId: string,
    filters: { event_type?: string; date_from?: string; date_to?: string; is_milestone?: boolean },
    pagination: { page: number; limit: number }
  ) {
    return TimelineRepository.getPatientClinicalEvents(patientId, filters, pagination);
  }

  /**
   * Clinical episodes with event association.
   */
  public static async getEpisodes(patientId: string) {
    return TimelineRepository.getPatientEpisodes(patientId);
  }

  /**
   * Rebuild episodes for a patient (called after new events are generated).
   */
  public static async rebuildEpisodes(patientId: string): Promise<number> {
    return ClinicalEpisodeService.groupEventsIntoEpisodes(patientId);
  }

  /**
   * All lab trends for a patient.
   */
  public static async getLabTrends(patientId: string) {
    return LabTrendService.getPatientLabTrends(patientId);
  }

  /**
   * Specific lab test trend.
   */
  public static async getLabTestTrend(patientId: string, testName: string) {
    return LabTrendService.getTestTrend(patientId, testName);
  }

  /**
   * Medication history timeline.
   */
  public static async getMedicationHistory(patientId: string) {
    return MedicationHistoryService.getPatientMedicationHistory(patientId);
  }

  /**
   * Condition journey threads.
   */
  public static async getConditionJourneys(patientId: string) {
    return ConditionJourneyService.getPatientConditionJourneys(patientId);
  }

  /**
   * AI health overview: evidence-based narrative from structured data.
   * Never invents diagnoses or makes medical recommendations.
   * Only summarizes what the available records contain.
   */
  public static async getHealthInsights(patientId: string): Promise<{
    overview: string;
    evidence_count: number;
    disclaimer: string;
  }> {
    try {
      const [labTrends, medications, conditions] = await Promise.all([
        LabTrendService.getPatientLabTrends(patientId),
        MedicationHistoryService.getPatientMedicationHistory(patientId),
        ConditionJourneyService.getPatientConditionJourneys(patientId),
      ]);

      const statements: string[] = [];
      let evidenceCount = 0;

      // Lab trend statements (evidence-based only)
      for (const trend of labTrends.slice(0, 3)) {
        if (trend.measurements.length < 2) continue;
        evidenceCount += trend.measurements.length;
        if (trend.trend === 'IMPROVING') {
          statements.push(
            `The available records show a decreasing trend in ${trend.test_name} across ${trend.measurements.length} measurements` +
            (trend.current?.value_raw ? ` (current: ${trend.current.value_raw}${trend.unit ? ' ' + trend.unit : ''})` : '') + '.'
          );
        } else if (trend.trend === 'WORSENING') {
          statements.push(
            `The available records show an increasing trend in ${trend.test_name} across ${trend.measurements.length} measurements` +
            (trend.current?.value_raw ? ` (current: ${trend.current.value_raw}${trend.unit ? ' ' + trend.unit : ''})` : '') + '.'
          );
        } else if (trend.trend === 'CHANGE_DETECTED' || trend.trend === 'STABLE') {
          statements.push(
            `The available records contain ${trend.measurements.length} measurements of ${trend.test_name}.`
          );
        }
      }

      // Medication statements
      const activeMeds = medications.filter((m) => m.current_status !== 'discontinued');
      if (activeMeds.length > 0) {
        evidenceCount += activeMeds.length;
        const medNames = activeMeds.slice(0, 4).map((m) => m.medication_name).join(', ');
        statements.push(
          `The available records list the following medication${activeMeds.length !== 1 ? 's' : ''}: ${medNames}` +
          (activeMeds.length > 4 ? ` and ${activeMeds.length - 4} more` : '') + '.'
        );
      }

      // Condition statements
      if (conditions.length > 0) {
        evidenceCount += conditions.length;
        const conds = conditions.slice(0, 3).map((c) => c.condition_name).join(', ');
        statements.push(
          `The available records document the following condition${conditions.length !== 1 ? 's' : ''}: ${conds}.`
        );
      }

      const overview = statements.length > 0
        ? statements.join(' ')
        : 'Insufficient structured data is available to generate a clinical overview. Upload and analyze more medical documents to build your health journey.';

      return {
        overview,
        evidence_count: evidenceCount,
        disclaimer: 'This overview is based solely on information extracted from your uploaded medical records. It does not constitute medical advice. Please consult your healthcare provider for clinical guidance.',
      };
    } catch (err: any) {
      logger.error(`[TimelineService] getHealthInsights error for patient ${patientId}:`, err.message);
      return {
        overview: 'Clinical insights will appear as more structured records become available.',
        evidence_count: 0,
        disclaimer: 'This overview is based solely on information extracted from your uploaded medical records.',
      };
    }
  }
}
