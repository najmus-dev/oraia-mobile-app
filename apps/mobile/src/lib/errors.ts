export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function parseApiError(raw: string, status?: number): ApiError {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: string } };
    const msg = parsed.error?.message ?? raw;
    return new ApiError(msg, status, parsed.error?.code);
  } catch {
    return new ApiError(raw || `HTTP ${status ?? 'error'}`, status);
  }
}

export function formatError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) {
      return 'The server is busy. Wait a moment, then tap Retry.';
    }
    if (e.code === 'GHL_AUTH_ERROR' || e.status === 503) {
      return 'CRM connection is temporarily unavailable. Wait a moment and try again.';
    }
    if (e.status === 404 && e.code === 'GHL_API_ERROR') {
      return 'CRM could not find that record. Check the contact, pipeline, and stage, then try again.';
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
