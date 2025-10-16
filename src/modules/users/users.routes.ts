import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateMultiple } from '../../middleware/validator';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  userFiltersSchema,
  changeUserPasswordSchema,
} from './users.validators';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// GET /api/users/stats - Get user statistics
router.get('/stats', asyncHandler(usersController.getUserStats.bind(usersController)));

// GET /api/users - List all users with filters
router.get(
  '/',
  validate(userFiltersSchema, 'query'),
  asyncHandler(usersController.listUsers.bind(usersController))
);

// GET /api/users/:id - Get user by ID
router.get(
  '/:id',
  validate(userIdSchema, 'params'),
  asyncHandler(usersController.getUserById.bind(usersController))
);

// POST /api/users - Create user
router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(usersController.createUser.bind(usersController))
);

// PATCH /api/users/:id - Update user
router.patch(
  '/:id',
  validateMultiple({
    params: userIdSchema,
    body: updateUserSchema,
  }),
  asyncHandler(usersController.updateUser.bind(usersController))
);

// DELETE /api/users/:id - Delete user
router.delete(
  '/:id',
  validate(userIdSchema, 'params'),
  asyncHandler(usersController.deleteUser.bind(usersController))
);

// POST /api/users/:id/change-password - Change user password
router.post(
  '/:id/change-password',
  validateMultiple({
    params: userIdSchema,
    body: changeUserPasswordSchema,
  }),
  asyncHandler(usersController.changeUserPassword.bind(usersController))
);

export default router;
