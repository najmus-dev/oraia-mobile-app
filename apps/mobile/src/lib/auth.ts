import { ApiError } from './errors';
import type { AuthUser } from '../store/auth';

export type AuthMeResponse = {
  user: {
    id: string;
    email: string;
    role: 'agency_admin' | 'staff';
    status?: 'pending' | 'active' | 'rejected';
    companyId?: string;
    allowedLocationIds?: string[];
    ghlUserId?: string;
  };
};

export type AuthSessionResponse = {
  token: string;
  user: AuthMeResponse['user'];
  message?: string;
};

export function mapMeUserToAuthUser(user: AuthMeResponse['user']): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status ?? 'active',
    companyId: user.companyId,
    ghlUserId: user.ghlUserId,
  };
}

export function isUnauthorizedError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}
