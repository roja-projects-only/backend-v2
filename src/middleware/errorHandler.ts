import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logError } from '../config/logger';

// Global error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle known application errors
  if (isAppError(err)) {
    // Log at appropriate level based on status code
    // 4xx errors are client errors (expected), 5xx are server errors (unexpected)
    if (err.statusCode >= 500) {
      logError('Server error occurred', {
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack,
      });
    }
    // Don't log 404 and validation errors at error level - they're expected
    
    sendError(res, err.statusCode, err.code || 'ERROR', err.message, err.details);
    return;
  }

  // Handle Zod validation errors (client errors - don't log as errors)
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid input data', details);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // Unique constraint violation (client error - expected)
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'field';
      sendError(res, 409, 'CONFLICT_ERROR', `${field} already exists`);
      return;
    }
    
    // Foreign key constraint violation (client error - expected)
    if (prismaError.code === 'P2003') {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid reference to related resource');
      return;
    }
    
    // Record not found (client error - expected)
    if (prismaError.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Resource not found');
      return;
    }
    
    // Other Prisma errors are server errors - log them
    logError('Database error occurred', {
      method: req.method,
      path: req.path,
      error: err.message,
      code: prismaError.code,
    });
  }

  // Handle JWT errors (client errors - expected)
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 401, 'AUTHENTICATION_ERROR', 'Invalid token');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 401, 'AUTHENTICATION_ERROR', 'Token expired');
    return;
  }

  // Unexpected error - log it
  logError('Unexpected error occurred', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Default to 500 server error
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  sendError(res, statusCode, 'INTERNAL_SERVER_ERROR', message);
}
