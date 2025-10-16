import { prisma } from '../../config/database';
import { CreateUserDTO, UpdateUserDTO, UserFilters } from './users.types';

export class UsersRepository {
  // Maximum users allowed
  private readonly MAX_USERS = 3;

  // Find all users with filters
  async findAll(filters: UserFilters = {}) {
    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Find user by ID
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Find user by ID (with password for authentication)
  async findByIdWithPassword(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  // Find user by username
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Create user
  async create(data: CreateUserDTO & { password: string }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Update user
  async update(id: string, data: UpdateUserDTO & { password?: string }) {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Delete user (hard delete)
  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  // Count total users
  async count() {
    return prisma.user.count();
  }

  // Count active users
  async countActive() {
    return prisma.user.count({
      where: { active: true },
    });
  }

  // Count users by role
  async countByRole(role: 'ADMIN' | 'STAFF') {
    return prisma.user.count({
      where: { role },
    });
  }

  // Check if max users reached
  async isMaxUsersReached() {
    const count = await this.count();
    return count >= this.MAX_USERS;
  }

  // Get max users limit
  getMaxUsers() {
    return this.MAX_USERS;
  }
}

export const usersRepository = new UsersRepository();
