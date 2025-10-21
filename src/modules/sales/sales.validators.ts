import { z } from 'zod';

// Create sale validation schema
export const createSaleSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  quantity: z.number()
    .positive('Quantity must be positive')
    .min(0.1, 'Quantity must be at least 0.1'),
  unitPrice: z.number()
    .positive('Unit price must be positive')
    .min(0.01, 'Unit price must be at least 0.01'),
  date: z.string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid date format'),
  notes: z.string()
    .max(500, 'Notes must be at most 500 characters')
    .optional(),
  paymentType: z.enum(['CASH', 'CREDIT'])
    .default('CASH')
    .optional(),
  adminOverride: z.boolean()
    .default(false)
    .optional(),
});

// Update sale validation schema
export const updateSaleSchema = z.object({
  quantity: z.number()
    .positive('Quantity must be positive')
    .min(0.1, 'Quantity must be at least 0.1')
    .optional(),
  unitPrice: z.number()
    .positive('Unit price must be positive')
    .min(0.01, 'Unit price must be at least 0.01')
    .optional(),
  date: z.string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid date format')
    .optional(),
  notes: z.string()
    .max(500, 'Notes must be at most 500 characters')
    .nullable()
    .optional(),
  paymentType: z.enum(['CASH', 'CREDIT'])
    .optional(),
});

// Sale filters validation schema
export const saleFiltersSchema = z.object({
  customerId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  page: z.string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z.string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().positive().max(100))
    .optional(),
});

// Sale ID param validation
export const saleIdSchema = z.object({
  id: z.string().cuid(),
});

// Customer ID param validation
export const customerIdParamSchema = z.object({
  customerId: z.string().cuid(),
});

// Date param validation
export const dateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

// Date range query validation
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
});

// Credit validation schema
export const creditValidationSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(0.01, 'Amount must be at least 0.01'),
});
