import { Router } from 'express';
import { salesController } from './sales.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { asyncHandler } from '../../middleware/asyncHandler';
import { 
  createSaleSchema, 
  updateSaleSchema, 
  saleIdSchema, 
  customerIdParamSchema,
  dateParamSchema, 
  dateRangeSchema, 
  saleFiltersSchema,
  creditValidationSchema
} from './sales.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List sales with filters (GET /api/sales)
router.get(
  '/',
  validate(saleFiltersSchema, 'query'),
  asyncHandler(salesController.listSales.bind(salesController))
);

// Get today's sales (GET /api/sales/today)
router.get(
  '/today',
  asyncHandler(salesController.getTodaySales.bind(salesController))
);

// Get sales by specific date (GET /api/sales/date/:date)
router.get(
  '/date/:date',
  validate(dateParamSchema, 'params'),
  asyncHandler(salesController.getSalesByDate.bind(salesController))
);

// Get daily sales trend (GET /api/sales/analytics/daily-trend?startDate=...&endDate=...)
router.get(
  '/analytics/daily-trend',
  validate(dateRangeSchema, 'query'),
  asyncHandler(salesController.getDailySalesTrend.bind(salesController))
);

// Get location performance (GET /api/sales/analytics/location-performance?startDate=...&endDate=...)
router.get(
  '/analytics/location-performance',
  validate(dateRangeSchema, 'query'),
  asyncHandler(salesController.getLocationPerformance.bind(salesController))
);

// Get sales summary/KPIs (GET /api/sales/analytics/summary?startDate=...&endDate=...)
router.get(
  '/analytics/summary',
  validate(dateRangeSchema, 'query'),
  asyncHandler(salesController.getSalesSummary.bind(salesController))
);

// Get customer purchase history (GET /api/sales/customer/:customerId/history)
router.get(
  '/customer/:customerId/history',
  validate(customerIdParamSchema, 'params'),
  asyncHandler(salesController.getCustomerHistory.bind(salesController))
);

// Validate credit limit for customer (POST /api/sales/customer/:customerId/validate-credit)
router.post(
  '/customer/:customerId/validate-credit',
  validate(customerIdParamSchema, 'params'),
  validate(creditValidationSchema),
  asyncHandler(salesController.validateCreditLimit.bind(salesController))
);

// Get sale by ID (GET /api/sales/:id)
router.get(
  '/:id',
  validate(saleIdSchema, 'params'),
  asyncHandler(salesController.getSaleById.bind(salesController))
);

// Create sale (POST /api/sales)
router.post(
  '/',
  validate(createSaleSchema),
  asyncHandler(salesController.createSale.bind(salesController))
);

// Update sale (PATCH /api/sales/:id)
router.patch(
  '/:id',
  validate(saleIdSchema, 'params'),
  validate(updateSaleSchema),
  asyncHandler(salesController.updateSale.bind(salesController))
);

// Delete sale (DELETE /api/sales/:id)
router.delete(
  '/:id',
  validate(saleIdSchema, 'params'),
  asyncHandler(salesController.deleteSale.bind(salesController))
);

export default router;
