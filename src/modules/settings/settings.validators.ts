import { z } from 'zod';

// Setting types enum
const settingTypeSchema = z.enum(['string', 'number', 'boolean', 'json']);

// Create setting schema
export const createSettingSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, 'Key must contain only alphanumeric characters, dots, hyphens, and underscores'),
  value: z.string().min(0).max(10000),
  type: settingTypeSchema,
});

// Update setting schema
export const updateSettingSchema = z.object({
  value: z.string().min(0).max(10000),
  type: settingTypeSchema.optional(),
});

// Setting key schema
export const settingKeySchema = z.object({
  key: z.string().min(1),
});

// Bulk update schema
export const bulkUpdateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string().min(0).max(10000),
      type: settingTypeSchema.optional(),
    })
  ).min(1).max(50), // Maximum 50 settings in one bulk update
});
