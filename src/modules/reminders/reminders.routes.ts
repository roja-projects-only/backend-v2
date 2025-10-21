import { Router } from 'express';
import { remindersController } from './reminders.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { asyncHandler } from '../../middleware/asyncHandler';
import { UserRole } from '@prisma/client';
import {
  reminderIdSchema,
  customerIdParamSchema,
  reminderFiltersSchema,
  createReminderNoteSchema,
  bulkReminderNotesSchema,
  paginationSchema,
  daysParamSchema,
} from './reminders.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List reminder notes with filters (GET /api/reminders/notes)
router.get(
  '/notes',
  validate(reminderFiltersSchema, 'query'),
  asyncHandler(remindersController.listReminderNotes.bind(remindersController))
);

// Add reminder note (POST /api/reminders/notes)
router.post(
  '/notes',
  validate(createReminderNoteSchema),
  asyncHandler(remindersController.addReminderNote.bind(remindersController))
);

// Get reminder note by ID (GET /api/reminders/notes/:id)
router.get(
  '/notes/:id',
  validate(reminderIdSchema, 'params'),
  asyncHandler(remindersController.getReminderNoteById.bind(remindersController))
);

// Delete reminder note (DELETE /api/reminders/notes/:id) - Admin only
router.delete(
  '/notes/:id',
  validate(reminderIdSchema, 'params'),
  authorize(UserRole.ADMIN),
  asyncHandler(remindersController.deleteReminderNote.bind(remindersController))
);

// Get customers needing reminders (GET /api/reminders/overdue)
router.get(
  '/overdue',
  validate(daysParamSchema, 'query'),
  asyncHandler(remindersController.getCustomersNeedingReminders.bind(remindersController))
);

// Get overdue customers (GET /api/reminders/overdue-customers)
router.get(
  '/overdue-customers',
  validate(daysParamSchema, 'query'),
  asyncHandler(remindersController.getOverdueCustomers.bind(remindersController))
);

// Get reminder statistics (GET /api/reminders/stats)
router.get(
  '/stats',
  asyncHandler(remindersController.getReminderStats.bind(remindersController))
);

// Bulk add reminder notes (POST /api/reminders/bulk)
router.post(
  '/bulk',
  validate(bulkReminderNotesSchema),
  asyncHandler(remindersController.bulkAddReminderNotes.bind(remindersController))
);

export default router;