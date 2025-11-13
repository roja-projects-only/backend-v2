import { z } from 'zod';

// User role enum
const userRoleSchema = z.enum(['ADMIN', 'STAFF']);

// Helper for 6-digit numeric string
const sixDigit = z.string()
  .length(6, 'Passcode must be exactly 6 digits')
  .regex(/^\d{6}$/, 'Passcode must be 6 digits');

// Create user schema - accept either `password` or `passcode`, normalize to `password`
export const createUserSchema = z.preprocess((val) => {
  const obj = val as any;
  if (obj && obj.passcode && !obj.password) {
    return { ...obj, password: obj.passcode };
  }
  return val;
}, z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username must contain only letters, numbers, underscores, and hyphens'),
  password: sixDigit,
  role: userRoleSchema,
}));

// Update user schema - also accept passcode and normalize
export const updateUserSchema = z.preprocess((val) => {
  const obj = val as any;
  if (obj && obj.passcode && !obj.password) {
    return { ...obj, password: obj.passcode };
  }
  return val;
}, z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username must contain only letters, numbers, underscores, and hyphens')
    .optional(),
  password: sixDigit.optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
}));

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
