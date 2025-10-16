import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper to catch promise rejections
 * Wraps async route handlers to forward errors to Express error handler
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
