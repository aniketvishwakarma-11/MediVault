import { Router } from 'express';
import { TimelineController } from '../controllers/timeline.controller';
import { authenticateJWT } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';

const router = Router();

/**
 * All timeline routes require authentication.
 * Patient identity is derived from JWT — never from client body.
 */

/**
 * GET /timeline/summary
 * Patient health snapshot: counts, last activity, notable changes.
 */
router.get('/summary', apiRateLimiter, authenticateJWT, TimelineController.getSummary);

/**
 * GET /timeline/events
 * Paginated clinical events. Query: event_type, date_from, date_to, milestones, page, limit
 */
router.get('/events', apiRateLimiter, authenticateJWT, TimelineController.getEvents);

/**
 * GET /timeline/episodes
 * Clinical episodes (grouped related events).
 */
router.get('/episodes', apiRateLimiter, authenticateJWT, TimelineController.getEpisodes);

/**
 * POST /timeline/episodes/rebuild
 * Trigger episode re-grouping for the authenticated patient.
 */
router.post('/episodes/rebuild', apiRateLimiter, authenticateJWT, TimelineController.rebuildEpisodes);

/**
 * GET /timeline/labs
 * All longitudinal lab trends for the patient.
 */
router.get('/labs', apiRateLimiter, authenticateJWT, TimelineController.getLabTrends);

/**
 * GET /timeline/labs/:testName
 * Specific lab test trend by name (URL-encoded).
 */
router.get('/labs/:testName', apiRateLimiter, authenticateJWT, TimelineController.getLabTrend);

/**
 * GET /timeline/medications
 * Longitudinal medication history.
 */
router.get('/medications', apiRateLimiter, authenticateJWT, TimelineController.getMedications);

/**
 * GET /timeline/conditions
 * Condition journey threads.
 */
router.get('/conditions', apiRateLimiter, authenticateJWT, TimelineController.getConditions);

/**
 * GET /timeline/insights
 * AI-generated evidence-based health overview.
 */
router.get('/insights', apiRateLimiter, authenticateJWT, TimelineController.getInsights);

export default router;
