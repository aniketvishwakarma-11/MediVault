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

import { getAuthHeaders } from './auth-token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  getSummary: (patientId?: string): Promise<TimelineSummaryResponse | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<TimelineSummaryResponse>('/timeline/summary', params);
  },

  /** Paginated clinical events with optional filter */
  getEvents: (
    filter?: TimelineFilter,
    page = 1,
    limit = 20,
    patientId?: string
  ): Promise<ClinicalEventsResponse | null> => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (filter && filter !== 'ALL') params.event_type = filter;
    if (patientId) params.patient_id = patientId;
    return apiFetch<ClinicalEventsResponse>('/timeline/events', params);
  },

  /** Milestone events only */
  getMilestones: (patientId?: string): Promise<ClinicalEventsResponse | null> => {
    const params: Record<string, string> = { milestones: 'true', limit: '50' };
    if (patientId) params.patient_id = patientId;
    return apiFetch<ClinicalEventsResponse>('/timeline/events', params);
  },

  /** Clinical episodes */
  getEpisodes: (patientId?: string): Promise<{ episodes: ClinicalEpisode[] } | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<{ episodes: ClinicalEpisode[] }>('/timeline/episodes', params);
  },

  /** All lab trends */
  getLabTrends: (patientId?: string): Promise<{ trends: LabTrend[] } | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<{ trends: LabTrend[] }>('/timeline/labs', params);
  },

  /** Specific lab test trend */
  getLabTrend: (testName: string, patientId?: string): Promise<{ trend: LabTrend } | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<{ trend: LabTrend }>(`/timeline/labs/${encodeURIComponent(testName)}`, params);
  },

  /** Medication history */
  getMedications: (patientId?: string): Promise<{ medications: MedicationHistory[] } | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<{ medications: MedicationHistory[] }>('/timeline/medications', params);
  },

  /** Condition journeys */
  getConditions: (patientId?: string): Promise<{ conditions: ConditionJourney[] } | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<{ conditions: ConditionJourney[] }>('/timeline/conditions', params);
  },

  /** AI health overview */
  getInsights: (patientId?: string): Promise<HealthInsights | null> => {
    const params: Record<string, string> = {};
    if (patientId) params.patient_id = patientId;
    return apiFetch<HealthInsights>('/timeline/insights', params);
  },
};
