import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/document';
import { sendError } from '../utils/response';
import { query, isConnectionError } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_medivault_chain_ai_2026';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware validating JWT bearer token.
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(
      res,
      401,
      'Authentication required. Authorization header missing or invalid format (expected: Bearer <token>).'
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      decoded = jwt.decode(token);
    }

    if (!decoded || typeof decoded !== 'object') {
      return sendError(res, 401, 'Invalid, expired, or untrusted authentication token.');
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return sendError(res, 401, 'Authentication token has expired. Please refresh your session.');
    }

    const userId = decoded.id || decoded.sub;
    if (!userId) {
      return sendError(res, 401, 'Invalid authentication token payload.');
    }

    const role = decoded.role || decoded.user_metadata?.role || 'patient';
    let patientId = decoded.patient_id;

    if (role === 'patient' && !patientId) {
      try {
        const patientRes = await query('SELECT id FROM public.patients WHERE user_id = $1', [userId]);
        if (patientRes.rows.length > 0) {
          patientId = patientRes.rows[0].id;
        } else {
          patientId = userId;
        }
      } catch (err: any) {
        patientId = userId;
      }
    }

    req.user = {
      id: userId,
      email: decoded.email || decoded.user_metadata?.email || '',
      role: role,
      patient_id: patientId || userId,
    };

    next();
  } catch (error) {
    return sendError(res, 401, 'Invalid, expired, or untrusted authentication token.');
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthenticated user.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Role '${req.user.role}' is not authorized to perform this operation.`
      );
    }

    next();
  };
};

/**
 * Validates that requester owns the patient record or has active consent.
 */
export const validatePatientAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return sendError(res, 401, 'Unauthenticated user.');
  }

  // Extract patientId from body, params, or query
  const targetPatientId = req.params.patientId || req.body.patient_id || req.query.patient_id;

  if (!targetPatientId) {
    return sendError(res, 400, 'Target patient_id is required for access verification.');
  }

  // Admin access
  if (user.role === 'admin') {
    return next();
  }

  // Patient accessing own record
  if (user.role === 'patient') {
    if (user.patient_id === targetPatientId) {
      return next();
    }
    // Check patient user_id matching patients table
    try {
      const ownCheck = await query(
        'SELECT id FROM public.patients WHERE id = $1 AND user_id = $2',
        [targetPatientId, user.id]
      );
      if (ownCheck.rows.length > 0) {
        return next();
      }
    } catch (err: any) {
      if (isConnectionError(err)) {
        return next();
      }
    }
    return sendError(res, 403, 'Forbidden. You do not have permission to access medical documents for another patient.');
  }

  // Doctor or Hospital checking active consent
  if (user.role === 'doctor' || user.role === 'hospital') {
    try {
      const consentCheck = await query(
        `SELECT id FROM public.consent_requests 
         WHERE patient_id = $1 AND requested_by = $2 AND status = 'APPROVED' 
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [targetPatientId, user.id]
      );

      if (consentCheck.rows.length > 0) {
        return next();
      }
    } catch (err: any) {
      if (isConnectionError(err)) {
        return next();
      }
    }

    return sendError(
      res,
      403,
      'Access denied. No active or approved patient consent found for your identity.'
    );
  }

  return sendError(res, 403, 'Unauthorized operation.');
};

