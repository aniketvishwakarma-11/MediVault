import { Request, Response } from 'express';
import { TimelineService } from '../services/timeline.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Timeline Controller
 *
 * All endpoints derive patient_id from req.user (set by authenticateJWT).
 * Never trusts patient_id from the request body/query.
 * Enforces authorization at the middleware layer (authenticateJWT + validatePatientAccess).
 */
export class TimelineController {
  /**
   * GET /timeline/summary
   * Health snapshot + record gaps + notable changes.
   */
  public static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const data = await TimelineService.getTimelineSummary(patientId);
      sendSuccess(res, 200, data, 'Timeline summary retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getSummary error:', err.message);
      sendError(res, 500, 'Failed to retrieve timeline summary.');
    }
  }

  /**
   * GET /timeline/events
   * Paginated clinical events with optional event_type filter.
   */
  public static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const page = Math.max(1, parseInt(String(req.query.page || '1')));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'))));
      const event_type = typeof req.query.event_type === 'string' ? req.query.event_type : undefined;
      const date_from = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
      const date_to = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;
      const is_milestone = req.query.milestones === 'true' ? true : undefined;

      const data = await TimelineService.getTimelineEvents(
        patientId,
        { event_type, date_from, date_to, is_milestone },
        { page, limit }
      );

      sendSuccess(res, 200, data, 'Clinical events retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getEvents error:', err.message);
      sendError(res, 500, 'Failed to retrieve clinical events.');
    }
  }

  /**
   * GET /timeline/episodes
   */
  public static async getEpisodes(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const episodes = await TimelineService.getEpisodes(patientId);
      sendSuccess(res, 200, { episodes }, 'Clinical episodes retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getEpisodes error:', err.message);
      sendError(res, 500, 'Failed to retrieve clinical episodes.');
    }
  }

  /**
   * POST /timeline/episodes/rebuild
   * Triggers episode re-grouping for the authenticated patient.
   */
  public static async rebuildEpisodes(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const count = await TimelineService.rebuildEpisodes(patientId);
      sendSuccess(res, 200, { episodes_created: count }, 'Episode grouping complete.');
    } catch (err: any) {
      logger.error('[TimelineController] rebuildEpisodes error:', err.message);
      sendError(res, 500, 'Failed to rebuild episodes.');
    }
  }

  /**
   * GET /timeline/labs
   */
  public static async getLabTrends(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const trends = await TimelineService.getLabTrends(patientId);
      sendSuccess(res, 200, { trends }, 'Lab trends retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getLabTrends error:', err.message);
      sendError(res, 500, 'Failed to retrieve lab trends.');
    }
  }

  /**
   * GET /timeline/labs/:testName
   */
  public static async getLabTrend(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const testName = decodeURIComponent(String(req.params.testName || ''));
      if (!testName) {
        sendError(res, 400, 'Test name parameter is required.');
        return;
      }

      const trend = await TimelineService.getLabTestTrend(patientId, testName);
      if (!trend) {
        sendError(res, 404, `No measurements found for test: ${testName}`);
        return;
      }

      sendSuccess(res, 200, { trend }, `Lab trend for ${testName} retrieved.`);
    } catch (err: any) {
      logger.error('[TimelineController] getLabTrend error:', err.message);
      sendError(res, 500, 'Failed to retrieve lab trend.');
    }
  }

  /**
   * GET /timeline/medications
   */
  public static async getMedications(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const history = await TimelineService.getMedicationHistory(patientId);
      sendSuccess(res, 200, { medications: history }, 'Medication history retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getMedications error:', err.message);
      sendError(res, 500, 'Failed to retrieve medication history.');
    }
  }

  /**
   * GET /timeline/conditions
   */
  public static async getConditions(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const journeys = await TimelineService.getConditionJourneys(patientId);
      sendSuccess(res, 200, { conditions: journeys }, 'Condition journeys retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getConditions error:', err.message);
      sendError(res, 500, 'Failed to retrieve condition journeys.');
    }
  }

  /**
   * GET /timeline/insights
   * AI-generated health overview (evidence-based only).
   */
  public static async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.user?.patient_id;
      if (!patientId) {
        sendError(res, 401, 'Patient identity not established.');
        return;
      }

      const insights = await TimelineService.getHealthInsights(patientId);
      sendSuccess(res, 200, insights, 'Health insights retrieved.');
    } catch (err: any) {
      logger.error('[TimelineController] getInsights error:', err.message);
      sendError(res, 500, 'Failed to retrieve health insights.');
    }
  }
}
