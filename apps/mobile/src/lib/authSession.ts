import { ApiError } from './errors';
import { api, withAuthHeaders } from './api';
import { type AuthMeResponse, mapMeUserToAuthUser } from './auth';
import type { AuthUser } from '../store/auth';

/** Validate stored JWT and return fresh user profile from BFF. */
export async function fetchAuthMe(token: string, locationId?: string | null): Promise<AuthUser> {
  const res = await api.getJson<AuthMeResponse>('/api/auth/me', {
    headers: withAuthHeaders({ token, locationId: locationId ?? null }),
  });
  if (!res.user?.id || !res.user.email) {
    throw new ApiError('Invalid session response', 401, 'INVALID_SESSION');
  }
  return mapMeUserToAuthUser(res.user);
}
