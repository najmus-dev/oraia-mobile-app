export type AuthUser = {
  id: string;
  email: string;
  role: 'agency_admin' | 'staff';
  companyId?: string;
  ghlUserId?: string;
};

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

export const authState: AuthState = {
  token: null,
  user: null,
};
