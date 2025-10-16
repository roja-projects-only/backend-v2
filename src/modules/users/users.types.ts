// Create user DTO
export interface CreateUserDTO {
  username: string;
  password: string;
  role: 'ADMIN' | 'STAFF';
}

// Update user DTO
export interface UpdateUserDTO {
  username?: string;
  password?: string;
  role?: 'ADMIN' | 'STAFF';
  active?: boolean;
}

// User response (excludes password)
export interface UserResponse {
  id: string;
  username: string;
  role: 'ADMIN' | 'STAFF';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User list filters
export interface UserFilters {
  role?: 'ADMIN' | 'STAFF';
  active?: boolean;
}

// Change password DTO
export interface ChangeUserPasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// User statistics
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  staffCount: number;
  maxUsersAllowed: number;
  canAddMore: boolean;
}
