import { CreateUserDTO, UpdateUserDTO, UserFilters, UserStats, ChangeUserPasswordDTO } from './users.types';
import { usersRepository } from './users.repository';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';
import bcrypt from 'bcryptjs';

export class UsersService {
  // List all users
  async listUsers(filters: UserFilters = {}) {
    return usersRepository.findAll(filters);
  }

  // Get user by ID
  async getUserById(id: string) {
    const user = await usersRepository.findById(id);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  // Create user
  async createUser(data: CreateUserDTO, createdByUserId: string) {
    // Check if max users reached
    const isMaxReached = await usersRepository.isMaxUsersReached();
    if (isMaxReached) {
      const maxUsers = usersRepository.getMaxUsers();
      throw new AppError(400, `Maximum number of users (${maxUsers}) has been reached`);
    }

    // Check if username already exists
    const existingUser = await usersRepository.findByUsername(data.username);
    if (existingUser) {
      throw new AppError(409, 'Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await usersRepository.create({
      ...data,
      password: hashedPassword,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        changes: {
          username: data.username,
          role: data.role,
          active: true,
        } as any,
        userId: createdByUserId,
      },
    });

    logger.info(`User created: ${data.username} (${data.role}) by user ${createdByUserId}`);

    return user;
  }

  // Update user
  async updateUser(
    id: string,
    data: UpdateUserDTO,
    updatedByUserId: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    const existingUser = await usersRepository.findById(id);

    if (!existingUser) {
      throw new AppError(404, 'User not found');
    }

    // Prevent user from deactivating themselves
    if (id === updatedByUserId && data.active === false) {
      throw new AppError(400, 'You cannot deactivate your own account');
    }

    // Check username uniqueness if being changed
    if (data.username && data.username !== existingUser.username) {
      const userWithSameUsername = await usersRepository.findByUsername(data.username);
      if (userWithSameUsername) {
        throw new AppError(409, 'Username already exists');
      }
    }

    // Hash password if being changed
    let hashedPassword: string | undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Update user
    const user = await usersRepository.update(id, {
      ...data,
      password: hashedPassword,
    });

    // Audit log
    const changes: any = {};
    if (data.username) changes.username = { from: existingUser.username, to: data.username };
    if (data.role) changes.role = { from: existingUser.role, to: data.role };
    if (data.active !== undefined) changes.active = { from: existingUser.active, to: data.active };
    if (data.password) changes.password = 'changed';

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        changes: changes as any,
        userId: updatedByUserId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`User updated: ${existingUser.username} by user ${updatedByUserId}`);

    return user;
  }

  // Delete user
  async deleteUser(
    id: string,
    deletedByUserId: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    const user = await usersRepository.findById(id);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Prevent user from deleting themselves
    if (id === deletedByUserId) {
      throw new AppError(400, 'You cannot delete your own account');
    }

    // Check if user has associated data
    const [salesCount, customersCount, auditLogCount] = await Promise.all([
      prisma.sale.count({ where: { userId: id } }),
      prisma.customer.count({ where: { createdById: id } }),
      prisma.auditLog.count({ where: { userId: id } }),
    ]);

    if (salesCount > 0 || customersCount > 0 || auditLogCount > 0) {
      const details: string[] = [];
      if (salesCount > 0) details.push(`${salesCount} sales`);
      if (customersCount > 0) details.push(`${customersCount} customers`);
      if (auditLogCount > 0) details.push(`${auditLogCount} audit logs`);
      
      throw new AppError(
        400,
        `Cannot delete user with associated data (${details.join(', ')}). Consider deactivating instead.`
      );
    }

    // Delete user
    await usersRepository.delete(id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        changes: {
          username: user.username,
          role: user.role,
        } as any,
        userId: deletedByUserId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`User deleted: ${user.username} by user ${deletedByUserId}`);

    return { message: 'User deleted successfully' };
  }

  // Change user password (by admin)
  async changeUserPassword(
    userId: string,
    data: ChangeUserPasswordDTO,
    changedByUserId: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    const user = await usersRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await usersRepository.update(userId, { password: hashedPassword });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        changes: {
          password: 'changed',
        } as any,
        userId: changedByUserId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`Password changed for user: ${user.username} by user ${changedByUserId}`);

    return { message: 'Password changed successfully' };
  }

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    const [totalUsers, activeUsers, adminCount, staffCount] = await Promise.all([
      usersRepository.count(),
      usersRepository.countActive(),
      usersRepository.countByRole('ADMIN'),
      usersRepository.countByRole('STAFF'),
    ]);

    const maxUsersAllowed = usersRepository.getMaxUsers();

    return {
      totalUsers,
      activeUsers,
      adminCount,
      staffCount,
      maxUsersAllowed,
      canAddMore: totalUsers < maxUsersAllowed,
    };
  }
}

export const usersService = new UsersService();
