import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  createSettingSchema,
  updateSettingSchema,
  settingKeySchema,
  bulkUpdateSettingsSchema,
} from './settings.validators';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// READ OPERATIONS - All authenticated users can read settings
// GET /api/settings - List all settings
router.get('/', asyncHandler(settingsController.listSettings.bind(settingsController)));

// GET /api/settings/count - Get settings count
router.get('/count', asyncHandler(settingsController.getSettingsCount.bind(settingsController)));

// GET /api/settings/:key - Get setting by key
router.get(
  '/:key',
  validate(settingKeySchema, 'params'),
  asyncHandler(settingsController.getSettingByKey.bind(settingsController))
);

// WRITE OPERATIONS - Admin only
// POST /api/settings/bulk - Bulk update settings
router.post(
  '/bulk',
  authorize(UserRole.ADMIN),
  validate(bulkUpdateSettingsSchema),
  asyncHandler(settingsController.bulkUpdateSettings.bind(settingsController))
);

// POST /api/settings - Create setting
router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(createSettingSchema),
  asyncHandler(settingsController.createSetting.bind(settingsController))
);

// PUT /api/settings/:key - Upsert setting (create or update)
router.put(
  '/:key',
  authorize(UserRole.ADMIN),
  validate(settingKeySchema, 'params'),
  validate(updateSettingSchema),
  asyncHandler(settingsController.upsertSetting.bind(settingsController))
);

// PATCH /api/settings/:key - Update setting
router.patch(
  '/:key',
  authorize(UserRole.ADMIN),
  validate(settingKeySchema, 'params'),
  validate(updateSettingSchema),
  asyncHandler(settingsController.updateSetting.bind(settingsController))
);

// DELETE /api/settings/:key - Delete setting
router.delete(
  '/:key',
  authorize(UserRole.ADMIN),
  validate(settingKeySchema, 'params'),
  asyncHandler(settingsController.deleteSetting.bind(settingsController))
);

export default router;
