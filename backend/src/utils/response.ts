import { Response } from 'express';

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
  statusCode = 400,
  message = 'An error occurred',
  errors?: any
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(responsePayload);
};
