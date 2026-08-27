// MediVault — Emergency System TypeScript Interfaces

export type EmergencyCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';
export type EmergencyAccessLevel = 'PUBLIC' | 'RESPONDER' | 'DOCTOR';
export type EmergencyActorType = 'PUBLIC' | 'DOCTOR' | 'HOSPITAL' | 'ADMIN';

export type BreakGlassReasonCode =
  | 'PATIENT_UNCONSCIOUS'
  | 'PATIENT_UNABLE_TO_CONSENT'
  | 'LIFE_THREATENING_EMERGENCY'
  | 'UNKNOWN_MEDICAL_HISTORY'
  | 'ALLERGY_VERIFICATION'
  | 'MEDICATION_VERIFICATION'
  | 'OTHER';

export type EmergencyAction =
  | 'QR_SCANNED'
  | 'CREDENTIAL_VALIDATED'
  | 'CREDENTIAL_INVALID'
  | 'CREDENTIAL_EXPIRED'
  | 'CREDENTIAL_REVOKED'
  | 'EMERGENCY_PROFILE_VIEWED'
  | 'DOCTOR_AUTHENTICATED'
  | 'BREAK_GLASS_INITIATED'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'DOCUMENT_VIEWED'
  | 'TIMELINE_VIEWED'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'SUSPICIOUS_ACTIVITY';

export interface EmergencyCredential {
  id: string;
  patientId: string;
  qrUrl?: string;
  version: number;
  status: EmergencyCredentialStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Returned when generating a new credential — raw token only appears ONCE
export interface GeneratedCredential extends EmergencyCredential {
  rawToken: string;     // Used to build QR URL — NEVER stored in DB
  qrUrl: string;        // Full URL encoded in QR
}

export interface EmergencyContactItem {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  enabled: boolean;
}

export interface EmergencyProfile {
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

// What is returned to a public QR scanner (Level 0)
export interface PublicEmergencyProfile {
  patientDisplayName: string;   // First name + last initial only
  bloodGroup: string | null;
  allergies: string[];
  criticalAlerts: string[];     // custom_alerts + high-severity allergies
  currentMedications: string[];
  chronicConditions: string[];
  emergencyContacts: EmergencyContactItem[];
  emergencyNotes: string | null;
  primaryPhysician: string | null;
  credentialId: string;         // opaque — for logging, not patient lookup
  patientId?: string;
  lastUpdated: string;
}

export interface EmergencyAccessSession {
  id: string;
  credentialId: string;
  patientId: string;
  actorId: string;
  actorType: EmergencyActorType;
  accessLevel: EmergencyAccessLevel;
  scope: string[];
  reasonCode: BreakGlassReasonCode;
  reasonText: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  sessionToken?: string;        // Only returned at session creation
}

export interface BreakGlassRequest {
  credential: string;           // Raw token from QR URL
  reasonCode: BreakGlassReasonCode;
  reasonText: string;
  requestedScope: string[];
  durationHours: 0.25 | 1 | 4; // 15min, 1h, 4h
}

export interface EmergencyAccessLogEntry {
  id: string;
  sessionId: string | null;
  patientId: string;
  actorId: string | null;
  actorType: EmergencyActorType;
  action: EmergencyAction;
  resource: string | null;
  reasonCode: string | null;
  reasonText: string | null;
  scope: string[] | null;
  blockchainTxHash: string | null;
  createdAt: string;
  // Enriched fields for patient history view
  actorName?: string;
  actorSpecialization?: string;
  actorHospital?: string;
  actorVerificationStatus?: string;
  sessionExpiresAt?: string;
  sessionRevokedAt?: string;
}
