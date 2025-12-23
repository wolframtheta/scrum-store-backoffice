import { UserRole } from './user-role.enum';

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone?: string;
  profileImage?: string;
  roles: UserRole[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  surname: string;
  phone?: string;
}


