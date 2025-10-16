import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema,
  changePasswordSchema 
} from './auth.validators';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh.bind(authController)));

// Protected routes
router.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser.bind(authController)));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword.bind(authController)));

// Admin only routes
router.post('/register', authenticate, authorize(UserRole.ADMIN), validate(registerSchema), asyncHandler(authController.register.bind(authController)));

export default router;
