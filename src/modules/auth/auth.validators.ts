import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  passcode: z.string()
    .length(6, 'Passcode must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Passcode must be 6 digits'),
});

// Register validation schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  passcode: z.string()
    .length(6, 'Passcode must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Passcode must be 6 digits'),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
});

// Refresh token validation schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .length(6, 'New passcode must be exactly 6 digits')
    .regex(/^\d{6}$/, 'New passcode must be 6 digits'),
});
