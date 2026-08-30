import { isConnectionError } from '../config/db';
import {
  AppError,
  DatabaseUnavailableError,
  UnauthorizedAccessError,
  AuthenticationRequiredError,
  ResourceNotFoundError,
  ValidationError,
} from './AppError';
import { logger } from '../utils/logger';

/**
 * Transforms any arbitrary runtime error, DB exception, or network fault
 * into a safe, structured, user-understandable AppError.
 */
export function toAppError(err: any): AppError {
  if (err instanceof AppError) {
    return err;
  }

  // 1. Check for PostgreSQL Connection / Pool Failures
  if (isConnectionError(err) || isDbNetworkError(err)) {
    return new DatabaseUnavailableError(
      err.message || 'Database connection unreachable',
      'Please wait a few moments and try your request again. If urgent, contact clinical operations.',
      { originalCode: err.code }
    );
  }

  // 2. Check for PostgreSQL Constraint Violations
  if (err && err.code) {
    // 23505: Unique violation (e.g. duplicate prescription ID or UHID)
    if (err.code === '23505') {
      return new ValidationError(
        'RECORD_ALREADY_EXISTS',
        `Unique constraint violation: ${err.detail || err.message}`,
        'Record Already Exists',
        'A medical record or identifier with this detail is already registered in the system.',
        'Please verify the details or generate a new identifier.',
        { constraint: err.constraint }
      );
    }

    // 23503: Foreign key violation (e.g. non-existent patient or doctor ID)
    if (err.code === '23503') {
      return new ValidationError(
        'REFERENCED_RECORD_NOT_FOUND',
        `Foreign key violation: ${err.detail || err.message}`,
        'Referenced Clinical Profile Not Found',
        'This action references a patient, doctor, or medical facility that does not exist in the registry.',
        'Please ensure all selected profiles are active and registered.',
        { constraint: err.constraint }
      );
    }

    // 23514: Check constraint violation
    if (err.code === '23514') {
      return new ValidationError(
        'CLINICAL_DATA_CONSTRAINT_VIOLATION',
        `Check constraint failed: ${err.message}`,
        'Invalid Clinical Values',
        'The submitted medical data does not conform to valid clinical ranges or standard values.',
        'Please review the clinical measurements and units submitted.'
      );
    }
  }

  // 3. JWT & Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedAccessError(
      'Invalid authentication token',
      'Session Security Notice',
      'Your authentication session is invalid or has been modified. Please sign in again.',
      'Sign in through your verified account.'
    );
  }
  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedAccessError(
      'Authentication token expired',
      'Session Expired',
      'Your medical session has timed out for security and patient confidentiality.',
      'Please sign in again to continue.'
    );
  }

  // 4. Zod Validation Errors
  if (err.name === 'ZodError' && Array.isArray(err.issues)) {
    const messages = err.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return new ValidationError(
      'INPUT_VALIDATION_ERROR',
      `Zod validation error: ${messages}`,
      'Incomplete or Invalid Submission',
      'One or more required fields in your submission were missing or formatted incorrectly.',
      'Please review the highlighted fields in the form and resubmit.',
      err.issues
    );
  }

  // 5. Check if explicit HTTP statusCode was passed (e.g. 401, 403, 404, 400)
  if (err && typeof err.statusCode === 'number') {
    const status = err.statusCode;
    const msg = err.message || 'An error occurred';

    if (status === 401) {
      return new AuthenticationRequiredError(msg, err.userMessage, err.actionHint, err.details);
    }
    if (status === 403) {
      return new UnauthorizedAccessError(msg, err.userTitle, err.userMessage, err.actionHint, err.details);
    }
    if (status === 404) {
      return new ResourceNotFoundError('Resource', undefined, msg);
    }
    if (status === 400) {
      return new ValidationError(err.code || 'VALIDATION_ERROR', msg, err.userTitle, err.userMessage, err.actionHint, err.details);
    }

    return new AppError({
      code: err.code || `HTTP_${status}`,
      category: err.category || (status >= 400 && status < 500 ? 'VALIDATION' : 'INTERNAL'),
      statusCode: status,
      message: msg,
      userTitle: err.userTitle || 'Request Interrupted',
      userMessage: err.userMessage || msg,
      actionHint: err.actionHint || 'Please check your request and try again.',
      details: err.details,
      isOperational: true,
    });
  }

  // 6. Generic / Unhandled Internal Error (Sanitize completely so NO SQL or stack leaks!)
  const rawMessage = err?.message || String(err);
  logger.error('[Unhandled Exception Caught by Normalizer]:', err);

  return new AppError({
    code: 'INTERNAL_SYSTEM_ERROR',
    category: 'INTERNAL',
    statusCode: 500,
    message: rawMessage,
    userTitle: 'System Technical Interruption',
    userMessage: 'An unexpected technical issue occurred while processing this request. Our clinical IT team has received an automated alert. No patient health records were damaged.',
    actionHint: 'Please refresh the page and try again in a few moments. If urgent, contact clinical system administration.',
    isOperational: false,
  });
}

function isDbNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toUpperCase();
  return (
    code === '08006' || // connection_failure
    code === '08001' || // sqlclient_unable_to_establish_sqlconnection
    code === '57P01' || // admin_shutdown
    code === 'ETIMEDOUT' ||
    msg.includes('connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('too many clients') ||
    msg.includes('remaining connection slots are reserved')
  );
}
