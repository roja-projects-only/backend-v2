import { UserRole } from '@prisma/client';

// Login request DTO
export interface LoginDTO {
  username: string;
  passcode: string;
}

// Register request DTO (for future admin use)
export interface RegisterDTO {
  username: string;
  passcode: string;
  role?: UserRole;
}

// Token refresh request DTO
export interface RefreshTokenDTO {
  refreshToken: string;
}

// Change password request DTO
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// Auth response with tokens
export interface AuthResponse {
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// Token payload
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

// Refresh token payload
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}
