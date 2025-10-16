import { Response } from 'express';

// Success response interface
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Send success response
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
  };
  res.status(statusCode).json(response);
}

// Send success response with pagination
export function sendSuccessWithPagination<T>(
  res: Response,
  data: T,
  pagination: PaginationMeta,
  message?: string
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    pagination,
    message,
  };
  res.status(200).json(response);
}

// Send error response
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  res.status(statusCode).json(response);
}

// Calculate pagination metadata
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
