export const SIGNUP_MIN_PASSWORD_LENGTH = 8;
export const LOGIN_MIN_PASSWORD_LENGTH = 6;

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateAuthEmail(email: string, touched: boolean): string {
  if (!touched) return '';
  const normalized = normalizeAuthEmail(email);
  if (!normalized) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'Enter a valid email address.';
  return '';
}

export function validateLoginPassword(password: string, touched: boolean): string {
  if (!touched) return '';
  if (!password) return 'Password is required.';
  if (password.length < LOGIN_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${LOGIN_MIN_PASSWORD_LENGTH} characters.`;
  }
  return '';
}

export function validateSignupPassword(password: string, touched: boolean): string {
  if (!touched) return '';
  if (!password) return 'Password is required.';
  if (password.length < SIGNUP_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${SIGNUP_MIN_PASSWORD_LENGTH} characters.`;
  }
  return '';
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
  touched: boolean,
): string {
  if (!touched) return '';
  if (!confirmPassword) return 'Please confirm your password.';
  if (confirmPassword !== password) return 'Passwords do not match.';
  return '';
}
