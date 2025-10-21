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
  updatePaymentSchema,
  customerPaymentSchema,
  paginationSchema,
  dailyReportSchema,
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

// Get payment by ID (GET /api/payments/:id)
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

// Get customer payment history (GET /api/customers/:id/payments)
router.get(
  '/customers/:id/payments',
  validate(customerIdParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  asyncHandler(paymentsController.getCustomerPaymentHistory.bind(paymentsController))
);

// Record payment for specific customer (POST /api/customers/:id/payments)
router.post(
  '/customers/:id/payments',
  validate(customerIdParamSchema, 'params'),
  validate(customerPaymentSchema),
  asyncHandler(paymentsController.recordCustomerPayment.bind(paymentsController))
);

// Get customer outstanding balance (GET /api/customers/:id/outstanding)
router.get(
  '/customers/:id/outstanding',
  validate(customerIdParamSchema, 'params'),
  asyncHandler(paymentsController.getCustomerOutstandingBalance.bind(paymentsController))
);

// Get all customers with outstanding balances (GET /api/payments/outstanding)
router.get(
  '/outstanding',
  asyncHandler(paymentsController.getCustomersWithOutstandingBalances.bind(paymentsController))
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

export default router;