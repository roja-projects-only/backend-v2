import { z } from 'zod';

export const chargeSchema = z.object({
  customerId: z.string().min(1),
  containers: z.number().positive(),
  transactionDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const paymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  transactionDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const adjustmentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().refine((v) => v !== 0, 'Amount cannot be zero'),
  reason: z.string().min(2),
  transactionDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const markPaidSchema = z.object({
  customerId: z.string().min(1),
  finalPayment: z.number().positive().optional(),
  transactionDate: z.coerce.date(),
});

export const historyFiltersSchema = z.object({
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  transactionType: z.enum(['CHARGE', 'PAYMENT', 'ADJUSTMENT']).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'ALL']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type ChargePayload = z.infer<typeof chargeSchema>;
export type PaymentPayload = z.infer<typeof paymentSchema>;
export type AdjustmentPayload = z.infer<typeof adjustmentSchema>;
export type MarkPaidPayload = z.infer<typeof markPaidSchema>;
export type HistoryFiltersPayload = z.infer<typeof historyFiltersSchema>;
