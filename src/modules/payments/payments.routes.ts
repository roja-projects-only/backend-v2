import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { asyncHandler } from '../../middleware/asyncHandler';
import { UserRole } from '@prisma/client';
import {
  paymentIdSchema,
  customerIdParamSchema,
  paymentFiltersSchema,
  recordPaymentSchema,
  recordPaymentByIdSchema,
  updatePaymentSchema,
  customerPaymentSchema,
  paginationSchema,
  dailyReportSchema,
  transactionIdSchema,
  createPaymentTransactionSchema,
  updatePaymentTransactionSchema,
} from './payments.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List payments with filters (GET /api/payments)
router.get(
  '/',
  validate(paymentFiltersSchema, 'query'),
  asyncHandler(paymentsController.listPayments.bind(paymentsController))
);

// Record payment received (POST /api/payments)
router.post(
  '/',
  validate(recordPaymentSchema),
  asyncHandler(paymentsController.recordPayment.bind(paymentsController))
);

// Get all customers with outstanding balances (GET /api/payments/outstanding)
// IMPORTANT: This must come BEFORE /:id route to avoid matching "outstanding" as an ID
router.get(
  '/outstanding',
  asyncHandler(paymentsController.getCustomersWithOutstandingBalances.bind(paymentsController))
);

// Get payment summary/KPIs (GET /api/payments/summary)
router.get(
  '/summary',
  asyncHandler(paymentsController.getPaymentSummary.bind(paymentsController))
);

// Get aging report (GET /api/reports/aging)
router.get(
  '/reports/aging',
  asyncHandler(paymentsController.getAgingReport.bind(paymentsController))
);

// Get daily payments report (GET /api/reports/payments/daily)
router.get(
  '/reports/payments/daily',
  validate(dailyReportSchema, 'query'),
  asyncHandler(paymentsController.getDailyPaymentsReport.bind(paymentsController))
);

// Get customer payment history (GET /api/payments/customers/:id/payments)
router.get(
  '/customers/:id/payments',
  validate(customerIdParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  asyncHandler(paymentsController.getCustomerPaymentHistory.bind(paymentsController))
);

// Record payment for specific customer (POST /api/payments/customers/:id/payments)
router.post(
  '/customers/:id/payments',
  validate(customerIdParamSchema, 'params'),
  validate(customerPaymentSchema),
  asyncHandler(paymentsController.recordCustomerPayment.bind(paymentsController))
);

// Get customer outstanding balance (GET /api/payments/customers/:id/outstanding)
router.get(
  '/customers/:id/outstanding',
  validate(customerIdParamSchema, 'params'),
  asyncHandler(paymentsController.getCustomerOutstandingBalance.bind(paymentsController))
);

// Record payment for payment ID (POST /api/payments/:id/record)
// Convenience route for recording payment directly on payment ID
router.post(
  '/:id/record',
  validate(paymentIdSchema, 'params'),
  validate(recordPaymentByIdSchema),
  asyncHandler(paymentsController.recordPaymentById.bind(paymentsController))
);

// Create payment transaction (POST /api/payments/:id/transactions)
router.post(
  '/:id/transactions',
  validate(paymentIdSchema, 'params'),
  validate(createPaymentTransactionSchema),
  asyncHandler(paymentsController.createPaymentTransaction.bind(paymentsController))
);

// Get payment transactions (GET /api/payments/:id/transactions)
router.get(
  '/:id/transactions',
  validate(paymentIdSchema, 'params'),
  asyncHandler(paymentsController.getPaymentTransactions.bind(paymentsController))
);

// Update payment transaction notes (PUT /api/payments/transactions/:id)
router.put(
  '/transactions/:id',
  validate(transactionIdSchema, 'params'),
  validate(updatePaymentTransactionSchema),
  asyncHandler(paymentsController.updatePaymentTransaction.bind(paymentsController))
);

// Delete payment transaction (DELETE /api/payments/transactions/:id) - Admin only
router.delete(
  '/transactions/:id',
  validate(transactionIdSchema, 'params'),
  authorize(UserRole.ADMIN),
  asyncHandler(paymentsController.deletePaymentTransaction.bind(paymentsController))
);

// Get payment by ID (GET /api/payments/:id)
// IMPORTANT: This must come AFTER all specific routes to avoid conflicts
router.get(
  '/:id',
  validate(paymentIdSchema, 'params'),
  asyncHandler(paymentsController.getPaymentById.bind(paymentsController))
);

// Update payment (PUT /api/payments/:id)
router.put(
  '/:id',
  validate(paymentIdSchema, 'params'),
  validate(updatePaymentSchema),
  asyncHandler(paymentsController.updatePayment.bind(paymentsController))
);

// Delete payment (DELETE /api/payments/:id) - Admin only
router.delete(
  '/:id',
  validate(paymentIdSchema, 'params'),
  authorize(UserRole.ADMIN),
  asyncHandler(paymentsController.deletePayment.bind(paymentsController))
);

export default router;