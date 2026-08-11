// MediVault V2 — Timeline API Client

import { supabase } from './supabase';
import type {
  TimelineSummaryResponse,
  ClinicalEventsResponse,
  ClinicalEpisode,
  LabTrend,
  MedicationHistory,
  ConditionJourney,
  HealthInsights,
  TimelineFilter,
} from '../types/timeline';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export const TimelineAPI = {
  /** Health snapshot + record gaps + notable changes */
  getSummary: (): Promise<TimelineSummaryResponse | null> =>
    apiFetch<TimelineSummaryResponse>('/timeline/summary'),

  /** Paginated clinical events with optional filter */
  getEvents: (
    filter?: TimelineFilter,
    page = 1,
    limit = 20
  ): Promise<ClinicalEventsResponse | null> => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (filter && filter !== 'ALL') params.event_type = filter;
    return apiFetch<ClinicalEventsResponse>('/timeline/events', params);
  },

  /** Milestone events only */
  getMilestones: (): Promise<ClinicalEventsResponse | null> =>
    apiFetch<ClinicalEventsResponse>('/timeline/events', { milestones: 'true', limit: '50' }),

  /** Clinical episodes */
  getEpisodes: (): Promise<{ episodes: ClinicalEpisode[] } | null> =>
    apiFetch<{ episodes: ClinicalEpisode[] }>('/timeline/episodes'),

  /** All lab trends */
  getLabTrends: (): Promise<{ trends: LabTrend[] } | null> =>
    apiFetch<{ trends: LabTrend[] }>('/timeline/labs'),

  /** Specific lab test trend */
  getLabTrend: (testName: string): Promise<{ trend: LabTrend } | null> =>
    apiFetch<{ trend: LabTrend }>(`/timeline/labs/${encodeURIComponent(testName)}`),

  /** Medication history */
  getMedications: (): Promise<{ medications: MedicationHistory[] } | null> =>
    apiFetch<{ medications: MedicationHistory[] }>('/timeline/medications'),

  /** Condition journeys */
  getConditions: (): Promise<{ conditions: ConditionJourney[] } | null> =>
    apiFetch<{ conditions: ConditionJourney[] }>('/timeline/conditions'),

  /** AI health overview */
  getInsights: (): Promise<HealthInsights | null> =>
    apiFetch<HealthInsights>('/timeline/insights'),
};
