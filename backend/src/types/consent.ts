/**
 * MediVault — Backend Consent Types
 * Canonical type definitions for the Patient Consent & Authorization system.
 */

export type ConsentStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED' | 'EXPIRED';
export type ConsentScope = 'Full Vault' | 'Lab Reports Only' | 'Emergency Only' | 'Timeline Only';
export type GranteeRole = 'doctor' | 'hospital';

export interface ConsentGrant {
  id: string;
  patientId: string;
  granteeId: string;           // doctor auth.users.id
  granteeRole: GranteeRole;
  status: ConsentStatus;
  purpose: string;
  scope: ConsentScope;
  doctorName?: string;
  consentHash?: string;        // SHA-256 of canonical consent payload
  blockchainTxHash?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRequest {
  patientId: string;
  granteeId: string;
  purpose: string;
  scope?: ConsentScope;
  durationDays?: number;
}

export interface ConsentStatusResult {
  patientId: string;
  granteeId: string;
  hasAccess: boolean;
  status: ConsentStatus | 'NONE';
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
  consentStatus: ConsentStatus | 'NONE';
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
  // Protected fields — only returned when consent is APPROVED
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: string;
  phone?: string;
  email?: string;
  bmi?: number;
}

export interface AuditEvent {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface ConsentHashPayload {
  patientId: string;
  granteeId: string;
  scope: string;
  purpose: string;
  issuedAt: string;
  expiresAt: string;
  version: number;
}
