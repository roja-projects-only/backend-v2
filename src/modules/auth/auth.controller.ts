import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { LoginDTO, RegisterDTO, ChangePasswordDTO } from './auth.types';

export class AuthController {
  // POST /api/auth/login
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: LoginDTO = req.body;
      const result = await authService.login(data);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/refresh
  async refresh(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/logout
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { refreshToken } = req.body;
      await authService.logout(userId, refreshToken);
      sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await authService.getCurrentUser(userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/register (admin only)
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RegisterDTO = req.body;
      const createdByUserId = req.user!.userId;
      const result = await authService.register(data, createdByUserId);
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/change-password
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data: ChangePasswordDTO = req.body;
      await authService.changePassword(userId, data);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
