/**
 * MediVault Consent API Client
 *
 * Typed client for all Patient Search & Consent Directory API endpoints.
 * Follows the same pattern as timeline-api.ts:
 *   - Always attaches Supabase JWT Bearer token
 *   - Returns null on failure, never throws
 *   - Wraps data from { success, data } response envelope
 */

import { supabase } from './supabase';
import type {
  PatientSearchResult,
  PatientMinimalProfile,
  ConsentGrant,
  ConsentStatusResult,
  ConsentVerifyResult,
  ConsentScope,
  AccessRequestPayload,
} from '../types/consent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const activeRole = (typeof window !== 'undefined' ? localStorage.getItem('medivault_user_role') : null) || 'doctor';
  return {
    'Content-Type': 'application/json',
    'x-user-role': activeRole,
    'x-role': activeRole,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<{ data: T | null; pagination?: ApiResponse<T>['pagination']; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url.toString(), { headers });
    const json: ApiResponse<T> = await res.json();
    if (!res.ok) return { data: null, message: json.message };
    return { data: json.data ?? null, pagination: json.pagination, message: json.message };
  } catch (err) {
    console.warn(`[ConsentAPI] GET ${path} failed:`, err);
    return { data: null };
  }
}

async function apiPost<T>(
  path: string,
  body?: Record<string, any>
): Promise<{ data: T | null; message?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json: ApiResponse<T> = await res.json();
    if (!res.ok) return { data: null, error: json.message };
    return { data: json.data ?? null, message: json.message };
  } catch (err) {
    console.warn(`[ConsentAPI] POST ${path} failed:`, err);
    return { data: null, error: 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctor-facing API
// ─────────────────────────────────────────────────────────────────────────────

export const ConsentAPI = {
  /**
   * Search patients. Resolves patient records from database with consent status.
   */
  searchPatients: async (
    q: string,
    filters?: { bloodGroup?: string; gender?: string },
    page = 1,
    limit = 20
  ): Promise<{
    patients: PatientSearchResult[];
    pagination?: ApiResponse<PatientSearchResult[]>['pagination'];
  }> => {
    // 1. Try canonical consent search endpoint
    const consentRes = await apiGet<PatientSearchResult[]>('/consent/doctor/patients/search', {
      q,
      bloodGroup: filters?.bloodGroup,
      gender: filters?.gender,
      page,
      limit,
    });

    if (consentRes.data) {
      return { patients: consentRes.data, pagination: consentRes.pagination };
    }

    // 2. Fallback to /doctor/patients/search
    const docRes = await apiGet<any[]>('/doctor/patients/search', {
      q,
      bloodGroup: filters?.bloodGroup,
      gender: filters?.gender,
      page,
      limit,
    });

    if (!docRes.data || docRes.data.length === 0) {
      return { patients: [] };
    }

    // Map raw DB rows to PatientSearchResult
    const patients: PatientSearchResult[] = docRes.data.map((row: any) => {
      const dob = row.date_of_birth ? new Date(row.date_of_birth) : null;
      const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
      const id = row.id || row.patient_id;
      return {
        id,
        uhid: row.uhid || `MV-PAT-${id?.substring(0, 5).toUpperCase()}`,
        fullName: row.full_name || row.fullName || row.email?.split('@')[0] || 'Patient',
        age,
        gender: row.gender || 'Not recorded',
        bloodGroup: row.blood_group || row.bloodGroup || 'Not recorded',
        consentStatus: 'NONE' as const,
      };
    });

    return { patients, pagination: docRes.pagination };
  },


  /**
   * Get minimal patient profile.
   * Protected fields (allergies, conditions, phone) only returned when consent APPROVED.
   */
  getPatientProfile: (patientId: string) =>
    apiGet<PatientMinimalProfile>(`/consent/doctor/patients/${encodeURIComponent(patientId)}/profile`),

  /**
   * Get consent status for the authenticated doctor ↔ patient.
   */
  getConsentStatus: (patientId: string) =>
    apiGet<ConsentStatusResult>(`/consent/doctor/patients/${encodeURIComponent(patientId)}/consent`),

  /**
   * Doctor submits an access request to patient.
   */
  requestAccess: (patientId: string, payload: AccessRequestPayload) =>
    apiPost<ConsentGrant>(
      `/consent/doctor/patients/${encodeURIComponent(patientId)}/request-access`,
      payload
    ),

  /**
   * Get all patients who have active APPROVED consent for this doctor.
   */
  getConsentedPatients: async (): Promise<PatientSearchResult[]> => {
    try {
      // 1. Search all patients via canonical consent directory
      const { patients } = await ConsentAPI.searchPatients('', undefined, 1, 100);
      if (patients && patients.length > 0) {
        return patients.filter((p) => p.consentStatus === 'APPROVED');
      }
      return [];
    } catch (err) {
      console.error('[ConsentAPI.getConsentedPatients] Error:', err);
      return [];
    }
  },

  /**
   * Get all of the doctor's own consent requests.
   */
  getDoctorRequests: () => apiGet<ConsentGrant[]>('/consent/doctor/consent-requests'),

  // ─── Patient-facing API ──────────────────────────────────────────────────

  /**
   * Get pending consent requests for the authenticated patient.
   */
  getPendingRequests: () => apiGet<ConsentGrant[]>('/consent/patient/consent/pending'),

  /**
   * Get all consent grants for the authenticated patient.
   */
  getAllGrants: () => apiGet<ConsentGrant[]>('/consent/patient/consent/grants'),

  /**
   * Patient approves a consent request.
   * Triggers SHA-256 hash generation + blockchain simulation.
   */
  approveRequest: (consentId: string) =>
    apiPost<ConsentGrant>(`/consent/patient/consent/${encodeURIComponent(consentId)}/approve`),

  /**
   * Patient denies a consent request.
   */
  denyRequest: (consentId: string) =>
    apiPost<ConsentGrant>(`/consent/patient/consent/${encodeURIComponent(consentId)}/deny`),

  /**
   * Patient revokes an active consent grant.
   */
  revokeGrant: (consentId: string) =>
    apiPost<ConsentGrant>(`/consent/patient/consent/${encodeURIComponent(consentId)}/revoke`),

  /**
   * Verify cryptographic integrity of a consent hash.
   */
  verifyConsent: (consentId: string) =>
    apiGet<ConsentVerifyResult>(`/consent/consent/${encodeURIComponent(consentId)}/verify`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: human-readable consent status label
// ─────────────────────────────────────────────────────────────────────────────

export function getConsentStatusLabel(status: string): string {
  switch (status) {
    case 'APPROVED': return 'Consent Verified';
    case 'PENDING':  return 'Access Request Pending';
    case 'DENIED':   return 'Access Denied by Patient';
    case 'REVOKED':  return 'Consent Revoked';
    case 'EXPIRED':  return 'Consent Expired';
    case 'NONE':     return 'No Access';
    default:         return 'Unknown Status';
  }
}

export function isAccessGranted(status: string): boolean {
  return status === 'APPROVED';
}
