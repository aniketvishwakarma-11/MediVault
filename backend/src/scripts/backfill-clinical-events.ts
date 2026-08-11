/**
 * MediVault V2 — Clinical Event Backfill Script
 *
 * Processes existing documents' AI analyses and generates clinical events.
 * Safe to run multiple times — event generation is idempotent.
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-clinical-events.ts
 *   npx ts-node src/scripts/backfill-clinical-events.ts --dry-run
 *
 * SAFETY RULES:
 * - Never modifies existing documents or ai_analyses
 * - Never deletes any data
 * - Uses ON CONFLICT DO NOTHING for all inserts
 * - Logs IDs only — no PHI in output
 */

import dotenv from 'dotenv';
dotenv.config({ path: require('path').join(__dirname, '../../.env') });

import { query } from '../config/db';
import { NormalizerService } from '../services/ai/normalizer.service';
import { ClinicalEventService } from '../services/clinical-event.service';
import { ClinicalEpisodeService } from '../services/clinical-episode.service';
import { logger } from '../utils/logger';

const isDryRun = process.argv.includes('--dry-run');

async function backfill(): Promise<void> {
  logger.info(`[Backfill] Starting clinical event backfill. dry-run=${isDryRun}`);

  // 1. Fetch all active AI analyses with their document's patient_id
  const analysesRes = await query(
    `SELECT
       a.id as analysis_id,
       a.document_id,
       a.raw_response_json,
       d.patient_id
     FROM public.ai_analyses a
     INNER JOIN public.documents d ON d.id = a.document_id
     WHERE a.is_active = TRUE
       AND d.is_archived = FALSE
     ORDER BY d.created_at ASC`
  );

  const total = analysesRes.rows.length;
  logger.info(`[Backfill] Found ${total} active AI analyses to process.`);

  let processed = 0;
  let eventsCreated = 0;
  let eventsSkipped = 0;
  let failed = 0;
  const patientIds = new Set<string>();

  for (const row of analysesRes.rows) {
    const { analysis_id, document_id, raw_response_json, patient_id } = row;

    try {
      // 2. Parse raw JSON
      let rawJson: any;
      if (typeof raw_response_json === 'string') {
        rawJson = JSON.parse(raw_response_json);
      } else {
        rawJson = raw_response_json;
      }

      // 3. Normalize
      const normalized = NormalizerService.normalize(rawJson);
      if (!normalized) {
        logger.warn(`[Backfill] Normalization failed for analysis ${analysis_id} — skipping.`);
        failed++;
        continue;
      }

      if (isDryRun) {
        // Dry run: count what would be created but don't write
        logger.info(`[Backfill DRY-RUN] analysisId=${analysis_id} documentId=${document_id} patientId=${patient_id} — would generate events.`);
        processed++;
        continue;
      }

      // 4. Generate clinical events (idempotent)
      const result = await ClinicalEventService.generateEventsFromAnalysis(
        patient_id,
        document_id,
        analysis_id,
        normalized
      );

      eventsCreated += result.created;
      eventsSkipped += result.skipped;
      if (result.failed > 0) failed++;
      patientIds.add(patient_id);
      processed++;

      if (processed % 10 === 0) {
        logger.info(`[Backfill] Progress: ${processed}/${total} analyses processed. Events: created=${eventsCreated} skipped=${eventsSkipped}`);
      }
    } catch (err: any) {
      logger.error(`[Backfill] Error processing analysis ${analysis_id}:`, err.message || err);
      failed++;
    }
  }

  logger.info(`[Backfill] Analysis processing complete. processed=${processed} eventsCreated=${eventsCreated} eventsSkipped=${eventsSkipped} failed=${failed}`);

  if (!isDryRun && patientIds.size > 0) {
    // 5. Rebuild episodes for all affected patients
    logger.info(`[Backfill] Rebuilding episodes for ${patientIds.size} patients...`);
    let episodesTotal = 0;
    for (const patientId of patientIds) {
      const count = await ClinicalEpisodeService.groupEventsIntoEpisodes(patientId);
      episodesTotal += count;
    }
    logger.info(`[Backfill] Episode rebuild complete. Total episodes created: ${episodesTotal}`);
  }

  logger.info('[Backfill] Backfill completed successfully.');
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('[Backfill] Fatal error:', err);
    process.exit(1);
  });
