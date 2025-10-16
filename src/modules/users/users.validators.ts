import { z } from 'zod';

// User role enum
const userRoleSchema = z.enum(['ADMIN', 'STAFF']);

// Create user schema
export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username must contain only letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(6, 'Password must be exactly 6 characters')
    .regex(/^\d{6}$/, 'Password must be a 6-digit number'),
  role: userRoleSchema,
});

// Update user schema
export const updateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username must contain only letters, numbers, underscores, and hyphens')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(6, 'Password must be exactly 6 characters')
    .regex(/^\d{6}$/, 'Password must be a 6-digit number')
    .optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
});

// User ID schema
export const userIdSchema = z.object({
  id: z.string().cuid(),
});

// User filters schema
export const userFiltersSchema = z.object({
  role: userRoleSchema.optional(),
  active: z.string().transform((val) => val === 'true').optional(),
});

// Change password schema
export const changeUserPasswordSchema = z.object({
  currentPassword: z.string().min(6).max(6).regex(/^\d{6}$/),
  newPassword: z.string().min(6).max(6).regex(/^\d{6}$/),
});
