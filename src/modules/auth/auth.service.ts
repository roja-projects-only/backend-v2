import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AuthenticationError, NotFoundError } from '../../utils/errors';
import { 
  LoginDTO, 
  RegisterDTO, 
  AuthResponse, 
  JWTPayload, 
  RefreshTokenPayload,
  ChangePasswordDTO 
} from './auth.types';
import { UserRole } from '@prisma/client';

export class AuthService {
  // Generate access token
  private generateAccessToken(userId: string, username: string, role: UserRole): string {
    const payload: JWTPayload = { userId, username, role };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  // Generate refresh token
  private generateRefreshToken(userId: string, tokenId: string): string {
    const payload: RefreshTokenPayload = { userId, tokenId };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Compare password
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Calculate token expiration date
  private calculateExpirationDate(): Date {
    const duration = env.JWT_REFRESH_EXPIRES_IN;
    const match = duration.match(/^(\d+)([dhms])$/);
    
    if (!match) {
      throw new Error('Invalid JWT_REFRESH_EXPIRES_IN format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 's':
        return new Date(now.getTime() + value * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }
  }

  // Login
  async login(data: LoginDTO): Promise<AuthResponse> {
    // Find user (case-insensitive username search)
    const user = await prisma.user.findFirst({
      where: { 
        username: {
          equals: data.username,
          mode: 'insensitive'
        }
      },
    });

    if (!user || !user.active) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(data.passcode, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.username, user.role);
    
    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken: '', // Placeholder, will be updated
        expiresAt: this.calculateExpirationDate(),
      },
    });

    // Generate refresh token with session ID
    const refreshToken = this.generateRefreshToken(user.id, session.id);

    // Update session with refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  // Refresh access token
  async refreshToken(token: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

      // Find session
      const session = await prisma.session.findUnique({
        where: { refreshToken: token },
        include: { user: true },
      });

      if (!session || session.userId !== decoded.userId) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Check if session expired
      if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        throw new AuthenticationError('Session expired');
      }

      // Check if user is still active
      if (!session.user.active) {
        throw new AuthenticationError('User is inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(
        session.user.id,
        session.user.username,
        session.user.role
      );

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: accessToken,
          lastUsedAt: new Date(),
        },
      });

      return {
        user: {
          id: session.user.id,
          username: session.user.username,
          role: session.user.role,
        },
        accessToken,
        refreshToken: token,
        expiresIn: env.JWT_EXPIRES_IN,
      };
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  // Logout
  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Delete session(s)
    if (refreshToken) {
      await prisma.session.deleteMany({
        where: {
          userId,
          refreshToken,
        },
      });
    } else {
      // Delete all user sessions
      await prisma.session.deleteMany({
        where: { userId },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
      },
    });
  }

  // Register new user (admin only)
  async register(data: RegisterDTO, createdByUserId: string): Promise<AuthResponse> {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      throw new AuthenticationError('Username already exists');
    }

    // Check user limit (max 3 users)
    const userCount = await prisma.user.count({ where: { active: true } });
    if (userCount >= 3) {
      throw new AuthenticationError('Maximum user limit reached (3 users)');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.passcode);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        role: data.role || UserRole.STAFF,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
      },
    });

    // Generate tokens
    return this.login({ username: data.username, passcode: data.passcode });
  }

  // Change password
  async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isPasswordValid = await this.comparePassword(data.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(data.newPassword);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        changes: { field: 'password' },
      },
    });
  }

  // Get current user
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }
}

export const authService = new AuthService();
