import { query } from '../config/db';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface AbhaKycDetails {
  fullName: string;
  dob: string;
  gender: string;
  mobileMasked: string;
  aadhaarMasked?: string;
  district?: string;
  state?: string;
  photoUrl?: string;
}

export interface AbhaProfileData {
  abhaNumber: string | null;
  abhaAddress: string | null;
  abhaStatus: 'NOT_LINKED' | 'ACTIVE' | 'SUSPENDED';
  isGovVerified: boolean;
  govIdType: string | null;
  govIdMasked: string | null;
  kycDetails: AbhaKycDetails | null;
  digilockerLinked: boolean;
}

export class GovernmentIdService {
  /**
   * 1. Generate OTP for ABHA Enrollment or Verification (Aadhaar or Mobile)
   */
  static async generateAbhaOtp(userId: string, idType: 'AADHAAR_OTP' | 'MOBILE_OTP' | 'ABHA_LINK', idInput: string) {
    const cleanInput = (idInput || '').replace(/\D/g, '');
    let masked = '';

    if (idType === 'AADHAAR_OTP') {
      if (cleanInput.length !== 12) {
        throw new Error('Aadhaar number must be exactly 12 digits.');
      }
      masked = `XXXX-XXXX-${cleanInput.slice(-4)}`;
    } else if (idType === 'MOBILE_OTP') {
      if (cleanInput.length < 10) {
        throw new Error('Mobile number must be at least 10 digits.');
      }
      masked = `+91-XXXXX-${cleanInput.slice(-4)}`;
    } else {
      // ABHA link
      masked = idInput;
    }

    const txnId = `txn_nha_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const mockOtp = '123456'; // Default sandbox OTP for instant developer testing
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in government_id_verifications
    await query(
      `INSERT INTO public.government_id_verifications 
        (user_id, transaction_id, id_type, id_input_masked, otp_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, txnId, idType, masked, mockOtp, expiresAt]
    );

    logger.info(`[GovernmentIdService] Issued ABHA OTP challenge (${idType}) for user ${userId}, txn: ${txnId}`);

    return {
      transactionId: txnId,
      idType,
      maskedId: masked,
      expiresInSeconds: 600,
      mode: 'SANDBOX',
      hint: 'In sandbox mode, use OTP 123456 to verify.',
    };
  }

  /**
   * 2. Verify OTP & Generate/Activate Official ABHA Credentials
   */
  static async verifyAbhaOtp(userId: string, transactionId: string, otp: string) {
    const cleanOtp = (otp || '').trim();

    // Check challenge
    const res = await query(
      `SELECT * FROM public.government_id_verifications 
       WHERE transaction_id = $1 AND verified = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [transactionId]
    );

    if (res.rows.length === 0) {
      throw new Error('Invalid or expired OTP session. Please request a new OTP.');
    }

    const session = res.rows[0];
    if (new Date() > new Date(session.expires_at)) {
      throw new Error('OTP expired. Please request a new verification code.');
    }

    // In sandbox mode: accepts '123456' or session.otp_code
    if (cleanOtp !== '123456' && cleanOtp !== session.otp_code) {
      throw new Error('Invalid OTP. For sandbox testing, please enter 123456.');
    }

    // Mark verified
    await query(
      `UPDATE public.government_id_verifications SET verified = TRUE WHERE id = $1`,
      [session.id]
    );

    // Retrieve user profile to seed realistic KYC data
    const userRes = await query(
      `SELECT email, full_name FROM public.users_profile WHERE id = $1`,
      [userId]
    );
    const existingName = userRes.rows[0]?.full_name || 'Aniket Vishwakarma';
    const emailPrefix = (userRes.rows[0]?.email || 'patient').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Generate compliant 14-digit ABHA Number: 91-XXXX-XXXX-XXXX
    const random10 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const abhaNumber = `91-${random10.slice(0, 4)}-${random10.slice(4, 8)}-${random10.slice(8, 10)}89`;
    const abhaAddress = `${emailPrefix}.${random10.slice(-4)}@abdm`;

    const kycDetails: AbhaKycDetails = {
      fullName: existingName,
      dob: '1998-05-14',
      gender: 'MALE',
      mobileMasked: '+91-XXXXX-7890',
      aadhaarMasked: session.id_input_masked || 'XXXX-XXXX-9124',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    };

    // Upsert into patients table
    const patientCheck = await query('SELECT id FROM public.patients WHERE user_id = $1', [userId]);
    if (patientCheck.rows.length === 0) {
      await query(
        `INSERT INTO public.patients 
          (user_id, abha_number, abha_address, abha_status, is_gov_verified, gov_id_type, gov_id_masked, kyc_details, updated_at)
         VALUES ($1, $2, $3, 'ACTIVE', TRUE, $4, $5, $6, NOW())`,
        [userId, abhaNumber, abhaAddress, session.id_type, session.id_input_masked, JSON.stringify(kycDetails)]
      );
    } else {
      await query(
        `UPDATE public.patients 
         SET abha_number = $1,
             abha_address = $2,
             abha_status = 'ACTIVE',
             is_gov_verified = TRUE,
             gov_id_type = $3,
             gov_id_masked = $4,
             kyc_details = $5,
             updated_at = NOW()
         WHERE user_id = $6`,
        [abhaNumber, abhaAddress, session.id_type, session.id_input_masked, JSON.stringify(kycDetails), userId]
      );
    }

    logger.info(`[GovernmentIdService] ABHA ID ${abhaNumber} successfully enrolled for user ${userId}`);

    return {
      abhaNumber,
      abhaAddress,
      abhaStatus: 'ACTIVE',
      isGovVerified: true,
      kycDetails,
    };
  }

  /**
   * 3. Link Existing ABHA Number or ABHA Address
   */
  static async linkExistingAbha(userId: string, abhaInput: string) {
    const raw = (abhaInput || '').trim();
    if (!raw) {
      throw new Error('Please enter your 14-digit ABHA Number or ABHA Address (e.g. yourname@abdm).');
    }

    let abhaNumber = '';
    let abhaAddress = '';

    if (raw.includes('@')) {
      abhaAddress = raw.toLowerCase();
      abhaNumber = '91-4521-8932-1140';
    } else {
      const cleanDigits = raw.replace(/\D/g, '');
      if (cleanDigits.length !== 14) {
        throw new Error('ABHA Number must be exactly 14 digits.');
      }
      abhaNumber = `${cleanDigits.slice(0, 2)}-${cleanDigits.slice(2, 6)}-${cleanDigits.slice(6, 10)}-${cleanDigits.slice(10, 14)}`;
      abhaAddress = `user.${cleanDigits.slice(-4)}@abdm`;
    }

    // Retrieve user profile
    const userRes = await query('SELECT full_name FROM public.users_profile WHERE id = $1', [userId]);
    const name = userRes.rows[0]?.full_name || 'Aniket Vishwakarma';

    const kycDetails: AbhaKycDetails = {
      fullName: name,
      dob: '1998-05-14',
      gender: 'MALE',
      mobileMasked: '+91-XXXXX-9012',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    };

    // Upsert into patients
    const patientCheck = await query('SELECT id FROM public.patients WHERE user_id = $1', [userId]);
    if (patientCheck.rows.length === 0) {
      await query(
        `INSERT INTO public.patients 
          (user_id, abha_number, abha_address, abha_status, is_gov_verified, gov_id_type, gov_id_masked, kyc_details, updated_at)
         VALUES ($1, $2, $3, 'ACTIVE', TRUE, 'EXISTING_ABHA', $4, $5, NOW())`,
        [userId, abhaNumber, abhaAddress, abhaNumber, JSON.stringify(kycDetails)]
      );
    } else {
      await query(
        `UPDATE public.patients 
         SET abha_number = $1,
             abha_address = $2,
             abha_status = 'ACTIVE',
             is_gov_verified = TRUE,
             gov_id_type = 'EXISTING_ABHA',
             gov_id_masked = $3,
             kyc_details = $4,
             updated_at = NOW()
         WHERE user_id = $5`,
        [abhaNumber, abhaAddress, abhaNumber, JSON.stringify(kycDetails), userId]
      );
    }

    return {
      abhaNumber,
      abhaAddress,
      abhaStatus: 'ACTIVE',
      isGovVerified: true,
      kycDetails,
    };
  }

  /**
   * 4. Get Current ABHA Profile & Verification Status
   */
  static async getAbhaProfile(userId: string): Promise<AbhaProfileData> {
    const res = await query(
      `SELECT abha_number, abha_address, abha_status, is_gov_verified, gov_id_type, gov_id_masked, kyc_details, digilocker_linked
       FROM public.patients WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return {
        abhaNumber: null,
        abhaAddress: null,
        abhaStatus: 'NOT_LINKED',
        isGovVerified: false,
        govIdType: null,
        govIdMasked: null,
        kycDetails: null,
        digilockerLinked: false,
      };
    }

    const row = res.rows[0];
    return {
      abhaNumber: row.abha_number || null,
      abhaAddress: row.abha_address || null,
      abhaStatus: row.abha_status || 'NOT_LINKED',
      isGovVerified: Boolean(row.is_gov_verified),
      govIdType: row.gov_id_type || null,
      govIdMasked: row.gov_id_masked || null,
      kycDetails: row.kyc_details || null,
      digilockerLinked: Boolean(row.digilocker_linked),
    };
  }

  /**
   * 5. Unlink ABHA
   */
  static async unlinkAbha(userId: string) {
    await query(
      `UPDATE public.patients 
       SET abha_number = NULL,
           abha_address = NULL,
           abha_status = 'NOT_LINKED',
           is_gov_verified = FALSE,
           gov_id_type = NULL,
           gov_id_masked = NULL,
           kyc_details = '{}'::jsonb,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    return { success: true, message: 'Government ABHA ID unlinked successfully.' };
  }

  /**
   * 6. Import Official Health Documents from DigiLocker
   */
  static async importDigiLockerDocs(userId: string, docTypes: string[]) {
    const userRes = await query('SELECT full_name FROM public.users_profile WHERE id = $1', [userId]);
    const name = userRes.rows[0]?.full_name || 'Aniket Vishwakarma';

    const sampleDocs = [
      {
        type: 'PMJAY_CARD',
        name: 'Ayushman Bharat PM-JAY Health Card (₹5 Lakh Cover)',
        issuer: 'National Health Authority (NHA), Govt of India',
        category: 'Insurance',
        uri: 'in.gov.nha.pmjay/AB-PMJAY-99214',
        data: {
          policyNumber: 'PMJAY-MH-2024-88392',
          coverageAmount: '₹5,00,000 / Year',
          beneficiaryName: name,
          familyMembersCovered: 4,
          validTill: '2028-12-31',
        },
      },
      {
        type: 'COVID_VACCINE',
        name: 'COVID-19 Universal Vaccination Certificate (Final Dose)',
        issuer: 'Ministry of Health & Family Welfare (MoHFW), Govt of India',
        category: 'Vaccination',
        uri: 'in.gov.cowin/COWIN-VACC-44910',
        data: {
          vaccineName: 'Covishield (ChAdOx1-S)',
          dose1Date: '2021-06-15',
          dose2Date: '2021-09-12',
          precautionDoseDate: '2022-07-20',
          beneficiaryId: '984128919241',
        },
      },
    ];

    // Resolve valid patient ID
    let targetPatientId = userId;
    const pCheck = await query(
      `SELECT id FROM public.patients WHERE user_id = $1 OR id = $1 LIMIT 1`,
      [userId]
    );
    if (pCheck.rows.length > 0) {
      targetPatientId = pCheck.rows[0].id;
    }

    const imported: any[] = [];

    for (const doc of sampleDocs) {
      if (docTypes.length === 0 || docTypes.includes(doc.type)) {
        // 1. Record in digilocker_imported_docs
        await query(
          `INSERT INTO public.digilocker_imported_docs 
            (user_id, doc_type, doc_name, issuer, uri, doc_data_json)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, doc.type, doc.name, doc.issuer, doc.uri, JSON.stringify(doc.data)]
        );

        // 2. Also record in public.documents using the real database schema
        const checksum = crypto.createHash('sha256').update(`${doc.uri}_${Date.now()}`).digest('hex');
        await query(
          `INSERT INTO public.documents 
            (patient_id, uploader_id, document_name, document_category, file_extension, mime_type, 
             file_size_bytes, storage_path, checksum_sha256, hospital_name, doctor_name, visit_date, metadata_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE, $12)`,
          [
            targetPatientId,
            userId,
            doc.name,
            doc.category,
            'pdf',
            'application/pdf',
            245192,
            `digilocker/${doc.type.toLowerCase()}.pdf`,
            checksum,
            doc.issuer,
            'Government of India (DigiLocker Verified)',
            JSON.stringify({
              is_digilocker_verified: true,
              issuer: doc.issuer,
              uri: doc.uri,
              data: doc.data,
            }),
          ]
        );

        imported.push(doc);
      }
    }

    // Set digilocker_linked = true on patient
    await query(
      `UPDATE public.patients SET digilocker_linked = TRUE, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    return {
      importedCount: imported.length,
      documents: imported,
    };
  }
}
