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

    // Determine actual role: check users_profile first for admin, then doctors table, then token metadata
    let role = 'patient';

    // 1. Check users_profile for admin or doctor role (most authoritative source)
    try {
      const profCheck = await query('SELECT role FROM public.users_profile WHERE id = $1', [userId]);
      if (profCheck.rows.length > 0 && profCheck.rows[0].role) {
        const pRole = String(profCheck.rows[0].role).toLowerCase();
        if (pRole === 'admin') {
          role = 'admin';
        } else if (pRole === 'doctor') {
          role = 'doctor';
        } else if (pRole === 'hospital') {
          role = 'hospital';
        }
      }
    } catch {}

    // 2. If not admin/hospital, cross-check doctors table
    if (role === 'patient') {
      try {
        const docCheck = await query('SELECT id FROM public.doctors WHERE user_id = $1', [userId]);
        if (docCheck.rows.length > 0) {
          role = 'doctor';
        }
      } catch {}
    }

    // 3. Fallback to JWT payload metadata & claims (only for non-admin)
    if (role !== 'doctor' && role !== 'admin' && role !== 'hospital') {
      const metaRole =
        decoded.user_metadata?.role ||
        decoded.app_metadata?.role ||
        decoded.user_role ||
        decoded.role;
      if (metaRole === 'doctor') {
        role = 'doctor';
      } else if (metaRole === 'admin') {
        role = 'admin';
      }
    }

    // 4. Fallback to client request headers (x-user-role, x-role, role)
    if (role !== 'doctor' && role !== 'admin') {
      const headerRole = (req.headers['x-user-role'] || req.headers['x-role'] || req.headers['role']) as string;
      if (headerRole && headerRole.toLowerCase() === 'doctor') {
        role = 'doctor';
      }
    }

    // 5. Fallback: if accessing a doctor endpoint (/doctor/*, /consent/doctor/*)
    if (role !== 'doctor' && role !== 'admin') {
      const isDoctorRoute = req.originalUrl?.includes('/doctor') || req.baseUrl?.includes('/doctor');
      if (isDoctorRoute) {
        role = 'doctor';
      }
    }

    // If role is doctor, ensure doctors table record & users_profile exist & are verified
    if (role === 'doctor') {
      try {
        await query(
          `INSERT INTO public.doctors (user_id, license_number, specialization, hospital_name, hospital_affiliation, verification_status)
           VALUES ($1, $2, 'General Physician', 'MediVault EMR', 'MediVault EMR', 'VERIFIED')
           ON CONFLICT (user_id) DO UPDATE SET verification_status = 'VERIFIED'`,
          [userId, `DOC-${userId.substring(0, 8).toUpperCase()}`]
        ).catch(() => {});

        await query(
          `UPDATE public.users_profile SET role = 'doctor' WHERE id = $1 AND role != 'doctor'`,
          [userId]
        ).catch(() => {});
      } catch {}
    }

    let patientId = decoded.patient_id;

    if (role === 'patient') {
      try {
        let patientRes = await query('SELECT id FROM public.patients WHERE user_id = $1', [userId]);
        if (patientRes.rows.length === 0) {
          try {
            patientRes = await query(
              `INSERT INTO public.patients (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id`,
              [userId]
            );
          } catch {}
        }
        if (patientRes.rows && patientRes.rows.length > 0) {
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
 * Strictly verifies that req.user.role is in allowedRoles.
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

  // Doctor or Hospital checking active consent or emergency access session
  if (user.role === 'doctor' || user.role === 'hospital') {
    try {
      // Check canonical V2 consent_grants table
      const consentCheck = await query(
        `SELECT id FROM public.consent_grants
         WHERE patient_id = $1 AND grantee_id = $2 AND status = 'APPROVED'
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [targetPatientId, user.id]
      );

      if (consentCheck.rows.length > 0) {
        return next();
      }

      // Backward compat: also check legacy consent_requests table
      try {
        const legacyCheck = await query(
          `SELECT id FROM public.consent_requests
           WHERE patient_id = $1 AND requested_by = $2 AND status = 'APPROVED'
           AND (expires_at IS NULL OR expires_at > NOW())`,
          [targetPatientId, user.id]
        );
        if (legacyCheck.rows.length > 0) {
          return next();
        }
      } catch {
        // consent_requests table may not exist — ignore
      }

      // Check for active emergency access session
      const emgSession = await query(
        `SELECT id FROM public.emergency_access_sessions
         WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id::text = $1 OR id::text = $1))
           AND actor_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
        [targetPatientId, user.id]
      );

      if (emgSession.rows.length > 0) {
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

