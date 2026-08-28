import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import { query } from '../config/db';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_medivault_chain_ai_2026';

function getRpId(hostname?: string): string {
  if (process.env.RP_ID) return process.env.RP_ID;
  if (!hostname) return 'localhost';
  if (hostname.includes('vercel.app')) return 'medi-vault-seven-lyart.vercel.app';
  if (hostname.includes('onrender.com')) return 'medi-vault-seven-lyart.vercel.app';
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'localhost';
  return hostname;
}

function getExpectedOrigin(originHeader?: string): string {
  if (originHeader) return originHeader;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  return 'https://medi-vault-seven-lyart.vercel.app';
}

export class WebAuthnService {
  /**
   * Generate registration options for a logged-in user to enroll a new passkey
   */
  static async getRegistrationOptions(userId: string, userEmail: string, userName?: string, hostname?: string) {
    const rpID = getRpId(hostname);

    // Retrieve existing user credentials so we don't re-register the same device
    const existingPasskeys = await query(
      'SELECT credential_id, transports FROM public.user_passkeys WHERE user_id = $1',
      [userId]
    );

    const excludeCredentials = existingPasskeys.rows.map((row: any) => ({
      id: row.credential_id,
      transports: Array.isArray(row.transports) ? row.transports : [],
    }));

    const options = await generateRegistrationOptions({
      rpName: 'MediVault Healthcare Platform',
      rpID,
      userID: new TextEncoder().encode(userId),
      userName: userEmail,
      userDisplayName: userName || userEmail.split('@')[0],
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // prefers Face ID / Touch ID / Windows Hello
      },
    });

    // Save challenge with 5 min TTL
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await query(
      `INSERT INTO public.webauthn_challenges (challenge, user_id, email, challenge_type, expires_at)
       VALUES ($1, $2, $3, 'registration', $4)`,
      [options.challenge, userId, userEmail, expiresAt]
    );

    return options;
  }

  /**
   * Verify registration response from browser and save passkey to DB
   */
  static async verifyRegistration(
    userId: string,
    response: any,
    deviceName?: string,
    originHeader?: string,
    hostname?: string,
    userEmail?: string,
    userRole?: string
  ) {
    const rpID = getRpId(hostname);
    const expectedOrigin = getExpectedOrigin(originHeader);

    // Fetch the active challenge for this user
    const challengeRes = await query(
      `SELECT id, challenge FROM public.webauthn_challenges
       WHERE user_id = $1 AND challenge_type = 'registration' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (challengeRes.rows.length === 0) {
      throw new Error('WebAuthn registration challenge expired or not found. Please try again.');
    }

    const expectedChallenge = challengeRes.rows[0].challenge;

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: [expectedOrigin, 'http://localhost:3000', 'https://medi-vault-seven-lyart.vercel.app'],
        expectedRPID: [rpID, 'localhost', 'medi-vault-seven-lyart.vercel.app'],
        requireUserVerification: false,
      });
    } catch (err: any) {
      logger.error('[WebAuthn Registration Verification Failed]:', err);
      throw new Error(`Passkey verification failed: ${err.message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Could not verify biometric credential.');
    }

    const { credential, aaguid } = verification.registrationInfo;

    // Convert credential.publicKey (Uint8Array) to base64url string
    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64url');
    const credentialId = credential.id;
    const counter = credential.counter;
    const transports = (response as any).response?.transports || ['internal'];

    // Upsert into user_passkeys with user_email and user_role
    const finalDeviceName = deviceName || 'Biometric Device (Face ID / Fingerprint)';
    await query(
      `INSERT INTO public.user_passkeys (user_id, credential_id, public_key, counter, device_name, transports, aaguid, user_email, user_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (credential_id) DO UPDATE
       SET counter = EXCLUDED.counter,
           public_key = EXCLUDED.public_key,
           device_name = EXCLUDED.device_name,
           user_email = EXCLUDED.user_email,
           user_role = EXCLUDED.user_role,
           last_used_at = NOW()`,
      [userId, credentialId, publicKeyBase64, counter, finalDeviceName, JSON.stringify(transports), aaguid, userEmail || null, userRole || 'patient']
    );

    // Delete used challenge
    await query('DELETE FROM public.webauthn_challenges WHERE id = $1', [challengeRes.rows[0].id]);

    logger.info(`[WebAuthn] Passkey enrolled successfully for user ${userId} (${finalDeviceName})`);

    return {
      verified: true,
      credentialId,
      deviceName: finalDeviceName,
    };
  }

  /**
   * Generate authentication options for 1-tap passkey login
   */
  static async getAuthenticationOptions(email?: string, hostname?: string) {
    const rpID = getRpId(hostname);

    let allowCredentials: any[] | undefined = undefined;
    let targetUserId: string | null = null;

    if (email) {
      // Look up credentials for this email
      const userCheck = await query(
        `SELECT u.id::text, up.role FROM auth.users u
         LEFT JOIN public.users_profile up ON up.id = u.id
         WHERE LOWER(u.email) = LOWER($1) LIMIT 1`,
        [email]
      );

      if (userCheck.rows.length > 0) {
        targetUserId = userCheck.rows[0].id;
        const passkeys = await query(
          'SELECT credential_id, transports FROM public.user_passkeys WHERE user_id = $1',
          [targetUserId]
        );

        if (passkeys.rows.length > 0) {
          allowCredentials = passkeys.rows.map((row: any) => ({
            id: row.credential_id,
            transports: Array.isArray(row.transports) ? row.transports : [],
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge with 5 min TTL
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await query(
      `INSERT INTO public.webauthn_challenges (challenge, user_id, email, challenge_type, expires_at)
       VALUES ($1, $2, $3, 'authentication', $4)`,
      [options.challenge, targetUserId, email || null, expiresAt]
    );

    return options;
  }

  /**
   * Verify assertion response from browser and issue JWT session token
   */
  static async verifyAuthentication(
    response: any,
    originHeader?: string,
    hostname?: string
  ) {
    const rpID = getRpId(hostname);
    const expectedOrigin = getExpectedOrigin(originHeader);

    const credentialId = response.id;
    if (!credentialId) {
      throw new Error('Missing credential ID in biometric assertion response.');
    }

    // Look up credential from database with resilient LEFT JOIN
    const passkeyRes = await query(
      `SELECT p.*, 
              COALESCE(u.email, p.user_email, 'patient@medivault.local') AS email, 
              COALESCE(up.role, p.user_role, 'patient') AS role, 
              COALESCE(up.full_name, split_part(COALESCE(u.email, p.user_email, 'User'), '@', 1)) AS full_name
       FROM public.user_passkeys p
       LEFT JOIN auth.users u ON u.id::text = p.user_id
       LEFT JOIN public.users_profile up ON up.id::text = p.user_id
       WHERE p.credential_id = $1 LIMIT 1`,
      [credentialId]
    );

    if (passkeyRes.rows.length === 0) {
      throw new Error('No registered passkey found matching this biometric credential.');
    }

    const passkey = passkeyRes.rows[0];

    // Look up recent authentication challenge
    const challengeRes = await query(
      `SELECT id, challenge FROM public.webauthn_challenges
       WHERE challenge_type = 'authentication' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`
    );

    if (challengeRes.rows.length === 0) {
      throw new Error('Biometric challenge expired. Please retry sign-in.');
    }

    const expectedChallenge = challengeRes.rows[0].challenge;
    const publicKeyBytes = Buffer.from(passkey.public_key, 'base64url');

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: [expectedOrigin, 'http://localhost:3000', 'https://medi-vault-seven-lyart.vercel.app'],
        expectedRPID: [rpID, 'localhost', 'medi-vault-seven-lyart.vercel.app'],
        credential: {
          id: passkey.credential_id,
          publicKey: new Uint8Array(publicKeyBytes),
          counter: Number(passkey.counter),
          transports: Array.isArray(passkey.transports) ? passkey.transports : [],
        },
        requireUserVerification: false,
      });
    } catch (err: any) {
      logger.error('[WebAuthn Authentication Failed]:', err);
      throw new Error(`Biometric verification failed: ${err.message}`);
    }

    if (!verification.verified) {
      throw new Error('Biometric authentication could not be verified.');
    }

    // Update counter and last_used_at in DB
    await query(
      `UPDATE public.user_passkeys
       SET counter = $1, last_used_at = NOW()
       WHERE id = $2`,
      [verification.authenticationInfo.newCounter, passkey.id]
    );

    // Delete used challenge
    await query('DELETE FROM public.webauthn_challenges WHERE id = $1', [challengeRes.rows[0].id]);

    const userRole = (passkey.role || 'patient').toLowerCase();

    // Sign MediVault session JWT token
    const token = jwt.sign(
      {
        id: passkey.user_id,
        sub: passkey.user_id,
        email: passkey.email,
        role: userRole,
        full_name: passkey.full_name,
        auth_type: 'webauthn_passkey',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`[WebAuthn] User ${passkey.user_id} (${passkey.email}) logged in successfully with passkey "${passkey.device_name}"`);

    return {
      token,
      user: {
        id: passkey.user_id,
        email: passkey.email,
        full_name: passkey.full_name,
        role: userRole,
      },
      role: userRole,
    };
  }

  /**
   * List all enrolled passkeys for a user
   */
  static async listUserPasskeys(userId: string) {
    const res = await query(
      `SELECT id, credential_id, device_name, transports, created_at, last_used_at
       FROM public.user_passkeys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  /**
   * Revoke/delete a passkey
   */
  static async deletePasskey(userId: string, passkeyId: string) {
    const res = await query(
      `DELETE FROM public.user_passkeys WHERE id = $1 AND user_id = $2 RETURNING id, device_name`,
      [passkeyId, userId]
    );
    return res.rows.length > 0;
  }
}
