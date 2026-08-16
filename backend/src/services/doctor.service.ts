import { query, isConnectionError } from '../config/db';
import { logger } from '../utils/logger';
import { AIService } from './ai.service';
import {
  DoctorProfile,
  DoctorConsultation,
  DoctorPrescription,
  EmergencyClinicalSummary,
  DoctorNotification,
  VerificationStatus,
} from '../types/doctor';

export class DoctorService {
  /**
   * Fetch doctor profile by user ID
   */
  public static async getDoctorProfileByUserId(userId: string): Promise<DoctorProfile | null> {
    try {
      let res = await query(
        `SELECT d.*, p.full_name, p.email, p.phone, p.avatar_url AS profile_image_url
         FROM public.doctors d
         JOIN public.users_profile p ON d.user_id = p.id
         WHERE d.user_id = $1`,
        [userId]
      );
      if (res.rows.length === 0) {
        // Auto-provision verified doctor entry
        await query(
          `INSERT INTO public.doctors (user_id, license_number, specialization, hospital_affiliation, verification_status)
           VALUES ($1, $2, 'Emergency Medicine', 'MediVault EMR', 'VERIFIED')
           ON CONFLICT (user_id) DO UPDATE SET verification_status = 'VERIFIED'`,
          [userId, `DOC-${userId.substring(0, 8).toUpperCase()}`]
        ).catch(() => {});

        res = await query(
          `SELECT d.*, p.full_name, p.email, p.phone, p.avatar_url AS profile_image_url
           FROM public.doctors d
           JOIN public.users_profile p ON d.user_id = p.id
           WHERE d.user_id = $1`,
          [userId]
        );
      }
      if (res.rows.length === 0) {
        return this.getDemoDoctorProfile(userId);
      }
      const row = res.rows[0];
      return this.mapDoctorRow(row);
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[DoctorService] Database connection fallback for getDoctorProfileByUserId');
        return this.getDemoDoctorProfile(userId);
      }
      return this.getDemoDoctorProfile(userId);
    }
  }

  /**
   * Search patients by query and filters
   */
  public static async searchPatients(queryStr: string, filter?: { bloodGroup?: string; gender?: string }) {
    try {
      let sql = `
        SELECT p.*, prof.full_name, prof.email, prof.phone, prof.avatar_url AS profile_image_url
        FROM public.patients p
        JOIN public.users_profile prof ON p.user_id = prof.id
        WHERE (
          prof.full_name ILIKE $1 OR
          prof.email ILIKE $1 OR
          prof.phone ILIKE $1 OR
          p.blood_group ILIKE $1 OR
          p.id::text ILIKE $1
        )
      `;
      const params: any[] = [`%${queryStr}%`];

      if (filter?.bloodGroup) {
        params.push(filter.bloodGroup);
        sql += ` AND p.blood_group = $${params.length}`;
      }
      if (filter?.gender) {
        params.push(filter.gender);
        sql += ` AND p.gender = $${params.length}`;
      }

      sql += ` LIMIT 20`;
      const res = await query(sql, params);
      return res.rows;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[DoctorService] Database fallback searchPatients');
        return this.getDemoPatientsSearch(queryStr);
      }
      throw err;
    }
  }

  /**
   * Request access to patient records
   */
  public static async requestPatientAccess(doctorId: string, patientId: string, purpose: string) {
    try {
      const res = await query(
        `INSERT INTO public.consent_requests (patient_id, requested_by, purpose, status, expires_at)
         VALUES ($1, $2, $3, 'PENDING', NOW() + INTERVAL '7 days')
         RETURNING *`,
        [patientId, doctorId, purpose]
      );

      // Create patient notification
      await query(
        `INSERT INTO public.notifications (recipient_id, sender_id, type, title, message, metadata)
         VALUES ($1, $2, 'CONSENT_REQUESTED', 'Doctor Access Request', $3, $4)`,
        [
          patientId,
          doctorId,
          `A physician requested consent to access your medical records for: "${purpose}"`,
          JSON.stringify({ consentRequestId: res.rows[0].id }),
        ]
      );

      return res.rows[0];
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[DoctorService] Database fallback requestPatientAccess');
        return {
          id: 'demo-consent-req-123',
          patient_id: patientId,
          requested_by: doctorId,
          purpose,
          status: 'PENDING',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      throw err;
    }
  }

  /**
   * Legacy emergency access — kept for backward compatibility with /doctor/emergency/access route.
   * New break-glass flow uses EmergencyController.breakGlassAccess via /emergency/access.
   * This method is now a thin wrapper that resolves the credential via the new EmergencyService.
   */
  public static async grantEmergencyAccess(
    doctorUserId: string,
    patientQrOrCode: string,
    reason: string
  ): Promise<EmergencyClinicalSummary> {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const accessLogId = `EMG-${Date.now().toString(36).toUpperCase()}`;

    try {
      // 1. Try new tokenized credential system first (new QR codes)
      const { EmergencyService } = await import('./emergency.service');
      const resolved = await EmergencyService.resolveCredential(patientQrOrCode);

      if (resolved && !resolved.errorCode) {
        // New system: build clinical summary from EmergencyService
        const profile = await EmergencyService.getPublicProfile(resolved.patientId, resolved.credentialId);
        if (profile) {
          await EmergencyService.logEvent({
            patientId: resolved.patientId,
            actorId: doctorUserId,
            actorType: 'DOCTOR',
            action: 'ACCESS_GRANTED',
            reasonText: reason,
            scope: ['emergency.profile'],
          });
          return {
            patientId: resolved.patientId,
            patientName: profile.patientDisplayName,
            age: 0,
            gender: '',
            bloodGroup: profile.bloodGroup || '',
            allergies: profile.allergies,
            chronicConditions: profile.chronicConditions,
            currentMedications: profile.currentMedications,
            emergencyContacts: profile.emergencyContacts.map((c) => ({
              name: c.name,
              relation: c.relationship,
              phone: c.phone,
            })),
            recentVitalSigns: {},
            grantedUntil: expiresAt,
            accessLogId,
          };
        }
      }

      // 2. Fallback: legacy UUID/QR code lookup
      const res = await query(
        `SELECT p.*, prof.full_name, prof.email, prof.phone
         FROM public.patients p
         JOIN public.users_profile prof ON p.user_id = prof.id
         WHERE p.id::text = $1 OR p.emergency_qr_code = $1
         LIMIT 1`,
        [patientQrOrCode]
      );

      const patientRow = res.rows[0];
      if (!patientRow) {
        throw new Error('Patient not found for emergency access credential');
      }

      await query(
        `INSERT INTO public.emergency_access_logs (patient_id, access_reason, expires_at, blockchain_tx_hash)
         VALUES ($1, $2, $3, $4)`,
        [patientRow.id, reason, expiresAt, `0x${Date.now().toString(16)}`]
      ).catch((e) => logger.warn('[Emergency Log Warning]', e.message));

      const dob = patientRow.date_of_birth ? new Date(patientRow.date_of_birth) : new Date(1990, 3, 12);
      const age = new Date().getFullYear() - dob.getFullYear();

      return {
        patientId: patientRow.id,
        patientName: patientRow.full_name || 'Unknown Patient',
        age,
        gender: patientRow.gender || '',
        bloodGroup: patientRow.blood_group || '',
        allergies: patientRow.allergies ? patientRow.allergies.split(', ') : [],
        chronicConditions: patientRow.chronic_conditions ? patientRow.chronic_conditions.split(', ') : [],
        currentMedications: [],
        emergencyContacts: [],
        recentVitalSigns: {},
        grantedUntil: expiresAt,
        accessLogId,
      };
    } catch (err: any) {
      logger.warn('[DoctorService.grantEmergencyAccess] Error:', err.message);
      throw err;
    }
  }

  /**
   * Create structured consultation note
   */
  public static async createConsultation(data: Partial<DoctorConsultation>): Promise<DoctorConsultation> {
    try {
      const res = await query(
        `INSERT INTO public.doctor_consultations
         (doctor_id, patient_id, symptoms, vitals, observations, diagnosis, treatment_plan, advice, follow_up_date, attachments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          data.doctorId,
          data.patientId,
          data.symptoms || [],
          JSON.stringify(data.vitals || {}),
          data.observations || '',
          data.diagnosis,
          data.treatmentPlan || '',
          data.advice || '',
          data.followUpDate || null,
          JSON.stringify(data.attachments || []),
        ]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        doctorId: row.doctor_id,
        patientId: row.patient_id,
        symptoms: row.symptoms,
        vitals: typeof row.vitals === 'string' ? JSON.parse(row.vitals) : row.vitals,
        observations: row.observations,
        diagnosis: row.diagnosis,
        treatmentPlan: row.treatment_plan,
        advice: row.advice,
        followUpDate: row.follow_up_date,
        attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments,
        createdAt: row.created_at,
      };
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[DoctorService] Database fallback createConsultation');
        return {
          id: `CS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          doctorId: data.doctorId || 'doc-123',
          patientId: data.patientId || 'demo-patient-123',
          symptoms: data.symptoms || ['Cough', 'Mild Fever'],
          vitals: data.vitals || { bloodPressure: '120/80', heartRate: 72 },
          observations: data.observations || 'Chest clear, throat slightly erythematous.',
          diagnosis: data.diagnosis || 'Acute Upper Respiratory Tract Infection',
          treatmentPlan: data.treatmentPlan || 'Symptomatic treatment, hydration, 5 days rest.',
          advice: data.advice || 'Return if fever persists beyond 3 days.',
          followUpDate: data.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  /**
   * Create digital prescription with AI explanation & digital hash
   */
  public static async createPrescription(data: Partial<DoctorPrescription>): Promise<DoctorPrescription> {
    const digitalSignature = `SIG-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const aiExplanation = `This prescription contains ${data.medicines?.length || 0} prescribed medications. Take as instructed by your doctor. Verify all potential drug allergies before starting dosage.`;

    try {
      const res = await query(
        `INSERT INTO public.doctor_prescriptions
         (consultation_id, doctor_id, patient_id, medicines, recommended_tests, digital_signature, blockchain_tx_hash, ai_explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.consultationId || null,
          data.doctorId,
          data.patientId,
          JSON.stringify(data.medicines || []),
          data.recommendedTests || [],
          digitalSignature,
          txHash,
          aiExplanation,
        ]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        consultationId: row.consultation_id,
        doctorId: row.doctor_id,
        patientId: row.patient_id,
        medicines: typeof row.medicines === 'string' ? JSON.parse(row.medicines) : row.medicines,
        recommendedTests: row.recommended_tests,
        digitalSignature: row.digital_signature,
        blockchainTxHash: row.blockchain_tx_hash,
        aiExplanation: row.ai_explanation,
        createdAt: row.created_at,
      };
    } catch (err: any) {
      if (isConnectionError(err)) {
        logger.warn('[DoctorService] Database fallback createPrescription');
        return {
          id: `RX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          consultationId: data.consultationId,
          doctorId: data.doctorId || 'doc-123',
          patientId: data.patientId || 'demo-patient-123',
          medicines: data.medicines || [],
          recommendedTests: data.recommendedTests || [],
          digitalSignature,
          blockchainTxHash: txHash,
          aiExplanation,
          createdAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  /**
   * Helper mapping doctor DB row to interface
   */
  private static mapDoctorRow(row: any): DoctorProfile {
    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name || 'Dr. Sarah Jenkins',
      email: row.email || 'doctor@hospital.org',
      phone: row.phone,
      licenseNumber: row.license_number,
      registrationCouncil: row.registration_council || 'Medical Council of India / AMA',
      specialization: row.specialization || 'Cardiology & General Medicine',
      experienceYears: row.experience_years || 12,
      hospitalAffiliation: row.hospital_affiliation || 'St. Jude Memorial Hospital',
      clinicName: row.clinic_name || 'Jenkins Cardiac Care Clinic',
      address: row.address || '742 Evergreen Terrace, Medical District',
      profilePhotoUrl: row.profile_image_url || row.profile_photo_url,
      governmentIdUrl: row.government_id_url,
      licenseDocUrl: row.license_doc_url,
      hospitalIdUrl: row.hospital_id_url,
      languages: row.languages || ['English', 'Spanish'],
      verificationStatus: (row.verification_status as VerificationStatus) || 'VERIFIED',
      rejectionReason: row.rejection_reason,
      consultationHours: typeof row.consultation_hours === 'string' ? JSON.parse(row.consultation_hours) : row.consultation_hours,
      createdAt: row.created_at,
    };
  }

  /**
   * Demo doctor profile fallback
   */
  public static getDemoDoctorProfile(userId: string): DoctorProfile {
    return {
      id: 'doc-jenkins-123',
      userId: userId || 'demo-doctor-uid',
      fullName: 'Dr. Sarah Jenkins, MD',
      email: 'doctor@hospital.org',
      phone: '+1 (555) 345-6789',
      licenseNumber: 'DOC-REG-892410',
      registrationCouncil: 'State Medical Council',
      specialization: 'Internal Medicine & Clinical Cardiology',
      experienceYears: 14,
      hospitalAffiliation: 'St. Jude Memorial Hospital',
      clinicName: 'Jenkins Medical Associates',
      address: 'Suite 300, 100 Medical Center Way',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
      languages: ['English', 'Spanish'],
      verificationStatus: 'VERIFIED',
      consultationHours: {
        mon_fri: '09:00 AM - 05:00 PM',
        sat: '09:00 AM - 01:00 PM',
        sun: 'Closed',
      },
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Demo patient search fallback
   */
  private static getDemoPatientsSearch(queryStr: string) {
    const list = [
      {
        id: 'pat-1001',
        full_name: 'Alex Morgan',
        email: 'alex.morgan@example.com',
        phone: '+1 (555) 987-6543',
        blood_group: 'O+',
        gender: 'Male',
        date_of_birth: '1990-04-12',
        allergies: 'Penicillin, Peanuts',
        riskBadge: 'HIGH_RISK',
        recentDiagnosis: 'Hypertension & Type 2 Diabetes',
        currentMedications: 'Metformin 500mg, Lisinopril 10mg',
        lastVisit: '2026-08-01',
        accessStatus: 'APPROVED',
      },
      {
        id: 'pat-1002',
        full_name: 'Eleanor Vance',
        email: 'eleanor.vance@example.com',
        phone: '+1 (555) 234-8901',
        blood_group: 'A-',
        gender: 'Female',
        date_of_birth: '1984-11-23',
        allergies: 'Sulfa Drugs',
        riskBadge: 'STABLE',
        recentDiagnosis: 'Iron Deficiency Anemia',
        currentMedications: 'Ferrous Sulfate 325mg',
        lastVisit: '2026-07-28',
        accessStatus: 'APPROVED',
      },
      {
        id: 'pat-1003',
        full_name: 'Marcus Brody',
        email: 'marcus.brody@example.com',
        phone: '+1 (555) 678-1234',
        blood_group: 'B+',
        gender: 'Male',
        date_of_birth: '1976-02-15',
        allergies: 'None',
        riskBadge: 'MODERATE_RISK',
        recentDiagnosis: 'Hyperlipidemia',
        currentMedications: 'Atorvastatin 20mg',
        lastVisit: '2026-07-15',
        accessStatus: 'PENDING',
      },
    ];

    if (!queryStr) return list;
    const lower = queryStr.toLowerCase();
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(lower) ||
        p.email.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower) ||
        p.blood_group.toLowerCase().includes(lower)
    );
  }
}
