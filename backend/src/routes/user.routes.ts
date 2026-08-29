import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';
import { AccountErasureService } from '../services/account-erasure.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

const getClientIp = (req: Request): string => {
  const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return Array.isArray(rawIp) ? rawIp[0] || '127.0.0.1' : String(rawIp);
};

const handleAccountErasure = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      sendError(res, 401, 'Unauthorized. Valid authentication session required.');
      return;
    }

    const { confirmation } = req.body || {};
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      sendError(
        res,
        400,
        'Explicit confirmation string "DELETE_MY_ACCOUNT" is required in request body to prevent accidental account erasure.'
      );
      return;
    }

    const clientIp = getClientIp(req);
    const result = await AccountErasureService.eraseUserAccount(user.id, clientIp);

    sendSuccess(
      res,
      200,
      result,
      'Your health vault, clinical records, and encryption keys have been permanently and irreversibly purged in compliance with Section 12 of the Digital Personal Data Protection Act (DPDPA 2023).'
    );
  } catch (err: any) {
    logger.error('[UserRoutes.deleteAccount] Error:', err);
    sendError(res, 500, err.message || 'Internal server error while executing account erasure.');
  }
};

/**
 * @route   DELETE /api/users/account
 * @desc    Permanent Account Erasure & Data Purge ("Right to be Forgotten" - DPDPA 2023 Sec 12 & GDPR Art 17)
 * @access  Authenticated
 */
router.delete('/account', apiRateLimiter, authenticateJWT, handleAccountErasure);

/**
 * @route   DELETE /api/users/me (alias)
 */
router.delete('/me', apiRateLimiter, authenticateJWT, handleAccountErasure);

export default router;
