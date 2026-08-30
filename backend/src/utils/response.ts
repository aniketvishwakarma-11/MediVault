import { Response } from 'express';
import { AppError } from '../errors/AppError';
import { toAppError } from '../errors/errorNormalizer';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    category: string;
    statusCode: number;
    userTitle: string;
    userMessage: string;
    actionHint: string;
    traceId: string;
    timestamp: string;
    details?: any;
  };
  errors?: any;
  timestamp: string;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode = 200,
  data?: T,
  message?: string,
  pagination?: ApiResponse['pagination']
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  statusCodeOrError?: number | AppError | any,
  message?: string,
  errors?: any
): Response => {
  let appError: AppError;

  if (statusCodeOrError instanceof AppError) {
    appError = statusCodeOrError;
  } else if (typeof statusCodeOrError === 'number') {
    // If statusCode passed, construct custom AppError
    appError = toAppError({
      message: message || 'An error occurred',
      statusCode: statusCodeOrError,
      errors,
    });
  } else if (statusCodeOrError && typeof statusCodeOrError === 'object') {
    appError = toAppError(statusCodeOrError);
  } else {
    appError = toAppError(new Error(message || 'An unexpected error occurred'));
  }

  const payload: ApiResponse = {
    success: false,
    message: appError.userMessage || appError.message,
    error: appError.toJSON(),
    errors: appError.details || errors,
    timestamp: new Date().toISOString(),
  };

  return res.status(appError.statusCode || 400).json(payload);
};
