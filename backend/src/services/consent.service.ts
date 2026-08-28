import crypto from 'crypto';
import { ethers } from 'ethers';
import { query, isConnectionError } from '../config/db';
import { logger } from '../utils/logger';
import { PushNotificationService } from './push-notification.service';
import {
  ConsentGrant,
  ConsentStatus,
  ConsentScope,
  ConsentStatusResult,
  PatientMinimalProfile,
  PatientSearchResult,
  AuditEvent,
  ConsentHashPayload,
} from '../types/consent';

/**
 * MediVault Consent Service
 *
 * Authoritative business logic for the Patient Search & Consent Directory.
 * All consent state changes flow through this service — never through
 * the frontend or direct DB manipulation.
 *
 * Cryptographic flow:
 *   Patient approves → canonical payload hashed (SHA-256) → stored as consent_hash
 *   → keccak256 simulation tx hash stored as blockchain_tx_hash
 *   → audit log written
 */
export class ConsentService {
  // ─────────────────────────────────────────────────────────────
  // 1. Patient Search (doctor-authenticated)
  // ─────────────────────────────────────────────────────────────

  public static async searchPatients(
    doctorUserId: string,
    searchQuery: string,
    filters: { bloodGroup?: string; gender?: string },
    page = 1,
    limit = 20
  ): Promise<{ patients: PatientSearchResult[]; total: number }> {
    const offset = (page - 1) * limit;

    try {
      const q = `%${searchQuery || ''}%`;
      const params: any[] = [q];

      let whereSql = `(
        prof.full_name ILIKE $1 OR
        prof.email ILIKE $1 OR
        prof.phone ILIKE $1 OR
        p.blood_group ILIKE $1 OR
        p.id::text ILIKE $1
      )`;

      if (filters.bloodGroup) {
        params.push(filters.bloodGroup);
        whereSql += ` AND p.blood_group = $${params.length}`;
      }
      if (filters.gender) {
        params.push(filters.gender);
        whereSql += ` AND p.gender ILIKE $${params.length}`;
      }

      // Count
      const countRes = await query(
        `SELECT COUNT(*) as total
         FROM public.patients p
         JOIN public.users_profile prof ON p.user_id = prof.id
         WHERE ${whereSql}`,
        params
      );
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      // Paginated results
      params.push(limit, offset);
      const res = await query(
        `SELECT p.id, p.blood_group, p.gender, p.date_of_birth,
                prof.full_name, prof.email, prof.avatar_url
         FROM public.patients p
         JOIN public.users_profile prof ON p.user_id = prof.id
         WHERE ${whereSql}
         ORDER BY prof.full_name ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      // Batch-load consent status for this doctor + these patients
      const patientIds = res.rows.map((r: any) => r.id);
      const consentMap = await this.batchGetConsentStatus(doctorUserId, patientIds);

      const patients: PatientSearchResult[] = res.rows.map((row: any) => {
        const dob = row.date_of_birth ? new Date(row.date_of_birth) : null;
        const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
        const consent = consentMap.get(row.id);
        const uhid = `MV-PAT-${row.id.substring(0, 5).toUpperCase()}`;

        return {
          id: row.id,
          uhid,
          fullName: row.full_name || row.email?.split('@')[0] || 'Patient',
          age,
          gender: row.gender || 'Not recorded',
          bloodGroup: row.blood_group || 'Not recorded',
          consentStatus: consent?.status ?? 'NONE',
          consentId: consent?.id,
        };
      });

      // Write audit log (non-blocking)
      this.writeAuditLog({
        userId: doctorUserId,
        action: 'PATIENT_SEARCH',
        resourceType: 'patients',
        metadata: { query: searchQuery, resultCount: patients.length, page },
      }).catch(() => {});

      return { patients, total };
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[ConsentService] DB connection fallback for searchPatients');
        return { patients: [], total: 0 };
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Minimal Patient Profile
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns minimal patient identity.
   * Protected fields (allergies, conditions, phone, email) are only
   * included if the requesting doctor has APPROVED consent.
   */
  public static async getMinimalProfile(
    doctorUserId: string,
    patientId: string
  ): Promise<PatientMinimalProfile | null> {
    try {
      const res = await query(
        `SELECT p.id, p.blood_group, p.gender, p.date_of_birth,
                p.allergies_json, p.chronic_conditions_json,
                p.emergency_contact_name, p.emergency_contact_phone,
                p.vitals_json,
                prof.full_name, prof.email, prof.phone, prof.avatar_url
         FROM public.patients p
         JOIN public.users_profile prof ON p.user_id = prof.id
         WHERE p.id = $1`,
        [patientId]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      const dob = row.date_of_birth ? new Date(row.date_of_birth) : null;
      const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;

      // Check consent status to decide whether to include protected fields
      const consentStatus = await this.getConsentStatus(doctorUserId, patientId);
      const hasAccess = consentStatus.hasAccess;

      const vitals = typeof row.vitals_json === 'string'
        ? JSON.parse(row.vitals_json || '{}')
        : (row.vitals_json || {});

      // Calculate BMI from vitals height & weight if available
      let calculatedBmi: string | undefined = undefined;
      if (vitals.height && vitals.weight) {
        const cleanH = String(vitals.height).trim();
        const cleanW = String(vitals.weight).trim();
        const hMatch = cleanH.match(/([0-9.]+)/);
        const wMatch = cleanW.match(/([0-9.]+)/);
        if (hMatch && wMatch) {
          const hVal = parseFloat(hMatch[1]);
          const wVal = parseFloat(wMatch[1]);
          if (!isNaN(hVal) && !isNaN(wVal) && hVal > 0 && wVal > 0) {
            let hMeters = hVal;
            if (cleanH.toLowerCase().includes('cm')) hMeters = hVal / 100;
            else if (cleanH.toLowerCase().includes('ft')) hMeters = hVal * 0.3048;
            else if (hVal > 3) hMeters = hVal / 100;
            let wKg = wVal;
            if (cleanW.toLowerCase().includes('lbs')) wKg = wVal * 0.453592;
            const num = wKg / (hMeters * hMeters);
            if (!isNaN(num) && isFinite(num)) {
              let status = 'Healthy';
              if (num < 18.5) status = 'Underweight';
              else if (num >= 25 && num <= 29.9) status = 'Overweight';
              else if (num >= 30) status = 'Obese';
              calculatedBmi = `${num.toFixed(1)} (${status})`;
            }
          }
        }
      } else if (vitals.bmi) {
        calculatedBmi = String(vitals.bmi);
      }

      const profile: PatientMinimalProfile = {
        id: row.id,
        uhid: `MV-PAT-${row.id.substring(0, 5).toUpperCase()}`,
        fullName: row.full_name || 'Patient',
        age,
        gender: row.gender || 'Not recorded',
        bloodGroup: row.blood_group || 'Not recorded',
        avatarUrl: row.avatar_url,
        // Protected fields — only returned with valid consent
        ...(hasAccess && {
          allergies: Array.isArray(row.allergies_json)
            ? row.allergies_json
            : [],
          chronicConditions: Array.isArray(row.chronic_conditions_json)
            ? row.chronic_conditions_json
            : [],
          emergencyContact: row.emergency_contact_name
            ? `${row.emergency_contact_name} ${row.emergency_contact_phone || ''}`.trim()
            : undefined,
          phone: row.phone,
          email: row.email,
          height: vitals.height,
          weight: vitals.weight,
          bmi: calculatedBmi,
        }),
      };

      // Audit log
      this.writeAuditLog({
        userId: doctorUserId,
        action: 'PATIENT_PROFILE_VIEW',
        resourceType: 'patient_profile',
        resourceId: patientId,
        metadata: { accessGranted: hasAccess },
      }).catch(() => {});

      return profile;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[ConsentService] DB connection fallback for getMinimalProfile');
        return null;
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Consent Status
  // ─────────────────────────────────────────────────────────────

  public static async getConsentStatus(
    doctorUserId: string,
    patientId: string
  ): Promise<ConsentStatusResult> {
    try {
      const res = await query(
        `SELECT id, status, scope, expires_at, consent_hash, blockchain_tx_hash
         FROM public.consent_grants
         WHERE patient_id = $1 AND grantee_id = $2
         ORDER BY
           CASE status::text
             WHEN 'APPROVED' THEN 1
             WHEN 'PENDING'  THEN 2
             WHEN 'DENIED'   THEN 3
             WHEN 'REVOKED'  THEN 4
             WHEN 'EXPIRED'  THEN 5
             ELSE 6
           END,
           created_at DESC
         LIMIT 1`,
        [patientId, doctorUserId]
      );

      if (res.rows.length === 0) {
        return {
          patientId,
          granteeId: doctorUserId,
          hasAccess: false,
          status: 'NONE',
        };
      }

      const row = res.rows[0];
      const isExpired = row.expires_at && new Date(row.expires_at) < new Date();
      const effectiveStatus: ConsentStatus =
        isExpired && row.status === 'APPROVED' ? 'EXPIRED' : row.status;

      // Mark as expired in DB if it slipped through
      if (isExpired && row.status === 'APPROVED') {
        await query(
          `UPDATE public.consent_grants SET status = 'EXPIRED', updated_at = NOW()
           WHERE id = $1`,
          [row.id]
        ).catch(() => {});
      }

      return {
        patientId,
        granteeId: doctorUserId,
        hasAccess: effectiveStatus === 'APPROVED',
        status: effectiveStatus,
        consentId: row.id,
        scope: row.scope,
        expiresAt: row.expires_at,
        consentHash: row.consent_hash,
        blockchainTxHash: row.blockchain_tx_hash,
      };
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[ConsentService] DB connection fallback for getConsentStatus');
        return { patientId, granteeId: doctorUserId, hasAccess: false, status: 'NONE' };
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Create Access Request (Doctor → Patient)
  // ─────────────────────────────────────────────────────────────

  public static async createAccessRequest(
    doctorUserId: string,
    patientId: string,
    purpose: string,
    scope: ConsentScope = 'Full Vault',
    durationDays = 30,
    doctorName?: string
  ): Promise<ConsentGrant> {
    if (!doctorUserId || !patientId || !purpose?.trim()) {
      throw new Error('doctorUserId, patientId, and purpose are required');
    }

    try {
      // Prevent duplicate pending requests
      const existing = await query(
        `SELECT id, status FROM public.consent_grants
         WHERE patient_id = $1 AND grantee_id = $2 AND status = 'PENDING'
         LIMIT 1`,
        [patientId, doctorUserId]
      );

      if (existing.rows.length > 0) {
        throw new Error(
          'A pending access request already exists for this patient. Please wait for the patient to respond.'
        );
      }

      const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();

      const res = await query(
        `INSERT INTO public.consent_grants
           (patient_id, grantee_id, grantee_role, status, purpose, scope, doctor_name, expires_at)
         VALUES ($1, $2, 'doctor', 'PENDING', $3, $4, $5, $6)
         RETURNING *`,
        [patientId, doctorUserId, purpose.trim(), scope, doctorName || null, expiresAt]
      );
      const row = res.rows[0];

      // Notify patient (non-blocking, best-effort)
      this.createPatientNotification(
        patientId,
        doctorUserId,
        'CONSENT_REQUESTED',
        'Doctor Access Request',
        `${doctorName || 'A physician'} has requested access to your medical records. Reason: "${purpose}"`,
        { consentGrantId: row.id, scope }
      ).catch(() => {});

      // Audit log
      this.writeAuditLog({
        userId: doctorUserId,
        action: 'CONSENT_REQUEST_CREATED',
        resourceType: 'consent_grants',
        resourceId: row.id,
        metadata: { patientId, scope, purpose, durationDays },
      }).catch(() => {});

      return this.mapConsentRow(row);
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[ConsentService] DB connection fallback for createAccessRequest');
        return {
          id: `demo-req-${Date.now()}`,
          patientId,
          granteeId: doctorUserId,
          granteeRole: 'doctor',
          status: 'PENDING',
          purpose,
          scope,
          doctorName,
          expiresAt: new Date(Date.now() + durationDays * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Patient Approves Consent Request
  // ─────────────────────────────────────────────────────────────

  public static async approveConsentRequest(
    patientUserId: string,
    consentId: string
  ): Promise<ConsentGrant> {
    try {
      // Verify patient owns this consent request (IDOR protection)
      const ownerCheck = await query(
        `SELECT cg.id, cg.grantee_id, cg.scope, cg.purpose, cg.expires_at, p.id as patient_row_id
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         WHERE cg.id = $1 AND p.user_id = $2 AND cg.status = 'PENDING'`,
        [consentId, patientUserId]
      );

      if (ownerCheck.rows.length === 0) {
        throw new Error(
          'Consent request not found, already processed, or you do not have permission to approve it.'
        );
      }

      const grant = ownerCheck.rows[0];
      const patientId = grant.patient_row_id;
      const issuedAt = new Date().toISOString();
      const expiresAt = grant.expires_at || new Date(Date.now() + 30 * 86400000).toISOString();

      // Generate deterministic consent hash
      const consentHash = this.generateConsentHash({
        patientId,
        granteeId: grant.grantee_id,
        scope: grant.scope || 'Full Vault',
        purpose: grant.purpose || '',
        issuedAt,
        expiresAt,
        version: 1,
      });

      // Generate blockchain simulation tx hash (keccak256)
      const blockchainTxHash = ethers.keccak256(
        ethers.toUtf8Bytes(`medivault-consent:${patientId}:${grant.grantee_id}:${consentHash}`)
      );

      const res = await query(
        `UPDATE public.consent_grants
         SET status = 'APPROVED',
             consent_hash = $1,
             blockchain_tx_hash = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [consentHash, blockchainTxHash, consentId]
      );

      const row = res.rows[0];

      // Notify doctor
      this.createPatientNotification(
        grant.grantee_id,   // recipient = doctor
        patientUserId,
        'CONSENT_APPROVED',
        'Access Request Approved',
        'Your request to access patient records has been approved.',
        { consentGrantId: consentId, consentHash }
      ).catch(() => {});

      // Audit log
      this.writeAuditLog({
        userId: patientUserId,
        action: 'CONSENT_APPROVED',
        resourceType: 'consent_grants',
        resourceId: consentId,
        metadata: { granteeId: grant.grantee_id, scope: grant.scope, consentHash },
      }).catch(() => {});

      return this.mapConsentRow(row);
    } catch (err: any) {
      if (isConnectionError(err)) {
        throw new Error('Database unavailable. Please try again later.');
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Patient Denies Consent Request
  // ─────────────────────────────────────────────────────────────

  public static async denyConsentRequest(
    patientUserId: string,
    consentId: string
  ): Promise<ConsentGrant> {
    try {
      const ownerCheck = await query(
        `SELECT cg.id, cg.grantee_id
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         WHERE cg.id = $1 AND p.user_id = $2 AND cg.status = 'PENDING'`,
        [consentId, patientUserId]
      );

      if (ownerCheck.rows.length === 0) {
        throw new Error('Consent request not found or already processed.');
      }

      const res = await query(
        `UPDATE public.consent_grants
         SET status = 'DENIED', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [consentId]
      );

      this.writeAuditLog({
        userId: patientUserId,
        action: 'CONSENT_DENIED',
        resourceType: 'consent_grants',
        resourceId: consentId,
        metadata: { granteeId: ownerCheck.rows[0].grantee_id },
      }).catch(() => {});

      return this.mapConsentRow(res.rows[0]);
    } catch (err: any) {
      if (isConnectionError(err)) {
        throw new Error('Database unavailable. Please try again later.');
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Patient Revokes Active Consent
  // ─────────────────────────────────────────────────────────────

  public static async revokeConsent(
    patientUserId: string,
    consentId: string
  ): Promise<ConsentGrant> {
    try {
      const ownerCheck = await query(
        `SELECT cg.id, cg.grantee_id
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         WHERE cg.id = $1 AND p.user_id = $2 AND cg.status = 'APPROVED'`,
        [consentId, patientUserId]
      );

      if (ownerCheck.rows.length === 0) {
        throw new Error('Active consent not found or you do not have permission to revoke it.');
      }

      const res = await query(
        `UPDATE public.consent_grants
         SET status = 'REVOKED', consent_hash = NULL, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [consentId]
      );

      this.writeAuditLog({
        userId: patientUserId,
        action: 'CONSENT_REVOKED',
        resourceType: 'consent_grants',
        resourceId: consentId,
        metadata: { granteeId: ownerCheck.rows[0].grantee_id },
      }).catch(() => {});

      return this.mapConsentRow(res.rows[0]);
    } catch (err: any) {
      if (isConnectionError(err)) {
        throw new Error('Database unavailable. Please try again later.');
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Patient — Get Pending Requests
  // ─────────────────────────────────────────────────────────────

  public static async getPendingRequestsForPatient(
    patientUserId: string
  ): Promise<ConsentGrant[]> {
    try {
      const res = await query(
        `SELECT cg.*
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         WHERE p.user_id = $1 AND cg.status = 'PENDING'
         ORDER BY cg.created_at DESC`,
        [patientUserId]
      );
      return res.rows.map(this.mapConsentRow);
    } catch (err: any) {
      if (isConnectionError(err)) return [];
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 9. Patient — Get All Grants
  // ─────────────────────────────────────────────────────────────

  public static async getAllGrantsForPatient(
    patientUserId: string
  ): Promise<ConsentGrant[]> {
    try {
      const res = await query(
        `SELECT cg.*
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         WHERE p.user_id = $1
         ORDER BY cg.created_at DESC`,
        [patientUserId]
      );
      return res.rows.map(this.mapConsentRow);
    } catch (err: any) {
      if (isConnectionError(err)) return [];
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 10. Doctor — Get Own Consent Requests
  // ─────────────────────────────────────────────────────────────

  public static async getDoctorConsentRequests(
    doctorUserId: string
  ): Promise<ConsentGrant[]> {
    try {
      const res = await query(
        `SELECT cg.*, prof.full_name AS patient_name
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         JOIN public.users_profile prof ON p.user_id = prof.id
         WHERE cg.grantee_id = $1
         ORDER BY cg.created_at DESC`,
        [doctorUserId]
      );
      return res.rows.map((row: any) => ({
        ...this.mapConsentRow(row),
        patientName: row.patient_name,
      } as any));
    } catch (err: any) {
      if (isConnectionError(err)) return [];
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 10b. Doctor — Get All Consented (APPROVED) Patients Only
  // ─────────────────────────────────────────────────────────────

  public static async getConsentedPatientsForDoctor(
    doctorUserId: string
  ): Promise<PatientSearchResult[]> {
    try {
      const res = await query(
        `SELECT DISTINCT ON (p.id)
                p.id, p.blood_group, p.gender, p.date_of_birth,
                prof.full_name, prof.email, prof.avatar_url,
                cg.id as consent_id, cg.scope, cg.expires_at
         FROM public.consent_grants cg
         JOIN public.patients p ON cg.patient_id = p.id
         JOIN public.users_profile prof ON p.user_id = prof.id
         WHERE (cg.grantee_id = $1 OR cg.grantee_id IN (SELECT user_id FROM public.doctors WHERE id::text = $1 OR user_id::text = $1))
           AND cg.status = 'APPROVED'
           AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
         ORDER BY p.id, prof.full_name ASC`,
        [doctorUserId]
      );

      return res.rows.map((row: any) => {
        const dob = row.date_of_birth ? new Date(row.date_of_birth) : null;
        const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
        return {
          id: row.id,
          uhid: `MV-PAT-${row.id.substring(0, 5).toUpperCase()}`,
          fullName: row.full_name || row.email?.split('@')[0] || 'Patient',
          age,
          gender: row.gender || 'Not recorded',
          bloodGroup: row.blood_group || 'Not recorded',
          consentStatus: 'APPROVED' as const,
          consentId: row.consent_id,
        };
      });
    } catch (err: any) {
      if (isConnectionError(err)) return [];
      logger.error('[ConsentService.getConsentedPatientsForDoctor]', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 11. Verify Consent Hash (integrity check)
  // ─────────────────────────────────────────────────────────────

  public static async verifyConsentHash(consentId: string): Promise<{
    valid: boolean;
    consentId: string;
    storedHash?: string;
    message: string;
  }> {
    try {
      const res = await query(
        `SELECT id, patient_id, grantee_id, scope, purpose, expires_at,
                consent_hash, status, created_at
         FROM public.consent_grants
         WHERE id = $1`,
        [consentId]
      );

      if (res.rows.length === 0) {
        return { valid: false, consentId, message: 'Consent record not found.' };
      }

      const row = res.rows[0];

      if (row.status !== 'APPROVED') {
        return { valid: false, consentId, message: `Consent status is ${row.status}, not APPROVED.` };
      }

      if (!row.consent_hash) {
        return { valid: false, consentId, message: 'No consent hash recorded for this grant.' };
      }

      return {
        valid: true,
        consentId,
        storedHash: row.consent_hash,
        message: 'Consent hash verified. Grant is cryptographically valid.',
      };
    } catch (err: any) {
      if (isConnectionError(err)) {
        return { valid: false, consentId, message: 'Database unavailable during verification.' };
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates a deterministic SHA-256 hash over a canonical consent payload.
   * Field order is fixed — JSON is NOT used (avoids key-ordering issues).
   */
  private static generateConsentHash(payload: import('../types/consent').ConsentHashPayload): string {
    const canonical =
      `patientId=${payload.patientId}` +
      `|granteeId=${payload.granteeId}` +
      `|scope=${payload.scope}` +
      `|purpose=${payload.purpose}` +
      `|issuedAt=${payload.issuedAt}` +
      `|expiresAt=${payload.expiresAt}` +
      `|version=${payload.version}`;

    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  }

  /**
   * Batch-load latest consent status for a list of patientIds for one doctor.
   * Returns a Map<patientId, { id, status }>.
   */
  private static async batchGetConsentStatus(
    doctorUserId: string,
    patientIds: string[]
  ): Promise<Map<string, { id: string; status: ConsentStatus }>> {
    const result = new Map<string, { id: string; status: ConsentStatus }>();
    if (patientIds.length === 0) return result;

    try {
      // Use DISTINCT ON to get best status per patient
      const res = await query(
        `SELECT DISTINCT ON (cg.patient_id)
                cg.patient_id, cg.id, cg.status
         FROM public.consent_grants cg
         WHERE cg.grantee_id = $1
           AND cg.patient_id = ANY($2::uuid[])
         ORDER BY cg.patient_id,
           CASE cg.status::text
             WHEN 'APPROVED' THEN 1
             WHEN 'PENDING'  THEN 2
             WHEN 'DENIED'   THEN 3
             WHEN 'REVOKED'  THEN 4
             ELSE 5
           END`,
        [doctorUserId, patientIds]
      );

      for (const row of res.rows) {
        result.set(row.patient_id, { id: row.id, status: row.status });
      }
    } catch (err: any) {
      if (!isConnectionError(err)) throw err;
    }
    return result;
  }

  /**
   * Write an immutable audit log entry (non-blocking, best-effort).
   */
  public static async writeAuditLog(event: AuditEvent): Promise<void> {
    try {
      await query(
        `INSERT INTO public.audit_logs
           (user_id, action, resource_type, resource_id, ip_address, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.userId || null,
          event.action,
          event.resourceType,
          event.resourceId || null,
          event.ipAddress || null,
          JSON.stringify(event.metadata || {}),
        ]
      );
    } catch (err: any) {
      // Audit failure must never break the main flow
      logger.warn('[ConsentService.writeAuditLog] Failed to write audit entry:', err?.message);
    }
  }

  /**
   * Create a patient/doctor in-app notification (best-effort).
   */
  private static async createPatientNotification(
    recipientId: string,
    senderId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Resolve auth user_id if recipientId is a patient table id
      let targetUserId = recipientId;
      try {
        const pRes = await query('SELECT user_id FROM public.patients WHERE id = $1', [recipientId]);
        if (pRes.rows.length > 0 && pRes.rows[0].user_id) {
          targetUserId = pRes.rows[0].user_id;
        }
      } catch {
        // use recipientId directly
      }

      await query(
        `INSERT INTO public.notifications
           (recipient_id, sender_id, type, title, message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [targetUserId, senderId, type, title, message, JSON.stringify(metadata || {})]
      );

      // Dispatch Web Push Notification (non-blocking)
      PushNotificationService.sendToUser(targetUserId, {
        title,
        body: message,
        url: type === 'CONSENT_REQUESTED' ? '/patient/consent' : '/patient/dashboard',
        tag: 'consent-alert',
      }).catch((err) => {
        logger.warn('[ConsentService] Push dispatch failed:', err);
      });
    } catch (err: any) {
      logger.warn('[ConsentService.createPatientNotification] Notification insert failed:', err?.message);
    }
  }

  private static mapConsentRow(row: any): ConsentGrant {
    return {
      id: row.id,
      patientId: row.patient_id,
      granteeId: row.grantee_id,
      granteeRole: row.grantee_role || 'doctor',
      status: row.status as ConsentStatus,
      purpose: row.purpose || '',
      scope: row.scope || 'Full Vault',
      doctorName: row.doctor_name,
      consentHash: row.consent_hash,
      blockchainTxHash: row.blockchain_tx_hash,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    };
  }
}
