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
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
