import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { parseApiError } from './errors';
import {
  fallbackDevApiBaseUrl,
  normalizeApiBaseUrl,
  resolveHydratedApiBaseUrl as pickHydratedApiBaseUrl,
  shouldReplaceStoredApiUrl,
} from './apiBaseUrl';

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Called from AppState when session should end (e.g. 401). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

/** Only clear the ORAIA login session for our JWT auth failures — not GHL/CRM errors. */
function handleAuthFailure(status?: number, code?: string) {
  if (status === 401 && code === 'UNAUTHORIZED' && unauthorizedHandler) {
    unauthorizedHandler();
  }
}

/** Production/staging URL from EAS build env — cannot be overridden in Settings. */
export function getConfiguredApiBaseUrl(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return normalizeApiBaseUrl(fromEnv);
  const extra = Constants.expoConfig?.extra?.apiUrl;
  if (typeof extra === 'string' && extra.trim()) return normalizeApiBaseUrl(extra);
  return undefined;
}

export function isApiBaseUrlLocked(): boolean {
  return Boolean(getConfiguredApiBaseUrl());
}

/**
 * In Expo Go, Metro advertises the LAN host (e.g. 192.168.18.22:8082).
 * Use the same host for the API so physical devices work without manual Settings.
 */
export function resolveDefaultApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostPort = hostUri.split('/')[0];
    const host = hostPort?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  const legacy = (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (legacy) {
    const host = legacy.split(':')[0];
    if (host) return `http://${host}:3000`;
  }

  return Platform.select({
    android: 'http://10.0.2.2:3000',
    ios: 'http://localhost:3000',
    default: fallbackDevApiBaseUrl(),
  })!;
}

export function resolveHydratedApiBaseUrl(stored?: string | null): string {
  return pickHydratedApiBaseUrl(stored, getConfiguredApiBaseUrl(), resolveDefaultApiBaseUrl());
}

export { shouldReplaceStoredApiUrl };

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = parseApiError(text || `HTTP ${res.status}`, res.status);
      handleAuthFailure(res.status, err.code);
      throw err;
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  async putJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = parseApiError(text || `HTTP ${res.status}`, res.status);
      handleAuthFailure(res.status, err.code);
      throw err;
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  async getJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method: 'GET',
      headers: {
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      const err = parseApiError(text || `HTTP ${res.status}`, res.status);
      handleAuthFailure(res.status, err.code);
      throw err;
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  async deleteJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = parseApiError(text || `HTTP ${res.status}`, res.status);
      handleAuthFailure(res.status, err.code);
      throw err;
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  async delete(path: string, init?: RequestInit): Promise<void> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method: 'DELETE',
      headers: {
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      const err = parseApiError(text || `HTTP ${res.status}`, res.status);
      handleAuthFailure(res.status, err.code);
      throw err;
    }
  }
}

export type ApiAuth = { token: string; locationId?: string | null };

export function withAuthHeaders(auth: ApiAuth): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.token}`,
  };
  if (auth.locationId) headers['X-Location-Id'] = auth.locationId;
  return headers;
}

export const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

export const api = new ApiClient(DEFAULT_API_BASE_URL);
