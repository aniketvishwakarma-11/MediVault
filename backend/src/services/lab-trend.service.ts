import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Lab Trend Service
 *
 * Aggregates repeated laboratory measurements for the same test
 * and computes longitudinal trends from clinical_events.
 *
 * Rules:
 * - Groups by normalized test_name (case-insensitive, trimmed)
 * - Does NOT compare measurements with different units
 * - Direction interpretation uses a per-test semantic map
 * - Unknown tests: CHANGE_DETECTED (never guess direction)
 */

export interface LabMeasurement {
  event_id: string;
  document_id: string | null;
  event_date: string;
  value_raw: string;
  value_numeric: number | null;
  unit: string | null;
  reference_range: string | null;
  status: string;
  facility_name: string | null;
}

export interface LabTrendResult {
  test_name: string;
  normalized_name: string;
  unit: string | null;
  reference_range: string | null;
  measurements: LabMeasurement[];
  current: LabMeasurement | null;
  previous: LabMeasurement | null;
  absolute_change: number | null;
  percentage_change: number | null;
  /** 'IMPROVING' | 'WORSENING' | 'STABLE' | 'CHANGE_DETECTED' | 'INSUFFICIENT_DATA' */
  trend: string;
}

// Tests where LOWER values indicate improvement (toward normal range)
const LOWER_IS_BETTER = new Set([
  'hba1c', 'glycated hemoglobin', 'hemoglobin a1c',
  'ldl', 'ldl-c', 'ldl cholesterol', 'low-density lipoprotein',
  'total cholesterol',
  'triglycerides', 'triglyceride',
  'crp', 'c-reactive protein',
  'uric acid',
  'creatinine', 'serum creatinine',
  'bun', 'blood urea nitrogen', 'urea',
  'ast', 'alt', 'alanine aminotransferase', 'aspartate aminotransferase',
  'alkaline phosphatase',
  'bilirubin', 'total bilirubin',
  'inr',
  'glucose', 'fasting glucose', 'blood glucose', 'blood sugar',
  'psa',
]);

// Tests where HIGHER values indicate improvement (toward normal range)
const HIGHER_IS_BETTER = new Set([
  'hemoglobin', 'haemoglobin',
  'hematocrit', 'haematocrit', 'pcv',
  'wbc', 'white blood cells', 'leukocytes', 'tlc',
  'platelet count', 'platelets', 'thrombocytes',
  'albumin', 'serum albumin',
  'hdl', 'hdl-c', 'hdl cholesterol', 'high-density lipoprotein',
  'vitamin d', 'vitamin b12',
  'ferritin', 'iron', 'serum iron',
  'esr',
  'spo2', 'oxygen saturation',
  'gfr', 'egfr',
]);

export class LabTrendService {
  /**
   * Returns all lab trends for a patient with ≥1 measurement.
   * Tests with ≥2 measurements include trend calculation.
   */
  public static async getPatientLabTrends(patientId: string): Promise<LabTrendResult[]> {
    try {
      const res = await query(
        `SELECT
           ce.id as event_id,
           ce.document_id,
           ce.event_date::text,
           ce.facility_name,
           lab_item->>'test_name' as test_name,
           lab_item->>'value' as value_raw,
           lab_item->>'unit' as unit,
           lab_item->>'reference_range' as reference_range,
           lab_item->>'status' as status,
           (lab_item->>'test_date') as test_date
         FROM public.clinical_events ce,
              jsonb_array_elements(ce.structured_data->'lab_results') as lab_item
         WHERE (ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1) OR ce.patient_id IN (SELECT user_id FROM public.patients WHERE id = $1))
           AND ce.event_type = 'LAB_TEST'
         ORDER BY ce.event_date ASC, ce.created_at ASC`,
        [patientId]
      );

      if (res.rows.length === 0) return [];

      // Group by normalized test name + unit (prevents cross-unit comparisons)
      const groups = new Map<string, { testName: string; measurements: LabMeasurement[] }>();

      for (const row of res.rows) {
        if (!row.test_name) continue;
        const normalized = this.normalizeTestName(row.test_name);
        const unit = row.unit?.trim() || null;
        const groupKey = `${normalized}|${unit || ''}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, { testName: row.test_name, measurements: [] });
        }

        const valueNumeric = this.parseNumeric(row.value_raw);
        groups.get(groupKey)!.measurements.push({
          event_id: row.event_id,
          document_id: row.document_id,
          event_date: row.test_date || row.event_date,
          value_raw: row.value_raw,
          value_numeric: valueNumeric,
          unit,
          reference_range: row.reference_range || null,
          status: row.status || 'NORMAL',
          facility_name: row.facility_name,
        });
      }

      // Build trend results
      const trends: LabTrendResult[] = [];
      for (const [groupKey, group] of groups.entries()) {
        const sorted = group.measurements.sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );
        const normalized = groupKey.split('|')[0];
        const unit = sorted[0]?.unit || null;
        const refRange = sorted[sorted.length - 1]?.reference_range || sorted[0]?.reference_range || null;
        const current = sorted.length >= 1 ? sorted[sorted.length - 1] : null;
        const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

        let absoluteChange: number | null = null;
        let percentageChange: number | null = null;
        let trend = 'INSUFFICIENT_DATA';

        if (current?.value_numeric !== null && previous?.value_numeric !== null
            && current !== null && previous !== null
            && current.value_numeric !== undefined && previous.value_numeric !== undefined) {
          absoluteChange = parseFloat((current.value_numeric - previous.value_numeric).toFixed(4));
          percentageChange = previous.value_numeric !== 0
            ? parseFloat(((absoluteChange / previous.value_numeric) * 100).toFixed(2))
            : null;
          trend = this.interpretTrend(normalized, absoluteChange);
        } else if (sorted.length >= 2) {
          trend = 'CHANGE_DETECTED';
        }

        trends.push({
          test_name: group.testName,
          normalized_name: normalized,
          unit,
          reference_range: refRange,
          measurements: sorted,
          current,
          previous,
          absolute_change: absoluteChange,
          percentage_change: percentageChange,
          trend,
        });
      }

      // Sort by most measurements (most tracked tests first)
      return trends.sort((a, b) => b.measurements.length - a.measurements.length);
    } catch (err: any) {
      logger.error(`[LabTrendService] Error for patient ${patientId}:`, err.message || err);
      return [];
    }
  }

  /**
   * Get trend for a specific test name (fuzzy match on normalized name).
   */
  public static async getTestTrend(patientId: string, testName: string): Promise<LabTrendResult | null> {
    const all = await this.getPatientLabTrends(patientId);
    const normalized = this.normalizeTestName(testName);
    return all.find((t) => t.normalized_name === normalized) || null;
  }

  private static normalizeTestName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static parseNumeric(raw: string | null): number | null {
    if (!raw) return null;
    // Extract first numeric value (handles "10.2 g/dL", "< 5.7", "> 100")
    const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const n = parseFloat(match[0]);
    return isNaN(n) ? null : n;
  }

  /**
   * Trend interpretation using test semantics.
   * Never guesses for unknown tests — returns CHANGE_DETECTED.
   */
  private static interpretTrend(normalizedName: string, absoluteChange: number): string {
    const lower = normalizedName.toLowerCase();
    const isLowerBetter = [...LOWER_IS_BETTER].some((k) => lower.includes(k));
    const isHigherBetter = [...HIGHER_IS_BETTER].some((k) => lower.includes(k));

    if (Math.abs(absoluteChange) < 0.001) return 'STABLE';

    if (isLowerBetter) {
      return absoluteChange < 0 ? 'IMPROVING' : 'WORSENING';
    }
    if (isHigherBetter) {
      return absoluteChange > 0 ? 'IMPROVING' : 'WORSENING';
    }
    // Unknown test: report change without clinical interpretation
    return 'CHANGE_DETECTED';
  }
}
