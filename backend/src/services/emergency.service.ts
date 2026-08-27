import crypto from 'crypto';
import { query, isConnectionError } from '../config/db';
import { logger } from '../utils/logger';
import { BlockchainService } from './blockchain.service';
import type {
  EmergencyCredential,
  GeneratedCredential,
  EmergencyProfile,
  PublicEmergencyProfile,
  EmergencyAccessSession,
  BreakGlassRequest,
  EmergencyAccessLogEntry,
  EmergencyContactItem,
  EmergencyAction,
  EmergencyActorType,
} from '../types/emergency';

const BASE_URL = process.env.FRONTEND_URL || 'https://medi-vault-seven-lyart.vercel.app';
const CREDENTIAL_EXPIRY_DAYS = 365; // 1 year by default

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex').substring(0, 32);
}

function anonymizeName(fullName: string): string {
  if (!fullName) return 'Patient';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function toValidUuid(str: string): string {
  if (!str) return '00000000-0000-4000-a000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

// ─────────────────────────────────────────────────────────────────
// EmergencyService
// ─────────────────────────────────────────────────────────────────

export class EmergencyService {

  /**
   * Helper to resolve a valid PostgreSQL patient UUID.
   * Auto-creates a public.patients row if missing.
   */
  public static async resolvePatientUuid(patientIdStr: string): Promise<string> {
    const validUuid = toValidUuid(patientIdStr);
    try {
      const pCheck = await query(
        `SELECT id FROM public.patients WHERE id::text = $1 OR user_id::text = $1 OR id = $2 OR user_id = $2 LIMIT 1`,
        [patientIdStr, validUuid]
      ).catch(() => ({ rows: [] as any[] }));

      if (pCheck.rows.length > 0) {
        return pCheck.rows[0].id;
      }

      const insRes = await query(
        `INSERT INTO public.patients (id, user_id) VALUES ($1, $1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id`,
        [validUuid]
      ).catch(() => ({ rows: [] as any[] }));

      if (insRes.rows.length > 0) {
        return insRes.rows[0].id;
      }
      return validUuid;
    } catch {
      return validUuid;
    }
  }

  // ───────────────────────────────
  // Credential Lifecycle
  // ───────────────────────────────

  /**
   * Generate a new emergency credential for a patient.
   * Revokes any existing ACTIVE credential first.
   * Returns the raw token ONCE — it is never stored.
   */
  public static async generateCredential(patientId: string): Promise<GeneratedCredential> {
    const realPatientId = await this.resolvePatientUuid(patientId);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + CREDENTIAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Revoke all existing active credentials for this patient
      await query(
        `UPDATE public.emergency_credentials
         SET status = 'REVOKED', revoked_at = NOW(), updated_at = NOW()
         WHERE patient_id = $1 AND status = 'ACTIVE'`,
        [realPatientId]
      );

      // Get current version number
      const versionRes = await query(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
         FROM public.emergency_credentials
         WHERE patient_id = $1`,
        [realPatientId]
      );
      const nextVersion = versionRes.rows[0]?.next_version || 1;

      // Insert new credential (only the hash)
      const res = await query(
        `INSERT INTO public.emergency_credentials
           (patient_id, token_hash, version, status, expires_at)
         VALUES ($1, $2, $3, 'ACTIVE', $4)
         RETURNING *`,
        [realPatientId, tokenHash, nextVersion, expiresAt.toISOString()]
      );

      const row = res.rows[0];
      const qrUrl = `${BASE_URL}/e/${rawToken}`;

      // Ensure emergency_profiles row exists
      await query(
        `INSERT INTO public.emergency_profiles (patient_id)
         VALUES ($1)
         ON CONFLICT (patient_id) DO NOTHING`,
        [realPatientId]
      );

      return {
        id: row.id,
        patientId: row.patient_id,
        rawToken,  // Only returned this once
        qrUrl,
        version: row.version,
        status: row.status,
        expiresAt: row.expires_at,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err: any) {
      logger.error('[EmergencyService.generateCredential]', err);
      throw err;
    }
  }

  /**
   * Get current credential metadata for a patient (no raw token returned).
   */
  public static async getCredential(patientId: string): Promise<EmergencyCredential | null> {
    try {
      const realPatientId = await this.resolvePatientUuid(patientId);

      const res = await query(
        `SELECT * FROM public.emergency_credentials
         WHERE patient_id = $1 AND status = 'ACTIVE'
         ORDER BY version DESC LIMIT 1`,
        [realPatientId]
      );
      if (res.rows.length === 0) return null;
      return this.mapCredentialRow(res.rows[0]);
    } catch (err: any) {
      if (isConnectionError(err)) return null;
      throw err;
    }
  }

  /**
   * Regenerate: revoke old + generate new.
   */
  public static async regenerateCredential(patientId: string): Promise<GeneratedCredential> {
    return this.generateCredential(patientId);
  }

  /**
   * Revoke the active credential for a patient.
   */
  public static async revokeCredential(patientId: string, revokedBy: string): Promise<void> {
    try {
      const realPatientId = await this.resolvePatientUuid(patientId);

      await query(
        `UPDATE public.emergency_credentials
         SET status = 'REVOKED', revoked_at = NOW(), revoked_by = $2, updated_at = NOW()
         WHERE patient_id = $1 AND status = 'ACTIVE'`,
        [realPatientId, revokedBy]
      );
    } catch (err: any) {
      logger.error('[EmergencyService.revokeCredential]', err);
      throw err;
    }
  }

  /**
   * Resolve a raw token from a QR code scan.
   * Hashes it, looks up in DB, validates status/expiry.
   * Updates last_used_at.
   * Returns credential row (with patient_id) or null if invalid.
   */
  public static async resolveCredential(rawToken: string): Promise<{
    credentialId: string;
    patientId: string;
    status: string;
    errorCode?: 'INVALID' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  } | null> {
    try {
      const tokenHash = hashToken(rawToken);
      const res = await query(
        `SELECT * FROM public.emergency_credentials WHERE token_hash = $1 OR id::text = $2`,
        [tokenHash, rawToken]
      );

      if (res.rows.length === 0) {
        return { credentialId: 'unknown', patientId: '', status: 'INVALID', errorCode: 'INVALID' };
      }

      const cred = res.rows[0];

      if (cred.status === 'REVOKED') {
        return { credentialId: cred.id, patientId: cred.patient_id, status: 'REVOKED', errorCode: 'REVOKED' };
      }
      if (cred.status === 'SUSPENDED') {
        return { credentialId: cred.id, patientId: cred.patient_id, status: 'SUSPENDED', errorCode: 'SUSPENDED' };
      }
      if (cred.expires_at && new Date(cred.expires_at) < new Date()) {
        // Auto-expire
        await query(
          `UPDATE public.emergency_credentials SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
          [cred.id]
        );
        return { credentialId: cred.id, patientId: cred.patient_id, status: 'EXPIRED', errorCode: 'EXPIRED' };
      }

      // Valid — update last_used_at
      await query(
        `UPDATE public.emergency_credentials SET last_used_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [cred.id]
      ).catch(() => {}); // Non-blocking

      return { credentialId: cred.id, patientId: cred.patient_id, status: 'ACTIVE' };
    } catch (err: any) {
      logger.error('[EmergencyService.resolveCredential]', err);
      return null;
    }
  }

  // ───────────────────────────────
  // Emergency Profile
  // ───────────────────────────────

  /**
   * Build the public emergency profile for a patient.
   * Respects the patient's visibility settings.
   */
  public static async getPublicProfile(patientId: string, credentialId: string): Promise<PublicEmergencyProfile | null> {
    try {
      // Fetch patient row, profile, and emergency settings in parallel
      const [patientRes, profileRes, settingsRes, medsRes] = await Promise.all([
        query(
          `SELECT p.*, u.full_name, u.email
           FROM public.patients p
           JOIN public.users_profile u ON p.user_id = u.id
           WHERE p.id = $1`,
          [patientId]
        ),
        query(
          `SELECT * FROM public.emergency_profiles WHERE patient_id = $1`,
          [patientId]
        ),
        query(
          `SELECT * FROM public.emergency_profiles WHERE patient_id = $1`,
          [patientId]
        ),
        query(
          `SELECT name, dosage, frequency FROM public.medications
           WHERE patient_id = $1
           ORDER BY created_at DESC LIMIT 10`,
          [patientId]
        ).catch(() => ({ rows: [] as any[] })),
      ]);

      if (patientRes.rows.length === 0) return null;

      const patient = patientRes.rows[0];
      const settings = settingsRes.rows[0] || {};

      const allergies = (() => {
        if (!settings.show_allergies) return [];
        if (Array.isArray(patient.allergies_json) && patient.allergies_json.length > 0) {
          return patient.allergies_json;
        }
        return patient.allergies ? patient.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      })();

      const conditions = (() => {
        if (!settings.show_conditions) return [];
        if (Array.isArray(patient.chronic_conditions_json) && patient.chronic_conditions_json.length > 0) {
          return patient.chronic_conditions_json;
        }
        return patient.chronic_conditions ? patient.chronic_conditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      })();

      const medications = (() => {
        if (!settings.show_medications) return [];
        return medsRes.rows.map((m: any) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`);
      })();

      const emergencyContacts = (() => {
        if (!settings.show_emergency_contacts) return [];
        // Prefer emergency_profiles.emergency_contacts JSON array
        const profileContacts: EmergencyContactItem[] = settings.emergency_contacts || [];
        if (profileContacts.length > 0) {
          return profileContacts.filter((c) => c.enabled !== false);
        }
        // Fallback to patients table fields
        if (patient.emergency_contact_name || patient.emergency_contact_phone) {
          const rawName = patient.emergency_contact_name || '';
          const rawPhone = patient.emergency_contact_phone || '';
          let name = rawName;
          let phone = rawPhone;
          if (!phone && rawName && /[\d+\-\(\)\s]{7,}/.test(rawName)) {
            phone = rawName;
            name = 'Emergency Contact';
          }
          return [{
            name: name || 'Emergency Contact',
            relationship: 'Primary Contact',
            phone: phone || name,
            priority: 1,
            enabled: true,
          }];
        }
        return [];
      })();

      const customAlerts: string[] = settings.custom_alerts || [];
      const criticalAlerts = [...customAlerts, ...allergies.map((a: string) => `ALLERGY: ${a}`)];

      return {
        patientDisplayName: patient.full_name || 'Patient',
        bloodGroup: settings.show_blood_group !== false ? (patient.blood_group || null) : null,
        allergies,
        criticalAlerts,
        currentMedications: medications,
        chronicConditions: conditions,
        emergencyContacts,
        emergencyNotes: settings.emergency_notes || null,
        primaryPhysician: null, // TODO: link to doctor when implemented
        credentialId,
        patientId,
        lastUpdated: patient.updated_at || new Date().toISOString(),
      };
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[EmergencyService.getPublicProfile] DB connection error, returning null');
        return null;
      }
      logger.error('[EmergencyService.getPublicProfile]', err);
      throw err;
    }
  }

  /**
   * Get the patient's full emergency profile settings for the Emergency Center.
   */
  public static async getProfileSettings(patientId: string): Promise<EmergencyProfile> {
    try {
      const realPatientId = await this.resolvePatientUuid(patientId);

      // Ensure row exists
      await query(
        `INSERT INTO public.emergency_profiles (patient_id)
         VALUES ($1)
         ON CONFLICT (patient_id) DO NOTHING`,
        [realPatientId]
      );
      const res = await query(
        `SELECT * FROM public.emergency_profiles WHERE patient_id = $1`,
        [realPatientId]
      );
      const profile = this.mapProfileRow(res.rows[0]);

      // If emergencyContacts is empty, check patients table for existing emergency contact from user profile
      if (!profile.emergencyContacts || profile.emergencyContacts.length === 0) {
        const patientRes = await query(
          `SELECT emergency_contact_name, emergency_contact_phone FROM public.patients WHERE id = $1`,
          [realPatientId]
        ).catch(() => ({ rows: [] as any[] }));

        if (patientRes.rows[0]?.emergency_contact_name || patientRes.rows[0]?.emergency_contact_phone) {
          const rawName = patientRes.rows[0].emergency_contact_name || '';
          const rawPhone = patientRes.rows[0].emergency_contact_phone || '';
          let name = rawName;
          let phone = rawPhone;

          if (!phone && rawName && /[\d+\-\(\)\s]{7,}/.test(rawName)) {
            phone = rawName;
            name = 'Emergency Contact';
          }

          if (name || phone) {
            const defaultItem: EmergencyContactItem = {
              name: name || 'Emergency Contact',
              relationship: 'Primary Contact',
              phone: phone || name,
              priority: 1,
              enabled: true,
            };
            profile.emergencyContacts = [defaultItem];
            // Auto-persist into emergency_profiles
            query(
              `UPDATE public.emergency_profiles SET emergency_contacts = $1::jsonb WHERE patient_id = $2`,
              [JSON.stringify([defaultItem]), realPatientId]
            ).catch(() => {});
          }
        }
      }

      return profile;
    } catch (err: any) {
      logger.error('[EmergencyService.getProfileSettings]', err);
      return this.defaultProfile(patientId);
    }
  }

  /**
   * Update the patient's emergency profile settings.
   */
  public static async updateProfileSettings(patientId: string, updates: Partial<EmergencyProfile>): Promise<EmergencyProfile> {
    const realPatientId = await this.resolvePatientUuid(patientId);

    const fields: string[] = [];
    const values: any[] = [realPatientId];

    const fieldMap: Record<string, string> = {
      showBloodGroup: 'show_blood_group',
      showAllergies: 'show_allergies',
      showMedications: 'show_medications',
      showConditions: 'show_conditions',
      showSurgeries: 'show_surgeries',
      showEmergencyContacts: 'show_emergency_contacts',
      showPrimaryPhysician: 'show_primary_physician',
      showFullTimeline: 'show_full_timeline',
      emergencyNotes: 'emergency_notes',
      customAlerts: 'custom_alerts',
      emergencyContacts: 'emergency_contacts',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates && (updates as any)[key] !== undefined) {
        values.push((updates as any)[key]);
        fields.push(`${col} = $${values.length}`);
      }
    }

    if (fields.length === 0) return this.getProfileSettings(realPatientId);

    values.push(new Date().toISOString());
    fields.push(`updated_at = $${values.length}`);

    try {
      await query(
        `INSERT INTO public.emergency_profiles (patient_id)
         VALUES ($1)
         ON CONFLICT (patient_id) DO NOTHING`,
        [realPatientId]
      );
      await query(
        `UPDATE public.emergency_profiles SET ${fields.join(', ')} WHERE patient_id = $1`,
        values
      );
      return this.getProfileSettings(realPatientId);
    } catch (err: any) {
      logger.error('[EmergencyService.updateProfileSettings]', err);
      throw err;
    }
  }

  // ───────────────────────────────
  // Break-Glass Sessions
  // ───────────────────────────────

  /**
   * Create an emergency access session after doctor authentication.
   */
  public static async createSession(
    credentialId: string,
    patientId: string,
    actorId: string,
    actorType: EmergencyActorType,
    reasonCode: string,
    reasonText: string,
    scope: string[],
    durationHours: number
  ): Promise<EmergencyAccessSession> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    try {
      // Ensure missing columns on emergency_access_sessions exist if not yet migrated
      await query(`
        ALTER TABLE public.emergency_access_sessions
          ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'DOCTOR',
          ADD COLUMN IF NOT EXISTS session_token_hash VARCHAR(64);
      `).catch(() => {});

      const res = await query(
        `INSERT INTO public.emergency_access_sessions
           (credential_id, patient_id, actor_id, actor_type, scope,
            reason_code, reason_text, issued_at, expires_at, session_token_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
         RETURNING *`,
        [
          credentialId, patientId, actorId, actorType,
          scope, reasonCode, reasonText,
          expiresAt.toISOString(), sessionTokenHash,
        ]
      );

      const row = res.rows[0];
      return {
        ...this.mapSessionRow(row),
        sessionToken, // Only returned once
      };
    } catch (err: any) {
      logger.error('[EmergencyService.createSession]', err);
      throw err;
    }
  }

  /**
   * Validate a session by ID. Returns the session if active.
   */
  public static async validateSession(sessionId: string): Promise<EmergencyAccessSession | null> {
    try {
      const res = await query(
        `SELECT * FROM public.emergency_access_sessions WHERE id = $1`,
        [sessionId]
      );
      if (res.rows.length === 0) return null;
      const session = res.rows[0];

      if (session.revoked_at) return null;
      if (new Date(session.expires_at) < new Date()) {
        // Auto-expire
        await query(
          `UPDATE public.emergency_access_sessions SET revoked_at = NOW() WHERE id = $1`,
          [sessionId]
        ).catch(() => {});
        return null;
      }

      return this.mapSessionRow(session);
    } catch (err: any) {
      logger.error('[EmergencyService.validateSession]', err);
      return null;
    }
  }

  /**
   * Revoke an active session.
   */
  public static async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    try {
      await query(
        `UPDATE public.emergency_access_sessions
         SET revoked_at = NOW(), revoked_by = $2
         WHERE id = $1 AND revoked_at IS NULL`,
        [sessionId, revokedBy]
      );
    } catch (err: any) {
      logger.error('[EmergencyService.revokeSession]', err);
      throw err;
    }
  }

  // ───────────────────────────────
  // Audit & Notifications
  // ───────────────────────────────

  /**
   * Log an emergency access event.
   */
  public static async logEvent(params: {
    sessionId?: string;
    patientId: string;
    actorId?: string;
    actorType: EmergencyActorType;
    action: EmergencyAction;
    resource?: string;
    reasonCode?: string;
    reasonText?: string;
    scope?: string[];
    ipAddress?: string;
    blockchainTxHash?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const ipHash = params.ipAddress ? hashIp(params.ipAddress) : null;
    try {
      const res = await query(
        `INSERT INTO public.emergency_access_logs
           (session_id, patient_id, actor_id, actor_type, action, resource,
            access_reason, scope, ip_hash, blockchain_tx_hash, metadata,
            expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + INTERVAL '1 year')
         RETURNING id`,
        [
          params.sessionId || null,
          params.patientId,
          params.actorId || null,
          params.actorType,
          params.action,
          params.resource || null,
          params.reasonText || params.reasonCode || null,
          params.scope || null,
          ipHash,
          params.blockchainTxHash || null,
          JSON.stringify(params.metadata || {}),
        ]
      );
      return res.rows[0]?.id || 'unknown';
    } catch (err: any) {
      logger.warn('[EmergencyService.logEvent] Audit log warning:', err.message);
      return 'failed';
    }
  }

  /**
   * Notify patient of emergency access (non-blocking).
   */
  public static async notifyPatient(
    patientUserId: string,
    actorName: string,
    reasonCode: string,
    expiresAt: string
  ): Promise<void> {
    const reasonLabels: Record<string, string> = {
      PATIENT_UNCONSCIOUS: 'Patient unconscious',
      PATIENT_UNABLE_TO_CONSENT: 'Patient unable to provide consent',
      LIFE_THREATENING_EMERGENCY: 'Life-threatening emergency',
      UNKNOWN_MEDICAL_HISTORY: 'Unknown medical history',
      ALLERGY_VERIFICATION: 'Allergy verification needed',
      MEDICATION_VERIFICATION: 'Medication verification needed',
      OTHER: 'Emergency situation',
    };

    const expiryDisplay = new Date(expiresAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    try {
      await query(
        `INSERT INTO public.notifications
           (recipient_id, type, title, message, metadata)
         VALUES ($1, 'EMERGENCY_ACCESS', $2, $3, $4)`,
        [
          patientUserId,
          'Emergency Access Alert',
          `A verified healthcare professional accessed your MediVault emergency profile. Reason: ${reasonLabels[reasonCode] || reasonCode}. Access expires: ${expiryDisplay}.`,
          JSON.stringify({ actorName, reasonCode, expiresAt }),
        ]
      );
    } catch (err: any) {
      logger.warn('[EmergencyService.notifyPatient] Notification warning:', err.message);
    }
  }

  /**
   * Anchor an audit event to blockchain (async, non-blocking).
   */
  public static anchorBlockchain(eventHash: string, patientId: string): void {
    BlockchainService.notarizeDocumentHash(eventHash, patientId)
      .then((result) => {
        // Update the log entry with the tx hash (best-effort)
        query(
          `UPDATE public.emergency_access_logs
           SET blockchain_tx_hash = $1
           WHERE patient_id = $2 AND blockchain_tx_hash IS NULL
           ORDER BY created_at DESC LIMIT 1`,
          [result.txHash, patientId]
        ).catch(() => {});
      })
      .catch((err) => {
        logger.warn('[EmergencyService] Blockchain anchoring failed (non-fatal):', err.message);
      });
  }

  // ───────────────────────────────
  // Patient Access History
  // ───────────────────────────────

  /**
   * Get enriched emergency access history for a patient.
   */
  public static async getAccessHistory(patientId: string, limit = 20): Promise<EmergencyAccessLogEntry[]> {
    try {
      let realPatientId = patientId;
      const pCheck = await query(
        `SELECT id FROM public.patients WHERE id = $1 OR user_id = $1 LIMIT 1`,
        [patientId]
      ).catch(() => ({ rows: [] as any[] }));
      if (pCheck.rows.length > 0) {
        realPatientId = pCheck.rows[0].id;
      }

      const res = await query(
        `SELECT
           eal.*,
           eas.expires_at AS session_expires_at,
           eas.revoked_at AS session_revoked_at,
           eas.scope AS session_scope,
           u.full_name AS actor_name,
           d.specialization AS actor_specialization,
           d.hospital_name AS actor_hospital,
           d.verification_status AS actor_verification_status
         FROM public.emergency_access_logs eal
         LEFT JOIN public.emergency_access_sessions eas ON eal.session_id = eas.id
         LEFT JOIN public.users_profile u ON eal.actor_id = u.id
         LEFT JOIN public.doctors d ON u.id = d.user_id
         WHERE eal.patient_id = $1
           AND eal.action NOT IN ('QR_SCANNED') -- don't expose individual scans at history level
         ORDER BY eal.created_at DESC
         LIMIT $2`,
        [realPatientId, limit]
      );

      return res.rows.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        patientId: row.patient_id,
        actorId: row.actor_id,
        actorType: row.actor_type || 'PUBLIC',
        action: row.action,
        resource: row.resource,
        reasonCode: null,
        reasonText: row.access_reason,
        scope: row.session_scope || row.scope,
        blockchainTxHash: row.blockchain_tx_hash,
        createdAt: row.created_at,
        actorName: row.actor_name,
        actorSpecialization: row.actor_specialization,
        actorHospital: row.actor_hospital,
        actorVerificationStatus: row.actor_verification_status,
        sessionExpiresAt: row.session_expires_at,
        sessionRevokedAt: row.session_revoked_at,
      }));
    } catch (err: any) {
      if (isConnectionError(err)) return [];
      logger.error('[EmergencyService.getAccessHistory]', err);
      throw err;
    }
  }

  // ───────────────────────────────
  // Rate Limiting (Basic)
  // ───────────────────────────────

  /**
   * Check if a credential has been scanned suspiciously many times.
   */
  public static async checkScanRateLimit(credentialId: string, ipAddress?: string): Promise<{
    allowed: boolean;
    scanCount: number;
  }> {
    try {
      const res = await query(
        `SELECT COUNT(*) AS scan_count
         FROM public.emergency_access_logs
         WHERE patient_id = (
           SELECT patient_id FROM public.emergency_credentials WHERE id = $1
         )
         AND action = 'QR_SCANNED'
         AND created_at > NOW() - INTERVAL '1 hour'`,
        [credentialId]
      );
      const scanCount = parseInt(res.rows[0]?.scan_count || '0');
      return { allowed: scanCount < 30, scanCount };
    } catch {
      return { allowed: true, scanCount: 0 };
    }
  }

  // ───────────────────────────────
  // Private Mappers
  // ───────────────────────────────

  private static mapCredentialRow(row: any): EmergencyCredential {
    return {
      id: row.id,
      patientId: row.patient_id,
      qrUrl: `${BASE_URL}/e/${row.id}`,
      version: row.version,
      status: row.status,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapSessionRow(row: any): EmergencyAccessSession {
    return {
      id: row.id,
      credentialId: row.credential_id,
      patientId: row.patient_id,
      actorId: row.actor_id,
      actorType: row.actor_type,
      accessLevel: row.access_level,
      scope: Array.isArray(row.scope) ? row.scope : (typeof row.scope === 'string' ? JSON.parse(row.scope) : []),
      reasonCode: row.reason_code,
      reasonText: row.reason_text,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    };
  }

  private static mapProfileRow(row: any): EmergencyProfile {
    return {
      id: row.id,
      patientId: row.patient_id,
      showBloodGroup: row.show_blood_group ?? true,
      showAllergies: row.show_allergies ?? true,
      showMedications: row.show_medications ?? true,
      showConditions: row.show_conditions ?? true,
      showSurgeries: row.show_surgeries ?? true,
      showEmergencyContacts: row.show_emergency_contacts ?? true,
      showPrimaryPhysician: row.show_primary_physician ?? false,
      showFullTimeline: row.show_full_timeline ?? false,
      emergencyNotes: row.emergency_notes || null,
      customAlerts: row.custom_alerts || [],
      emergencyContacts: Array.isArray(row.emergency_contacts) ? row.emergency_contacts : [],
      updatedAt: row.updated_at,
    };
  }

  private static defaultProfile(patientId: string): EmergencyProfile {
    return {
      id: '',
      patientId,
      showBloodGroup: true,
      showAllergies: true,
      showMedications: true,
      showConditions: true,
      showSurgeries: true,
      showEmergencyContacts: true,
      showPrimaryPhysician: false,
      showFullTimeline: false,
      emergencyNotes: null,
      customAlerts: [],
      emergencyContacts: [],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch or seed real patient medical documents from PostgreSQL
   */
  public static async getPatientDocuments(patientId: string): Promise<any[]> {
    try {
      const docRes = await query(
        `SELECT id, patient_id, document_name, mime_type,
                file_size_bytes as file_size, document_category,
                checksum_sha256, created_at
         FROM public.documents
         WHERE (
           patient_id::text = $1
           OR uploader_id::text = $1
           OR patient_id::text IN (SELECT id::text FROM public.patients WHERE user_id::text = $1 OR id::text = $1)
           OR patient_id::text IN (SELECT user_id::text FROM public.patients WHERE id::text = $1 OR user_id::text = $1)
           OR uploader_id::text IN (SELECT user_id::text FROM public.patients WHERE id::text = $1 OR user_id::text = $1)
         )
         AND is_archived = FALSE
         ORDER BY created_at DESC`,
        [patientId]
      );

      return docRes.rows.map((r: any) => ({
        id: r.id,
        patient_id: r.patient_id,
        document_name: r.document_name,
        original_filename: r.document_name,
        mime_type: r.mime_type || 'application/pdf',
        file_size: parseInt(r.file_size || '1048576', 10),
        document_category: r.document_category || 'Blood Report',
        hospital_name: r.hospital_name || null,
        doctor_name: r.doctor_name || null,
        visit_date: r.visit_date ? new Date(r.visit_date).toISOString().split('T')[0] : null,
        checksum_sha256: r.checksum_sha256 || '',
        created_at: r.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      logger.error('[EmergencyService.getPatientDocuments]', err);
      return [];
    }
  }

  /**
   * Fetch real patient clinical timeline events from PostgreSQL
   */
  public static async getPatientTimeline(patientId: string): Promise<any[]> {
    try {
      const timelineRes = await query(
        `SELECT id, patient_id, title, summary as description, event_date as date,
                facility_name as facility, doctor_name as doctor, event_type as category
         FROM public.clinical_events
         WHERE (
           patient_id::text = $1
           OR patient_id::text IN (SELECT id::text FROM public.patients WHERE user_id::text = $1 OR id::text = $1)
           OR patient_id::text IN (SELECT user_id::text FROM public.patients WHERE id::text = $1 OR user_id::text = $1)
         )
         ORDER BY event_date DESC`,
        [patientId]
      );

      return timelineRes.rows.map((r: any) => ({
        id: r.id,
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
        title: r.title,
        category: r.category || 'Medical Event',
        doctor: r.doctor || null,
        facility: r.facility || null,
        description: r.description || '',
      }));
    } catch (err) {
      logger.error('[EmergencyService.getPatientTimeline]', err);
      return [];
    }
  }

  /**
   * Fetch real patient lab results from PostgreSQL (lab_results table + OCR clinical events)
   */
  public static async getPatientLabs(patientId: string): Promise<any[]> {
    try {
      // 1. Fetch from lab_results table
      const labsRes = await query(
        `SELECT id, patient_id, test_name as name, value as val, status, reference_range as ref, visit_date, created_at
         FROM public.lab_results
         WHERE (
           patient_id::text = $1
           OR patient_id::text IN (SELECT id::text FROM public.patients WHERE user_id::text = $1 OR id::text = $1)
           OR patient_id::text IN (SELECT user_id::text FROM public.patients WHERE id::text = $1 OR user_id::text = $1)
         )
         ORDER BY created_at DESC`,
        [patientId]
      );

      const dbLabs = labsRes.rows.map((r: any) => ({
        name: r.name,
        val: r.val,
        status: (r.status || 'NORMAL').toUpperCase(),
        ref: r.ref || 'Normal Range',
        visit_date: r.visit_date ? new Date(r.visit_date).toISOString().split('T')[0] : null,
      }));

      // 2. Fetch OCR-extracted labs from clinical_events.structured_data->'lab_results'
      const ocrLabsRes = await query(
        `SELECT 
           ce.event_date as visit_date,
           lab_item->>'test_name' as name,
           lab_item->>'value' as val,
           lab_item->>'unit' as unit,
           lab_item->>'status' as status,
           lab_item->>'reference_range' as ref
         FROM public.clinical_events ce,
         jsonb_array_elements(ce.structured_data->'lab_results') as lab_item
         WHERE (
           ce.patient_id::text = $1
           OR ce.patient_id::text IN (SELECT id::text FROM public.patients WHERE user_id::text = $1 OR id::text = $1)
           OR ce.patient_id::text IN (SELECT user_id::text FROM public.patients WHERE id::text = $1 OR user_id::text = $1)
         )
         AND ce.structured_data IS NOT NULL
         AND ce.structured_data->'lab_results' IS NOT NULL`,
        [patientId]
      ).catch(() => ({ rows: [] as any[] }));

      const ocrLabs = ocrLabsRes.rows
        .filter((r: any) => r.name && r.val)
        .map((r: any) => {
          const valWithUnit = r.unit && !r.val.includes(r.unit) ? `${r.val} ${r.unit}` : r.val;
          return {
            name: r.name,
            val: valWithUnit,
            status: (r.status || 'NORMAL').toUpperCase(),
            ref: r.ref || 'Normal Range',
            visit_date: r.visit_date ? new Date(r.visit_date).toISOString().split('T')[0] : null,
          };
        });

      const DUMMY_LAB_NAMES = [
        'hemoglobin',
        'total leucocyte count (wbc)',
        'total wbc',
        'platelet count',
        'fasting blood glucose',
        'serum creatinine',
        'blood pressure',
      ];
      const DUMMY_VALS = [
        '10.2', '10.2 g/dL', '6,800', '6,800 /cu mm', '7,200', '7,200 /cu mm',
        '240,000', '240,000 /cu mm', '108', '108 mg/dL', '0.9', '0.9 mg/dL',
        '120/78', '120/78 mmHg', '13.8', '13.8 g/dL'
      ];

      const isDummy = (name: string, val: string) => {
        const cleanName = (name || '').toLowerCase().trim();
        const cleanVal = (val || '').trim();
        return DUMMY_LAB_NAMES.includes(cleanName) && DUMMY_VALS.some(dv => cleanVal === dv || cleanVal.startsWith(dv));
      };

      // Combine both, avoiding exact duplicates by name and value and discarding dummy seed labs
      const combined = [...dbLabs].filter((item) => !isDummy(item.name, item.val));
      for (const item of ocrLabs) {
        if (isDummy(item.name, item.val)) continue;
        const exists = combined.some(
          (c) => c.name.toLowerCase() === item.name.toLowerCase() && c.val === item.val
        );
        if (!exists) {
          combined.push(item);
        }
      }

      return combined;
    } catch (err) {
      logger.error('[EmergencyService.getPatientLabs]', err);
      return [];
    }
  }
}
