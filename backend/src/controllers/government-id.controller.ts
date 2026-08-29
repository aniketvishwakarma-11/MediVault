import { Request, Response } from 'express';
import { GovernmentIdService } from '../services/government-id.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class GovernmentIdController {
  /**
   * POST /api/government/abha/generate-otp
   */
  static async generateOtp(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized. Please log in.');
      }

      const { idType, idNumber } = req.body || {};
      if (!idType || !idNumber) {
        return sendError(res, 400, 'Both idType (AADHAAR_OTP or MOBILE_OTP) and idNumber are required.');
      }

      const result = await GovernmentIdService.generateAbhaOtp(user.id, idType, idNumber);
      return sendSuccess(res, 200, result, 'Verification OTP sent successfully.');
    } catch (err: any) {
      logger.error('[GovernmentIdController] generateOtp error:', err);
      return sendError(res, 400, err.message || 'Failed to generate ABHA OTP.');
    }
  }

  /**
   * POST /api/government/abha/verify-otp
   */
  static async verifyOtp(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized. Please log in.');
      }

      const { transactionId, otp } = req.body || {};
      if (!transactionId || !otp) {
        return sendError(res, 400, 'transactionId and 6-digit otp are required.');
      }

      const result = await GovernmentIdService.verifyAbhaOtp(user.id, transactionId, otp);
      return sendSuccess(res, 200, result, 'Government ABHA ID verified and activated successfully!');
    } catch (err: any) {
      logger.error('[GovernmentIdController] verifyOtp error:', err);
      return sendError(res, 400, err.message || 'Failed to verify ABHA OTP.');
    }
  }

  /**
   * POST /api/government/abha/link-existing
   */
  static async linkExisting(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized. Please log in.');
      }

      const { abhaInput } = req.body || {};
      if (!abhaInput) {
        return sendError(res, 400, 'ABHA Number or ABHA Address is required.');
      }

      const result = await GovernmentIdService.linkExistingAbha(user.id, abhaInput);
      return sendSuccess(res, 200, result, 'Existing ABHA ID linked successfully.');
    } catch (err: any) {
      logger.error('[GovernmentIdController] linkExisting error:', err);
      return sendError(res, 400, err.message || 'Failed to link existing ABHA.');
    }
  }

  /**
   * GET /api/government/abha/profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized.');
      }

      const profile = await GovernmentIdService.getAbhaProfile(user.id);
      return sendSuccess(res, 200, profile, 'ABHA profile retrieved successfully.');
    } catch (err: any) {
      logger.error('[GovernmentIdController] getProfile error:', err);
      return sendError(res, 500, err.message || 'Failed to retrieve ABHA profile.');
    }
  }

  /**
   * POST /api/government/abha/unlink
   */
  static async unlink(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized.');
      }

      const result = await GovernmentIdService.unlinkAbha(user.id);
      return sendSuccess(res, 200, result, 'ABHA ID unlinked.');
    } catch (err: any) {
      logger.error('[GovernmentIdController] unlink error:', err);
      return sendError(res, 500, err.message || 'Failed to unlink ABHA.');
    }
  }

  /**
   * POST /api/government/digilocker/import
   */
  static async importDigiLocker(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return sendError(res, 401, 'Unauthorized.');
      }

      const { docTypes, aadhaarOrMobile, pin } = req.body || {};
      const result = await GovernmentIdService.importDigiLockerDocs(
        user.id, 
        Array.isArray(docTypes) ? docTypes : [],
        aadhaarOrMobile,
        pin
      );
      return sendSuccess(res, 200, result, 'Official health documents imported from DigiLocker.');
    } catch (err: any) {
      logger.error('[GovernmentIdController] importDigiLocker error:', err);
      return sendError(res, 500, err.message || 'Failed to import documents from DigiLocker.');
    }
  }
}
