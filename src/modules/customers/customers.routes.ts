import { Router } from 'express';
import { customersController } from './customers.controller';
import { remindersController } from '../reminders/reminders.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateMultiple } from '../../middleware/validator';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerFiltersSchema,
  customerIdSchema,
} from './customers.validators';
import { paginationSchema } from '../reminders/reminders.validators';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/customers/locations - Get all distinct locations
router.get('/locations', asyncHandler(customersController.getLocations.bind(customersController)));

// GET /api/customers - List customers with filters
router.get(
  '/',
  validate(customerFiltersSchema, 'query'),
  asyncHandler(customersController.getAll.bind(customersController))
);

// GET /api/customers/:id - Get single customer
router.get(
  '/:id',
  validate(customerIdSchema, 'params'),
  asyncHandler(customersController.getById.bind(customersController))
);

// POST /api/customers - Create customer
router.post(
  '/',
  validate(createCustomerSchema),
  asyncHandler(customersController.create.bind(customersController))
);

// PUT /api/customers/:id - Update customer
router.put(
  '/:id',
  validateMultiple({
    params: customerIdSchema,
    body: updateCustomerSchema,
  }),
  asyncHandler(customersController.update.bind(customersController))
);

// DELETE /api/customers/:id - Delete customer (admin only)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(customerIdSchema, 'params'),
  asyncHandler(customersController.delete.bind(customersController))
);

// POST /api/customers/:id/restore - Restore customer (admin only)
router.post(
  '/:id/restore',
  authorize(UserRole.ADMIN),
  validate(customerIdSchema, 'params'),
  asyncHandler(customersController.restore.bind(customersController))
);

// GET /api/customers/:id/stats - Get customer statistics
router.get(
  '/:id/stats',
  validate(customerIdSchema, 'params'),
  asyncHandler(customersController.getStats.bind(customersController))
);

// GET /api/customers/:id/reminders - Get customer reminder history
router.get(
  '/:id/reminders',
  validate(customerIdSchema, 'params'),
  validate(paginationSchema, 'query'),
  asyncHandler(remindersController.getCustomerReminderHistory.bind(remindersController))
);

// GET /api/customers/:id/last-reminder - Get last reminder date for customer
router.get(
  '/:id/last-reminder',
  validate(customerIdSchema, 'params'),
  asyncHandler(remindersController.getLastReminderDate.bind(remindersController))
);

export default router;
