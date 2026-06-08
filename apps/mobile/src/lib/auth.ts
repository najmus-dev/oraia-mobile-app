import { ApiError } from './errors';
import type { AuthUser } from '../store/auth';

export type AuthMeResponse = {
  user: {
    id: string;
    email: string;
    role: 'agency_admin' | 'staff';
    companyId?: string;
    allowedLocationIds?: string[];
    ghlUserId?: string;
  };
};

export function mapMeUserToAuthUser(user: AuthMeResponse['user']): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    ghlUserId: user.ghlUserId,
  };
}

export function isUnauthorizedError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}
