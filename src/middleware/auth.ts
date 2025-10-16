import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserRole } from '@prisma/client';

// Extended Express Request with user
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
  };
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

// Extract token from Authorization header
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

// Authenticate middleware - Verify JWT token
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

// Authorize middleware - Check user role
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('User not authenticated'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AuthorizationError('Insufficient permissions'));
      return;
    }

    next();
  };
}

// Optional authentication - Don't fail if no token
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
}
