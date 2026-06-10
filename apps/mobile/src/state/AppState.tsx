import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../store/auth';
import {
  DEFAULT_API_BASE_URL,
  api,
  isApiBaseUrlLocked,
  resolveHydratedApiBaseUrl,
  setUnauthorizedHandler,
} from '../lib/api';
import { isUnauthorizedError } from '../lib/auth';
import { fetchAuthMe } from '../lib/authSession';
import { DEFAULT_PINNED_APP_IDS, PINNABLE_CRM_APP_IDS } from '../lib/crmApps';

type AppStateValue = {
  hydrated: boolean;
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  refreshSession: () => Promise<boolean>;
  clearSession: () => void;

  locationId: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationLogoUrl: string | null;
  setLocationId: (locationId: string | null) => void;
  setLocation: (location: {
    id: string;
    name?: string | null;
    address?: string | null;
    logoUrl?: string | null;
  } | null) => void;

  apiBaseUrl: string;
  setApiBaseUrl: (apiBaseUrl: string) => void;

  pinnedAppIds: string[];
  setPinnedAppIds: (ids: string[]) => void;

  recentLocationIds: string[];
  pinnedLocationIds: string[];
  togglePinLocation: (locationId: string) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

const STORAGE_KEYS = {
  token: 'oraia.token',
  user: 'oraia.user',
  locationId: 'oraia.locationId',
  locationName: 'oraia.locationName',
  locationAddress: 'oraia.locationAddress',
  locationLogoUrl: 'oraia.locationLogoUrl',
  apiBaseUrl: 'oraia.apiBaseUrl',
  pinnedApps: 'oraia.pinnedApps',
  recentLocations: 'oraia.recentLocations',
  pinnedLocations: 'oraia.pinnedLocations',
} as const;

function pushRecentLocationIds(current: string[], id: string, max = 8): string[] {
  return [id, ...current.filter((x) => x !== id)].slice(0, max);
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [locationLogoUrl, setLocationLogoUrl] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(DEFAULT_API_BASE_URL);
  const [pinnedAppIds, setPinnedAppIdsState] = useState<string[]>([...DEFAULT_PINNED_APP_IDS]);
  const [recentLocationIds, setRecentLocationIds] = useState<string[]>([]);
  const [pinnedLocationIds, setPinnedLocationIds] = useState<string[]>([]);

  function clearStoredSession() {
    setToken(null);
    setUser(null);
    setLocationId(null);
    setLocationName(null);
    setLocationAddress(null);
    setLocationLogoUrl(null);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    SecureStore.deleteItemAsync(STORAGE_KEYS.token);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    SecureStore.deleteItemAsync(STORAGE_KEYS.user);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    SecureStore.deleteItemAsync(STORAGE_KEYS.locationId);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    SecureStore.deleteItemAsync(STORAGE_KEYS.locationName);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    SecureStore.deleteItemAsync(STORAGE_KEYS.locationAddress);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    SecureStore.deleteItemAsync(STORAGE_KEYS.locationLogoUrl);
  }

  useEffect(() => {
    setUnauthorizedHandler(clearStoredSession);
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [
          storedToken,
          storedUser,
          storedLocationId,
          storedLocationName,
          storedLocationAddress,
          storedLocationLogoUrl,
          storedApiBaseUrl,
          storedPinnedApps,
          storedRecentLocations,
          storedPinnedLocations,
        ] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.token),
          SecureStore.getItemAsync(STORAGE_KEYS.user),
          SecureStore.getItemAsync(STORAGE_KEYS.locationId),
          SecureStore.getItemAsync(STORAGE_KEYS.locationName),
          SecureStore.getItemAsync(STORAGE_KEYS.locationAddress),
          SecureStore.getItemAsync(STORAGE_KEYS.locationLogoUrl),
          SecureStore.getItemAsync(STORAGE_KEYS.apiBaseUrl),
          SecureStore.getItemAsync(STORAGE_KEYS.pinnedApps),
          SecureStore.getItemAsync(STORAGE_KEYS.recentLocations),
          SecureStore.getItemAsync(STORAGE_KEYS.pinnedLocations),
        ]);

        if (!alive) return;
        const baseUrl = resolveHydratedApiBaseUrl(storedApiBaseUrl);
        setApiBaseUrlState(baseUrl);
        api.setBaseUrl(baseUrl);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEYS.apiBaseUrl, baseUrl);
        let parsedUser: AuthUser | null = null;
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser) as AuthUser;
          } catch {
            parsedUser = null;
          }
        }

        if (storedToken) {
          setToken(storedToken);
          if (parsedUser) setUser(parsedUser);

          // Validate session in the background — do not block first paint.
          void (async () => {
            try {
              const refreshed = await fetchAuthMe(storedToken, storedLocationId);
              if (!alive) return;
              setUser(refreshed);
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(refreshed));
            } catch (e) {
              if (!alive) return;
              if (isUnauthorizedError(e)) {
                clearStoredSession();
              } else if (!parsedUser) {
                setToken(null);
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                SecureStore.deleteItemAsync(STORAGE_KEYS.token);
              }
            }
          })();
        } else if (parsedUser) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.user);
        }

        if (storedLocationId) setLocationId(storedLocationId);
        if (storedLocationName) setLocationName(storedLocationName);
        if (storedLocationAddress) setLocationAddress(storedLocationAddress);
        if (storedLocationLogoUrl) setLocationLogoUrl(storedLocationLogoUrl);
        if (storedPinnedApps) {
          try {
            const parsed = JSON.parse(storedPinnedApps) as unknown;
            const allowed = new Set<string>(PINNABLE_CRM_APP_IDS);
            if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
              const filtered = parsed.filter((id) => allowed.has(id));
              if (filtered.length > 0) setPinnedAppIdsState(filtered);
            }
          } catch {
            // ignore invalid storage
          }
        }
        if (storedRecentLocations) {
          try {
            const parsed = JSON.parse(storedRecentLocations) as unknown;
            if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
              setRecentLocationIds(parsed);
            }
          } catch {
            // ignore invalid storage
          }
        }
        if (storedPinnedLocations) {
          try {
            const parsed = JSON.parse(storedPinnedLocations) as unknown;
            if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
              setPinnedLocationIds(parsed);
            }
          } catch {
            // ignore invalid storage
          }
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      hydrated,
      token,
      user,
      setSession: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        // fire and forget
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEYS.token, nextToken);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(nextUser));
      },
      refreshSession: async () => {
        if (!token) return false;
        try {
          const refreshed = await fetchAuthMe(token, locationId);
          setUser(refreshed);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(refreshed));
          return true;
        } catch (e) {
          if (isUnauthorizedError(e)) {
            clearStoredSession();
          }
          return false;
        }
      },
      clearSession: () => {
        clearStoredSession();
      },
      locationId,
      locationName,
      locationAddress,
      locationLogoUrl,
      setLocationId: (id) => {
        setLocationId(id);
        if (id) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.locationId, id);
        } else {
          setLocationName(null);
          setLocationAddress(null);
          setLocationLogoUrl(null);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationId);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationName);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationAddress);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationLogoUrl);
        }
      },
      setLocation: (loc) => {
        if (!loc?.id) {
          setLocationId(null);
          setLocationName(null);
          setLocationAddress(null);
          setLocationLogoUrl(null);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationId);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationName);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationAddress);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationLogoUrl);
          return;
        }
        setLocationId(loc.id);
        setLocationName(loc.name?.trim() || null);
        setLocationAddress(loc.address?.trim() || null);
        setLocationLogoUrl(loc.logoUrl?.trim() || null);
        setRecentLocationIds((prev) => {
          const next = pushRecentLocationIds(prev, loc.id);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.recentLocations, JSON.stringify(next));
          return next;
        });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEYS.locationId, loc.id);
        if (loc.name?.trim()) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.locationName, loc.name.trim());
        } else {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationName);
        }
        if (loc.address?.trim()) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.locationAddress, loc.address.trim());
        } else {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationAddress);
        }
        if (loc.logoUrl?.trim()) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.locationLogoUrl, loc.logoUrl.trim());
        } else {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.deleteItemAsync(STORAGE_KEYS.locationLogoUrl);
        }
      },
      apiBaseUrl,
      setApiBaseUrl: (next) => {
        if (isApiBaseUrlLocked()) return;
        const trimmed = next.trim().replace(/\/+$/, '');
        setApiBaseUrlState(trimmed);
        api.setBaseUrl(trimmed);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEYS.apiBaseUrl, trimmed);
      },
      pinnedAppIds,
      setPinnedAppIds: (ids) => {
        const next = ids.filter((x) => typeof x === 'string' && x.trim()).slice(0, 4);
        setPinnedAppIdsState(next);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEYS.pinnedApps, JSON.stringify(next));
      },
      recentLocationIds,
      pinnedLocationIds,
      togglePinLocation: (id) => {
        setPinnedLocationIds((prev) => {
          const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          SecureStore.setItemAsync(STORAGE_KEYS.pinnedLocations, JSON.stringify(next));
          return next;
        });
      },
    }),
    [
      hydrated,
      token,
      user,
      locationId,
      locationName,
      locationAddress,
      locationLogoUrl,
      apiBaseUrl,
      pinnedAppIds,
      recentLocationIds,
      pinnedLocationIds,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
