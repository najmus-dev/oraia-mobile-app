export type UserStatus = 'pending' | 'active' | 'rejected';

export type AuthUser = {
  id: string;
  email: string;
  role: 'agency_admin' | 'staff';
  status?: UserStatus;
  companyId?: string;
  ghlUserId?: string;
};

export function isAccountPending(user: Pick<AuthUser, 'status'> | null | undefined): boolean {
  return user?.status === 'pending';
}

export function isAccountActive(user: Pick<AuthUser, 'status'> | null | undefined): boolean {
  return !user?.status || user.status === 'active';
}

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

export const authState: AuthState = {
  token: null,
  user: null,
};
