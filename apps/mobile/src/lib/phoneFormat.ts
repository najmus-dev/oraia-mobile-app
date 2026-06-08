export const DEFAULT_PHONE_COUNTRY_CODE = '+1';

export const PHONE_COUNTRY_CODES = [
  { code: '+1', label: 'US / CA' },
  { code: '+44', label: 'UK' },
  { code: '+61', label: 'AU' },
  { code: '+91', label: 'IN' },
  { code: '+52', label: 'MX' },
  { code: '+49', label: 'DE' },
  { code: '+33', label: 'FR' },
  { code: '+34', label: 'ES' },
  { code: '+55', label: 'BR' },
] as const;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhoneDisplay(value: string, countryCode = DEFAULT_PHONE_COUNTRY_CODE): string {
  const digits = phoneDigits(value);
  if (!digits) return '';

  if (countryCode === '+1') {
    const local = digits.startsWith('1') && digits.length > 10 ? digits.slice(1, 11) : digits.slice(0, 10);
    if (local.length <= 3) return local;
    if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  return digits;
}

export function phoneToApiValue(display: string, countryCode = DEFAULT_PHONE_COUNTRY_CODE): string {
  const digits = phoneDigits(display);
  if (!digits) return '';

  if (countryCode === '+1') {
    const local = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    if (local.length === 10) return `${countryCode}${local}`;
    if (digits.length === 10) return `${countryCode}${digits}`;
    return digits.length > 0 ? `${countryCode}${local}` : '';
  }

  return `${countryCode}${digits}`;
}

export function parseStoredPhone(phone?: string): {
  countryCode: string;
  display: string;
} {
  const raw = phone?.trim() ?? '';
  if (!raw) {
    return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, display: '' };
  }

  if (raw.startsWith('+')) {
    const match = PHONE_COUNTRY_CODES.find((entry) => raw.startsWith(entry.code));
    if (match) {
      const local = raw.slice(match.code.length);
      return {
        countryCode: match.code,
        display: formatPhoneDisplay(local, match.code),
      };
    }
    const generic = raw.match(/^(\+\d{1,3})(.*)$/);
    if (generic) {
      const code = generic[1]!;
      const local = generic[2] ?? '';
      return {
        countryCode: code,
        display: formatPhoneDisplay(local, code),
      };
    }
  }

  return {
    countryCode: DEFAULT_PHONE_COUNTRY_CODE,
    display: formatPhoneDisplay(raw, DEFAULT_PHONE_COUNTRY_CODE),
  };
}

export function isValidPhone(display: string, countryCode = DEFAULT_PHONE_COUNTRY_CODE): boolean {
  const digits = phoneDigits(display);
  if (!digits) return true;
  if (countryCode === '+1') {
    const local = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    return local.length === 10;
  }
  return digits.length >= 7 && digits.length <= 15;
}

export function countryCodeLabel(code: string): string {
  return PHONE_COUNTRY_CODES.find((entry) => entry.code === code)?.label ?? code;
}
