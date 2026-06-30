const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SIGNUP_MIN_PASSWORD_LENGTH = 8;

export function normalizeAuthEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isValidAuthEmail(email: string): boolean {
  const normalized = normalizeAuthEmail(email);
  return normalized.length > 0 && EMAIL_RE.test(normalized);
}

export function validateSignupPassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < SIGNUP_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${SIGNUP_MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}
