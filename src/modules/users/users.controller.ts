import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { CreateUserDTO, UpdateUserDTO, UserFilters, ChangeUserPasswordDTO } from './users.types';

export class UsersController {
  // List all users
  async listUsers(req: AuthRequest, res: Response) {
    const filters: UserFilters = {
      role: req.query.role as 'ADMIN' | 'STAFF' | undefined,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
    };

    const users = await usersService.listUsers(filters);
    sendSuccess(res, users, 'Users retrieved successfully');
  }

  // Get user by ID
  async getUserById(req: AuthRequest, res: Response) {
    const user = await usersService.getUserById(req.params.id);
    sendSuccess(res, user, 'User retrieved successfully');
  }

  // Create user
  async createUser(req: AuthRequest, res: Response) {
    const data: CreateUserDTO = req.body;
    const user = await usersService.createUser(data, req.user!.userId);
    sendSuccess(res, user, 'User created successfully', 201);
  }

  // Update user
  async updateUser(req: AuthRequest, res: Response) {
    const data: UpdateUserDTO = req.body;
    const user = await usersService.updateUser(
      req.params.id,
      data,
      req.user!.userId,
      req.get('user-agent'),
      req.ip
    );
    sendSuccess(res, user, 'User updated successfully');
  }

  // Delete user
  async deleteUser(req: AuthRequest, res: Response) {
    const result = await usersService.deleteUser(
      req.params.id,
      req.user!.userId,
      req.get('user-agent'),
      req.ip
    );
    sendSuccess(res, null, result.message);
  }

  // Change user password
  async changeUserPassword(req: AuthRequest, res: Response) {
    const data: ChangeUserPasswordDTO = req.body;
    const result = await usersService.changeUserPassword(
      req.params.id,
      data,
      req.user!.userId,
      req.get('user-agent'),
      req.ip
    );
    sendSuccess(res, null, result.message);
  }

  // Get user statistics
  async getUserStats(req: AuthRequest, res: Response) {
    const stats = await usersService.getUserStats();
    sendSuccess(res, stats, 'User statistics retrieved successfully');
  }
}

export const usersController = new UsersController();
