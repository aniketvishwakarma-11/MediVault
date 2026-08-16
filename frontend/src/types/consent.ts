/**
 * MediVault Frontend — Shared Consent Types
 * Mirrors the backend consent type definitions for full type safety
 * across the doctor and patient dashboards.
 */

export type ConsentStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED' | 'EXPIRED' | 'NONE';
export type ConsentScope = 'Full Vault' | 'Lab Reports Only' | 'Emergency Only' | 'Timeline Only';
export type GranteeRole = 'doctor' | 'hospital';

export interface ConsentGrant {
  id: string;
  patientId: string;
  granteeId: string;
  granteeRole: GranteeRole;
  status: ConsentStatus;
  purpose: string;
  scope: ConsentScope;
  doctorName?: string;
  patientName?: string;
  consentHash?: string;
  blockchainTxHash?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentStatusResult {
  patientId: string;
  granteeId: string;
  hasAccess: boolean;
  status: ConsentStatus;
  consentId?: string;
  scope?: ConsentScope;
  expiresAt?: string;
  consentHash?: string;
  blockchainTxHash?: string;
}

export interface PatientSearchResult {
  id: string;
  uhid: string;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  consentStatus: ConsentStatus;
  consentId?: string;
}

export interface PatientMinimalProfile {
  id: string;
  uhid: string;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  avatarUrl?: string;
  // Protected fields — only present when consent is APPROVED
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: string;
  phone?: string;
  email?: string;
  bmi?: number;
}

export interface ConsentVerifyResult {
  valid: boolean;
  consentId: string;
  storedHash?: string;
  message: string;
}

/** Shape of the access request form */
export interface AccessRequestPayload {
  purpose: string;
  scope?: ConsentScope;
  durationDays?: number;
}
