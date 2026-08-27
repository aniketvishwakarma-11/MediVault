// MediVault — Emergency System API Client
// All calls use the Supabase session JWT for authenticated requests.

import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  let token = session?.access_token;
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('medivault_demo_jwt') || undefined;
  }

  let activeRole: string | null = null;
  if (typeof window !== 'undefined') {
    activeRole =
      localStorage.getItem('medivault_user_role') ||
      (session?.user?.user_metadata?.role as string) ||
      (window.location.pathname.startsWith('/doctor') ? 'doctor' : 'patient');
  }

  return {
    'Content-Type': 'application/json',
    ...(activeRole ? { 'x-user-role': activeRole } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || `API error ${res.status}`);
  }
  return json.data ?? json;
}

// ─────────────────────────────────────────────────────────────────
// Types (mirror backend types for frontend)
// ─────────────────────────────────────────────────────────────────

export type CredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';

export interface EmergencyCredential {
  id: string;
  patientId: string;
  version: number;
  status: CredentialStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on generate/regenerate
  rawToken?: string;
  qrUrl?: string;
}

export interface EmergencyContactItem {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  enabled: boolean;
}

export interface EmergencyProfileSettings {
  id: string;
  patientId: string;
  showBloodGroup: boolean;
  showAllergies: boolean;
  showMedications: boolean;
  showConditions: boolean;
  showSurgeries: boolean;
  showEmergencyContacts: boolean;
  showPrimaryPhysician: boolean;
  showFullTimeline: boolean;
  emergencyNotes: string | null;
  customAlerts: string[];
  emergencyContacts: EmergencyContactItem[];
  updatedAt: string;
}

export interface PublicEmergencyProfile {
  patientDisplayName: string;
  bloodGroup: string | null;
  allergies: string[];
  criticalAlerts: string[];
  currentMedications: string[];
  chronicConditions: string[];
  emergencyContacts: EmergencyContactItem[];
  emergencyNotes: string | null;
  primaryPhysician: string | null;
  credentialId: string;
  patientId?: string;
  lastUpdated: string;
}

export interface EmergencyAccessHistoryItem {
  id: string;
  sessionId: string | null;
  actorType: string;
  action: string;
  reasonText: string | null;
  scope: string[] | null;
  blockchainTxHash: string | null;
  createdAt: string;
  actorName?: string;
  actorSpecialization?: string;
  actorHospital?: string;
  actorVerificationStatus?: string;
  sessionExpiresAt?: string;
  sessionRevokedAt?: string;
}

export type BreakGlassReasonCode =
  | 'PATIENT_UNCONSCIOUS'
  | 'PATIENT_UNABLE_TO_CONSENT'
  | 'LIFE_THREATENING_EMERGENCY'
  | 'UNKNOWN_MEDICAL_HISTORY'
  | 'ALLERGY_VERIFICATION'
  | 'MEDICATION_VERIFICATION'
  | 'OTHER';

export interface BreakGlassRequest {
  credential: string;
  reasonCode: BreakGlassReasonCode;
  reasonText: string;
  requestedScope: string[];
  durationHours: 0.25 | 1 | 4;
}

export interface BreakGlassResponse {
  session: {
    id: string;
    issuedAt: string;
    expiresAt: string;
    scope: string[];
    durationHours: number;
  };
  doctor: {
    name: string;
    specialization: string;
    hospital: string;
    verificationStatus: string;
  };
  profile: PublicEmergencyProfile;
  documents?: any[];
  timeline?: any[];
  labs?: any[];
  reasonCode: string;
  reasonText: string;
}

// ─────────────────────────────────────────────────────────────────
// Patient API
// ─────────────────────────────────────────────────────────────────

export const emergencyApi = {
  /** Generate a new emergency credential (first time or after revoke) */
  async generateCredential(): Promise<EmergencyCredential> {
    return apiFetch('/emergency/credential', { method: 'POST' });
  },

  /** Get current credential status (no raw token) */
  async getCredential(): Promise<EmergencyCredential | null> {
    try {
      return await apiFetch('/emergency/credential/status');
    } catch {
      return null;
    }
  },

  /** Regenerate: revokes old, creates new */
  async regenerateCredential(): Promise<EmergencyCredential> {
    return apiFetch('/emergency/credential/regenerate', { method: 'POST' });
  },

  /** Revoke active credential */
  async revokeCredential(): Promise<void> {
    await apiFetch('/emergency/credential/revoke', { method: 'POST' });
  },

  /** Get emergency profile settings */
  async getProfileSettings(): Promise<EmergencyProfileSettings> {
    return apiFetch('/emergency/profile/settings');
  },

  /** Update emergency profile settings */
  async updateProfileSettings(updates: Partial<EmergencyProfileSettings>): Promise<EmergencyProfileSettings> {
    return apiFetch('/emergency/profile/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /** Get access history */
  async getAccessHistory(limit = 20): Promise<EmergencyAccessHistoryItem[]> {
    return apiFetch(`/emergency/access-history?limit=${limit}`);
  },

  /** Revoke a session */
  async revokeSession(sessionId: string): Promise<void> {
    await apiFetch(`/emergency/session/${sessionId}/revoke`, { method: 'POST' });
  },

  // ─────────────────────────────────────────────────────────────────
  // Doctor API
  // ─────────────────────────────────────────────────────────────────

  /** Break-glass access (doctor) */
  async requestBreakGlassAccess(request: BreakGlassRequest): Promise<BreakGlassResponse> {
    return apiFetch('/emergency/access', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // Public API (no auth)
  // ─────────────────────────────────────────────────────────────────

  /** Resolve a QR credential publicly */
  async resolvePublicCredential(credential: string): Promise<{
    credentialId: string;
    profile: PublicEmergencyProfile;
  }> {
    const res = await fetch(`${API_BASE}/emergency/${credential}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Invalid credential');
    return json.data ?? json;
  },
};
