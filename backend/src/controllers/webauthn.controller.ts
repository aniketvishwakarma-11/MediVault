import { Request, Response } from 'express';
import { WebAuthnService } from '../services/webauthn.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_medivault_chain_ai_2026';

export class WebAuthnController {
  /**
   * POST /api/auth/webauthn/demo-token (Public)
   * Generates a signed JWT session for demo users to test passkeys and APIs seamlessly
   */
  static async getDemoToken(req: Request, res: Response) {
    try {
      const { role } = req.body || {};
      const demoRole = role === 'doctor' ? 'doctor' : 'patient';
      const demoUserId = demoRole === 'doctor'
        ? '00000000-0000-0000-0000-000000000002'
        : '00000000-0000-0000-0000-000000000001';
      const demoEmail = demoRole === 'doctor' ? 'doctor@hospital.org' : 'patient@medivault.local';
      const demoName = demoRole === 'doctor' ? 'Dr. Sarah Jenkins (Demo)' : 'Demo Patient (Alex Morgan)';

      const token = jwt.sign(
        {
          id: demoUserId,
          sub: demoUserId,
          email: demoEmail,
          role: demoRole,
          full_name: demoName,
          is_demo: true,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return sendSuccess(res, 200, {
        token,
        user: { id: demoUserId, email: demoEmail, full_name: demoName, role: demoRole },
      }, 'Demo session token issued successfully.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] getDemoToken error:', err);
      return sendError(res, 500, err.message || 'Failed to issue demo session token.');
    }
  }

  /**
   * POST /api/auth/webauthn/register-options (Protected)
   */
  static async getRegisterOptions(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized. Please sign in to enroll biometric passkey.');
      }

      const options = await WebAuthnService.getRegistrationOptions(
        user.id,
        user.email || 'user@medivault.local',
        (user as any).full_name || undefined,
        req.hostname
      );

      return sendSuccess(res, 200, options, 'WebAuthn registration options generated successfully.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] getRegisterOptions error:', err);
      return sendError(res, 500, err.message || 'Failed to generate registration options.');
    }
  }

  /**
   * POST /api/auth/webauthn/register-verify (Protected)
   */
  static async verifyRegister(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized. Please sign in to enroll biometric passkey.');
      }

      const { response, deviceName } = req.body;
      if (!response) {
        return sendError(res, 400, 'Registration response payload is required.');
      }

      const origin = req.get('origin');
      const result = await WebAuthnService.verifyRegistration(
        user.id,
        response,
        deviceName,
        origin,
        req.hostname,
        user.email,
        (user as any).role
      );

      return sendSuccess(res, 200, result, 'Biometric passkey registered successfully.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] verifyRegister error:', err);
      return sendError(res, 400, err.message || 'Failed to verify biometric registration.');
    }
  }

  /**
   * POST /api/auth/webauthn/login-options (Public)
   */
  static async getLoginOptions(req: Request, res: Response) {
    try {
      const { email } = req.body || {};
      const options = await WebAuthnService.getAuthenticationOptions(email, req.hostname);

      return sendSuccess(res, 200, options, 'WebAuthn authentication options generated successfully.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] getLoginOptions error:', err);
      return sendError(res, 500, err.message || 'Failed to generate login options.');
    }
  }

  /**
   * POST /api/auth/webauthn/login-verify (Public)
   */
  static async verifyLogin(req: Request, res: Response) {
    try {
      const { response } = req.body;
      if (!response) {
        return sendError(res, 400, 'Authentication response payload is required.');
      }

      const origin = req.get('origin');
      const result = await WebAuthnService.verifyAuthentication(
        response,
        origin,
        req.hostname
      );

      return sendSuccess(res, 200, result, 'Biometric authentication successful.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] verifyLogin error:', err);
      return sendError(res, 400, err.message || 'Failed to verify biometric authentication.');
    }
  }

  /**
   * GET /api/auth/webauthn/passkeys (Protected)
   */
  static async listPasskeys(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized.');
      }

      const passkeys = await WebAuthnService.listUserPasskeys(user.id);
      return sendSuccess(res, 200, passkeys, 'User passkeys retrieved successfully.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] listPasskeys error:', err);
      return sendError(res, 500, err.message || 'Failed to retrieve passkeys.');
    }
  }

  /**
   * DELETE /api/auth/webauthn/passkeys/:id (Protected)
   */
  static async deletePasskey(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized.');
      }

      const rawId = req.params.id;
      const passkeyId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!passkeyId) {
        return sendError(res, 400, 'Passkey ID is required.');
      }

      const deleted = await WebAuthnService.deletePasskey(user.id, passkeyId);
      if (!deleted) {
        return sendError(res, 404, 'Passkey not found or already deleted.');
      }

      return sendSuccess(res, 200, { id: passkeyId }, 'Passkey revoked successfully.');
    } catch (err: any) {
      logger.error('[WebAuthn Controller] deletePasskey error:', err);
      return sendError(res, 500, err.message || 'Failed to delete passkey.');
    }
  }
}
