import { z } from 'zod';

// Reminder note ID parameter validation
export const reminderIdSchema = z.object({
  id: z.string().cuid('Invalid reminder note ID format'),
});

// Customer ID parameter validation
export const customerIdParamSchema = z.object({
  id: z.string().cuid('Invalid customer ID format'),
});

// Reminder filters validation
export const reminderFiltersSchema = z.object({
  customerId: z.string().cuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
});

// Create reminder note validation
export const createReminderNoteSchema = z.object({
  note: z.string()
    .min(1, 'Reminder note cannot be empty')
    .max(500, 'Reminder note cannot exceed 500 characters')
    .transform(val => val.trim()),
  customerId: z.string().cuid('Invalid customer ID format'),
  reminderDate: z.string().datetime().optional(),
});

// Bulk reminder notes validation
export const bulkReminderNotesSchema = z.object({
  customerIds: z.array(z.string().cuid('Invalid customer ID format'))
    .min(1, 'At least one customer ID is required')
    .max(50, 'Cannot add reminder notes for more than 50 customers at once'),
  note: z.string()
    .min(1, 'Reminder note cannot be empty')
    .max(500, 'Reminder note cannot exceed 500 characters')
    .transform(val => val.trim()),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
});

// Days parameter validation
export const daysParamSchema = z.object({
  days: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(365)).optional(),
});