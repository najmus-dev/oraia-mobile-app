import {
  DEFAULT_PHONE_COUNTRY_CODE,
  formatPhoneDisplay,
  isValidPhone,
  parseStoredPhone,
  phoneToApiValue,
} from './phoneFormat';

export type ContactDndSettings = {
  Call?: { status?: string };
  Email?: { status?: string };
  SMS?: { status?: string };
};

export type Contact = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  timezone?: string;
  type?: string;
  tags?: string[];
  assignedTo?: string;
  website?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dnd?: boolean;
  dndSettings?: ContactDndSettings;
  dateAdded?: string;
  dateUpdated?: string;
};

export type ContactTag = {
  id: string;
  name: string;
};

export type ContactSmartList = {
  id: string;
  name: string;
  source: 'all' | 'smartList' | 'tag';
};

export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  phoneType: string;
  companyName: string;
  contactType: string;
  timezone: string;
  tags: string[];
  assignedTo: string;
  assigneeName: string;
  dndAll: boolean;
  dndEmail: boolean;
  dndSms: boolean;
  dndCall: boolean;
};

export type ContactsListMeta = {
  total?: number;
  nextPageUrl?: string;
  startAfterId?: string;
  startAfter?: number;
  page?: number;
  pageLimit?: number;
  hasMore?: boolean;
};

export type ContactsListResponse = {
  contacts: Contact[];
  meta?: ContactsListMeta;
};

export type ContactSmartListsResponse = {
  lists: ContactSmartList[];
  usesTagsFallback?: boolean;
};

export type ContactTagsResponse = {
  tags: ContactTag[];
};

export type ContactResponse = {
  contact: Contact;
};

export type ContactTasksResponse = {
  contactId: string;
  tasks: import('./tasks').Task[];
};

/** Lightweight contact passed between picker and forms. */
export type PickedContact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

export const CONTACT_TYPES = ['Lead', 'Customer', 'Prospect'] as const;
export const PHONE_TYPES = ['Mobile', 'Home', 'Work', 'Landline', 'Other'] as const;

export function contactToPicked(c: Contact): PickedContact {
  return {
    id: c.id,
    name: contactDisplayName(c),
    phone: c.phone?.trim() || undefined,
    email: c.email?.trim() || undefined,
  };
}

/** GHL contact ids are not phone numbers. */
export function looksLikePhoneContactId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^\+?[\d\s().-]{7,}$/.test(trimmed);
}

export function contactDisplayName(c: Pick<Contact, 'firstName' | 'lastName' | 'name'>): string {
  const fromParts = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  return c.name?.trim() || fromParts || 'Unnamed';
}

/** Multi-line clipboard text (name, phone, email) — matches GHL mobile copy behavior. */
export function formatContactClipboardText(
  contact: Pick<Contact, 'firstName' | 'lastName' | 'name' | 'phone' | 'email'>,
): string {
  const lines: string[] = [];
  const name = contactDisplayName(contact);
  if (name !== 'Unnamed') lines.push(name);
  const phone = contact.phone?.trim();
  if (phone) lines.push(phone);
  const email = contact.email?.trim();
  if (email) lines.push(email);
  return lines.join('\n');
}

export function contactInitials(c: Pick<Contact, 'firstName' | 'lastName' | 'name' | 'phone'>): string {
  const name = contactDisplayName(c);
  if (name !== 'Unnamed') {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
  }
  const digits = c.phone?.replace(/\D/g, '') ?? '';
  const localDigits = digits.startsWith('1') && digits.length > 10 ? digits.slice(1) : digits;
  if (localDigits.length >= 2) return localDigits.slice(0, 2);
  if (digits.length >= 2) return digits.slice(0, 2);
  return '?';
}

export function contactSubtitle(c: Contact): string | undefined {
  return c.email?.trim() || c.phone?.trim() || c.companyName?.trim() || undefined;
}

export function contactMatchesTag(c: Contact, tagName: string): boolean {
  if (!tagName.trim()) return true;
  return (c.tags ?? []).some((t) => t.toLowerCase() === tagName.toLowerCase());
}

export function usesPageBasedContactPagination(filterId: string): boolean {
  return filterId !== 'all';
}

export function contactToFormValues(c: Contact): ContactFormValues {
  const parsedPhone = parseStoredPhone(c.phone);
  return {
    firstName: c.firstName?.trim() ?? '',
    lastName: c.lastName?.trim() ?? '',
    email: c.email?.trim() ?? '',
    phone: parsedPhone.display,
    phoneCountryCode: parsedPhone.countryCode,
    phoneType: 'Mobile',
    companyName: c.companyName?.trim() ?? '',
    contactType: formatContactType(c.type) || 'Lead',
    timezone: c.timezone?.trim() || 'America/New_York',
    tags: [...(c.tags ?? [])],
    assignedTo: c.assignedTo?.trim() ?? '',
    assigneeName: '',
    dndAll: c.dnd === true,
    dndEmail: c.dndSettings?.Email?.status === 'active',
    dndSms: c.dndSettings?.SMS?.status === 'active',
    dndCall: c.dndSettings?.Call?.status === 'active',
  };
}

export function emptyContactFormValues(timezone = 'America/New_York'): ContactFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    phoneType: 'Mobile',
    companyName: '',
    contactType: 'Lead',
    timezone,
    tags: [],
    assignedTo: '',
    assigneeName: '',
    dndAll: false,
    dndEmail: false,
    dndSms: false,
    dndCall: false,
  };
}

function formatContactType(type?: string): string {
  if (!type?.trim()) return 'Lead';
  const normalized = type.trim().toLowerCase();
  if (normalized === 'customer') return 'Customer';
  if (normalized === 'prospect') return 'Prospect';
  if (normalized === 'lead') return 'Lead';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function contactTypeToApi(type: string): string {
  return type.trim().toLowerCase();
}

function buildDndSettings(values: ContactFormValues): ContactDndSettings | undefined {
  if (values.dndAll) return undefined;
  const settings: ContactDndSettings = {};
  if (values.dndEmail) settings.Email = { status: 'active' };
  if (values.dndSms) settings.SMS = { status: 'active' };
  if (values.dndCall) settings.Call = { status: 'active' };
  return Object.keys(settings).length > 0 ? settings : undefined;
}

export function formValuesToPayload(values: ContactFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (values.firstName.trim()) payload.firstName = values.firstName.trim();
  if (values.lastName.trim()) payload.lastName = values.lastName.trim();
  if (values.email.trim()) payload.email = values.email.trim();
  if (values.phone.trim()) {
    payload.phone = phoneToApiValue(values.phone, values.phoneCountryCode);
  }
  if (values.companyName.trim()) payload.companyName = values.companyName.trim();
  if (values.timezone.trim()) payload.timezone = values.timezone.trim();
  if (values.contactType.trim()) payload.type = contactTypeToApi(values.contactType);
  payload.tags = values.tags.map((t) => t.trim()).filter(Boolean);
  const assignedTo = values.assignedTo.trim();
  if (assignedTo) payload.assignedTo = assignedTo;
  payload.dnd = values.dndAll;
  const dndSettings = buildDndSettings(values);
  if (dndSettings) payload.dndSettings = dndSettings;
  return payload;
}

export function validateContactForm(values: ContactFormValues, opts?: { requireFirstName?: boolean }): string | null {
  const payload = formValuesToPayload(values);
  const hasIdentifier =
    Boolean(values.firstName.trim()) ||
    Boolean(values.lastName.trim()) ||
    Boolean(values.email.trim()) ||
    Boolean(values.phone.trim());
  if (opts?.requireFirstName && !values.firstName.trim()) {
    return 'First name is required.';
  }
  if (!hasIdentifier) {
    return 'Enter at least a first name, last name, email, or phone number.';
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (values.phone.trim() && !isValidPhone(values.phone, values.phoneCountryCode)) {
    return values.phoneCountryCode === '+1'
      ? 'Enter a valid 10-digit phone number.'
      : 'Enter a valid phone number.';
  }
  if (Object.keys(payload).length === 0) {
    return 'Enter at least one contact field.';
  }
  return null;
}

export function formatContactPhoneInput(text: string, countryCode: string): string {
  return formatPhoneDisplay(text, countryCode);
}

export function contactAddressLine(c: Contact): string | undefined {
  const parts = [c.address1, c.city, c.state, c.postalCode, c.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
