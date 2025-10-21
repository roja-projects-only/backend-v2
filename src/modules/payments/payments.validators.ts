import { z } from 'zod';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

// Payment ID parameter validation
export const paymentIdSchema = z.object({
  id: z.string().cuid('Invalid payment ID format'),
});

// Customer ID parameter validation
export const customerIdParamSchema = z.object({
  id: z.string().cuid('Invalid customer ID format'),
});

// Payment filters validation
export const paymentFiltersSchema = z.object({
  customerId: z.string().cuid().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  overdue: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
});

// Record payment validation
export const recordPaymentSchema = z.object({
  paymentId: z.string().cuid('Invalid payment ID format'),
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

// Update payment validation
export const updatePaymentSchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional(),
  paidAt: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

// Customer payment recording validation
export const customerPaymentSchema = z.object({
  paymentId: z.string().cuid('Invalid payment ID format'),
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
});

// Daily report date validation
export const dailyReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});