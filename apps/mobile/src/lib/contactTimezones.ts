export type TimezoneOption = {
  id: string;
  label: string;
  subtitle?: string;
  recommended?: boolean;
};

export const RECOMMENDED_TIMEZONES: TimezoneOption[] = [
  {
    id: 'America/New_York',
    label: 'GMT-04:00 America/New_York (EDT)',
    subtitle: 'Account Timezone',
    recommended: true,
  },
  {
    id: 'America/Chicago',
    label: 'GMT-05:00 America/Chicago (CDT)',
    subtitle: 'User Timezone',
    recommended: true,
  },
  {
    id: 'America/Los_Angeles',
    label: 'GMT-07:00 America/Los_Angeles (PDT)',
    subtitle: 'System Timezone',
    recommended: true,
  },
];

export const ALL_TIMEZONES: TimezoneOption[] = [
  { id: 'Pacific/Honolulu', label: 'GMT-10:00 Pacific/Honolulu (HST)' },
  { id: 'America/Anchorage', label: 'GMT-08:00 America/Anchorage (AKDT)' },
  { id: 'America/Los_Angeles', label: 'GMT-07:00 America/Los_Angeles (PDT)' },
  { id: 'America/Denver', label: 'GMT-06:00 America/Denver (MDT)' },
  { id: 'America/Chicago', label: 'GMT-05:00 America/Chicago (CDT)' },
  { id: 'America/New_York', label: 'GMT-04:00 America/New_York (EDT)' },
  { id: 'America/Halifax', label: 'GMT-03:00 America/Halifax (ADT)' },
  { id: 'America/Sao_Paulo', label: 'GMT-03:00 America/Sao_Paulo (BRT)' },
  { id: 'Atlantic/Reykjavik', label: 'GMT+00:00 Atlantic/Reykjavik (GMT)' },
  { id: 'Europe/London', label: 'GMT+01:00 Europe/London (BST)' },
  { id: 'Europe/Paris', label: 'GMT+02:00 Europe/Paris (CEST)' },
  { id: 'Europe/Helsinki', label: 'GMT+03:00 Europe/Helsinki (EEST)' },
  { id: 'Asia/Dubai', label: 'GMT+04:00 Asia/Dubai (GST)' },
  { id: 'Asia/Karachi', label: 'GMT+05:00 Asia/Karachi (PKT)' },
  { id: 'Asia/Kolkata', label: 'GMT+05:30 Asia/Kolkata (IST)' },
  { id: 'Asia/Dhaka', label: 'GMT+06:00 Asia/Dhaka (BST)' },
  { id: 'Asia/Bangkok', label: 'GMT+07:00 Asia/Bangkok (ICT)' },
  { id: 'Asia/Singapore', label: 'GMT+08:00 Asia/Singapore (SGT)' },
  { id: 'Asia/Tokyo', label: 'GMT+09:00 Asia/Tokyo (JST)' },
  { id: 'Australia/Sydney', label: 'GMT+10:00 Australia/Sydney (AEST)' },
  { id: 'Pacific/Auckland', label: 'GMT+12:00 Pacific/Auckland (NZST)' },
];

export function timezoneLabel(id: string): string {
  const match =
    RECOMMENDED_TIMEZONES.find((tz) => tz.id === id) ??
    ALL_TIMEZONES.find((tz) => tz.id === id);
  return match?.label ?? id;
}

export function filterTimezones(query: string): TimezoneOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_TIMEZONES;
  return ALL_TIMEZONES.filter(
    (tz) => tz.id.toLowerCase().includes(q) || tz.label.toLowerCase().includes(q),
  );
}
