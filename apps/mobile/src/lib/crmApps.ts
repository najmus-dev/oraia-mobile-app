import type { Ionicons } from '@expo/vector-icons';
import type { OraiaTheme } from '../theme/createTheme';

export type CrmAppId = 'contacts' | 'conversations' | 'calendar' | 'opportunities' | 'tasks';

export type CrmAppAccent = 'primary' | 'secondary' | 'lavender' | 'success';

export type CrmAppDef = {
  id: CrmAppId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: CrmAppAccent;
  available: boolean;
};

export type CrmAppSection = {
  id: string;
  title: string;
  appIds: CrmAppId[];
};

export const CRM_APPS: Record<CrmAppId, CrmAppDef> = {
  contacts: {
    id: 'contacts',
    label: 'Contacts',
    icon: 'people-outline',
    accent: 'primary',
    available: true,
  },
  conversations: {
    id: 'conversations',
    label: 'Conversations',
    icon: 'chatbubble-ellipses-outline',
    accent: 'secondary',
    available: true,
  },
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    icon: 'calendar-outline',
    accent: 'lavender',
    available: true,
  },
  tasks: {
    id: 'tasks',
    label: 'Tasks',
    icon: 'clipboard-outline',
    accent: 'secondary',
    available: true,
  },
  opportunities: {
    id: 'opportunities',
    label: 'Opportunities',
    icon: 'git-network-outline',
    accent: 'success',
    available: true,
  },
};

export function crmAppAccent(app: CrmAppDef, theme: OraiaTheme): string {
  switch (app.accent) {
    case 'primary':
      return theme.colors.primary;
    case 'secondary':
      return theme.colors.secondary;
    case 'lavender':
      return theme.colors.lavender;
    case 'success':
      return theme.colors.success;
  }
}

export const CRM_APP_SECTIONS: CrmAppSection[] = [
  {
    id: 'insights',
    title: 'Insights & Productivity',
    appIds: ['calendar', 'tasks'],
  },
  {
    id: 'communication',
    title: 'Communication',
    appIds: ['conversations', 'contacts'],
  },
  {
    id: 'sales',
    title: 'Sales & Operations',
    appIds: ['opportunities'],
  },
];

export const DEFAULT_PINNED_APP_IDS: CrmAppId[] = ['contacts', 'opportunities', 'conversations'];

/** App ids that can be pinned on Home / Search suggested apps. */
export const PINNABLE_CRM_APP_IDS: readonly CrmAppId[] = Object.keys(CRM_APPS) as CrmAppId[];

export function crmAppList(): CrmAppDef[] {
  return Object.values(CRM_APPS);
}

export function filterAppsByQuery(apps: CrmAppDef[], query: string): CrmAppDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return apps;
  return apps.filter((a) => a.label.toLowerCase().includes(q));
}
