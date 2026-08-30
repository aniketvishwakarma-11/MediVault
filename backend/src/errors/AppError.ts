import crypto from 'crypto';

export type ErrorCategory =
  | 'CLINICAL_SAFETY'
  | 'DATABASE'
  | 'AI_SERVICE'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'EXTERNAL_SERVICE'
  | 'INTERNAL';

export interface AppErrorPayload {
  code: string;
  category: ErrorCategory;
  statusCode: number;
  message: string;
  userTitle: string;
  userMessage: string;
  actionHint: string;
  traceId?: string;
  details?: any;
}

/**
 * Base Application Error for MediVault Healthcare Platform.
 * Enforces dual messaging:
 * 1. Technical `message` for secure system logs.
 * 2. Empathic, safe, jargon-free `userTitle`, `userMessage`, and `actionHint` for patients & clinicians.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly userTitle: string;
  public readonly userMessage: string;
  public readonly actionHint: string;
  public readonly traceId: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(opts: {
    code: string;
    category: ErrorCategory;
    statusCode?: number;
    message: string;
    userTitle: string;
    userMessage: string;
    actionHint: string;
    traceId?: string;
    details?: any;
    isOperational?: boolean;
  }) {
    super(opts.message);
    this.name = this.constructor.name;
    this.code = opts.code;
    this.category = opts.category;
    this.statusCode = opts.statusCode || 500;
    this.userTitle = opts.userTitle;
    this.userMessage = opts.userMessage;
    this.actionHint = opts.actionHint;
    this.traceId = opts.traceId || `ERR-MED-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    this.details = opts.details;
    this.isOperational = opts.isOperational !== undefined ? opts.isOperational : true;

    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      code: this.code,
      category: this.category,
      statusCode: this.statusCode,
      userTitle: this.userTitle,
      userMessage: this.userMessage,
      actionHint: this.actionHint,
      traceId: this.traceId,
      timestamp: new Date().toISOString(),
      details: this.details,
    };
  }
}

/**
 * Triggered when a clinical safety invariant or medical regulatory rule is violated.
 */
export class ClinicalSafetyError extends AppError {
  constructor(
    code: string,
    message: string,
    userTitle: string,
    userMessage: string,
    actionHint: string,
    statusCode = 422,
    details?: any
  ) {
    super({
      code,
      category: 'CLINICAL_SAFETY',
      statusCode,
      message,
      userTitle,
      userMessage,
      actionHint,
      details,
    });
  }
}

/**
 * Triggered when PostgreSQL or Supabase is offline, unreachable, or timing out.
 */
export class DatabaseUnavailableError extends AppError {
  constructor(
    message = 'PostgreSQL database connection unavailable or query timed out',
    actionHint = 'Please wait a moment and retry your action. If this persists during an emergency, consult paper protocols.',
    details?: any
  ) {
    super({
      code: 'DATABASE_UNAVAILABLE',
      category: 'DATABASE',
      statusCode: 503,
      message,
      userTitle: 'Medical Database Temporarily Unreachable',
      userMessage: 'We could not securely record or retrieve your clinical records because our database connection is currently undergoing maintenance. No patient data was altered.',
      actionHint,
      details,
    });
  }
}

/**
 * Triggered when AI models (Gemini, TrOCR, Tesseract) fail, time out, or hit rate limits.
 */
export class AIProcessingError extends AppError {
  constructor(
    code = 'AI_INFERENCE_FAILED',
    message = 'Medical AI analysis model failed or timed out',
    userMessage = 'Our automated medical analysis engine is currently experiencing high traffic and could not safely extract clinical values. Your original document is safely preserved.',
    actionHint = 'You can view the original document anytime, or re-run analysis in a few minutes.',
    details?: any
  ) {
    super({
      code,
      category: 'AI_SERVICE',
      statusCode: 502,
      message,
      userTitle: 'AI Clinical Summary Temporarily Unavailable',
      userMessage,
      actionHint,
      details,
    });
  }
}

/**
 * Triggered when a medical entity, patient record, or prescription cannot be located.
 */
export class ResourceNotFoundError extends AppError {
  constructor(
    resourceName: string,
    identifier?: string,
    userMessage?: string,
    actionHint = 'Please verify the ID or QR code and try again.'
  ) {
    super({
      code: `${resourceName.toUpperCase()}_NOT_FOUND`,
      category: 'NOT_FOUND',
      statusCode: 404,
      message: `${resourceName} not found${identifier ? ` with identifier: ${identifier}` : ''}`,
      userTitle: `${resourceName} Not Found`,
      userMessage: userMessage || `The requested ${resourceName.toLowerCase()} could not be located in the MediVault system. It may have expired or been removed.`,
      actionHint,
    });
  }
}

/**
 * Triggered when authorization fails or an unverified actor attempts a restricted clinical action.
 */
export class UnauthorizedAccessError extends AppError {
  constructor(
    message = 'User lacks sufficient clinical privileges for this action',
    userTitle = 'Clinical Authorization Required',
    userMessage = 'You do not have the required medical permissions or verified credentials to view or modify this patient record.',
    actionHint = 'Please verify that you are logged into the correct professional account.',
    details?: any
  ) {
    super({
      code: 'UNAUTHORIZED_CLINICAL_ACCESS',
      category: 'AUTHORIZATION',
      statusCode: 403,
      message,
      userTitle,
      userMessage,
      actionHint,
      details,
    });
  }
}

/**
 * Triggered when client payloads fail schema or clinical validation.
 */
export class ValidationError extends AppError {
  constructor(
    code = 'VALIDATION_ERROR',
    message = 'Invalid clinical request payload',
    userTitle = 'Incomplete or Invalid Information',
    userMessage = 'The information submitted is missing required clinical fields or contains invalid formats.',
    actionHint = 'Please check the highlighted fields and resubmit.',
    details?: any
  ) {
    super({
      code,
      category: 'VALIDATION',
      statusCode: 400,
      message,
      userTitle,
      userMessage,
      actionHint,
      details,
    });
  }
}
