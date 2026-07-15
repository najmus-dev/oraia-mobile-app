import { useEffect, useRef } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { isAccountPending, type AuthUser } from '../store/auth';

type AuthSlice = {
  token: string | null;
  user: Pick<AuthUser, 'status'> | null;
  locationId: string | null;
};

export function resolveAuthRoute({
  token,
  user,
  locationId,
}: AuthSlice): keyof RootStackParamList {
  if (!token) return 'Login';
  if (isAccountPending(user)) return 'PendingApproval';
  if (!locationId) return 'LocationPicker';
  return 'Main';
}

/** Keep a single navigation tree — reset route when auth/session changes only. */
export function useAuthNavigationSync(
  navigationRef: NavigationContainerRef<RootStackParamList>,
  auth: AuthSlice,
): void {
  const lastSyncKey = useRef<string | null>(null);

  useEffect(() => {
    const syncKey = `${auth.token ?? ''}:${isAccountPending(auth.user)}:${auth.locationId ?? ''}`;
    if (lastSyncKey.current === syncKey) return;

    const target = resolveAuthRoute(auth);
    const apply = () => {
      if (!navigationRef.isReady()) return false;
      const current = navigationRef.getCurrentRoute()?.name;
      if (current === target) {
        lastSyncKey.current = syncKey;
        return true;
      }
      navigationRef.reset({
        index: 0,
        routes: [{ name: target }],
      });
      lastSyncKey.current = syncKey;
      return true;
    };

    if (apply()) return;
    // Navigator not ready yet (e.g. cold start) — retry until it is.
    const id = setInterval(() => {
      if (apply()) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [auth.token, auth.user, auth.locationId, navigationRef]);
}
