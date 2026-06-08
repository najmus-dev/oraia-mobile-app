import type { Ionicons } from '@expo/vector-icons';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export type CrmAppId = 'contacts' | 'conversations' | 'calendar' | 'opportunities' | 'tasks';

export type CrmAppDef = {
  id: CrmAppId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
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
    accent: '#7C3AED',
    available: true,
  },
  conversations: {
    id: 'conversations',
    label: 'Conversations',
    icon: 'chatbubble-ellipses-outline',
    accent: '#60A5FA',
    available: true,
  },
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    icon: 'calendar-outline',
    accent: '#F59E0B',
    available: true,
  },
  tasks: {
    id: 'tasks',
    label: 'Tasks',
    icon: 'clipboard-outline',
    accent: '#60A5FA',
    available: true,
  },
  opportunities: {
    id: 'opportunities',
    label: 'Opportunities',
    icon: 'git-network-outline',
    accent: '#10B981',
    available: true,
  },
};

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

export function openCrmApp(
  appId: CrmAppId,
  parentNav: NavigationProp<ParamListBase> | undefined,
): void {
  if (!parentNav) return;
  switch (appId) {
    case 'contacts':
      parentNav.navigate('AppsTab' as never, { screen: 'ContactsList' } as never);
      break;
    case 'conversations':
      parentNav.navigate('InboxTab' as never);
      break;
    case 'calendar':
      parentNav.navigate('CalendarTab' as never);
      break;
    case 'tasks':
      parentNav.navigate('AppsTab' as never, { screen: 'TasksHome' } as never);
      break;
    case 'opportunities':
      parentNav.navigate('AppsTab' as never, { screen: 'PipelineHome' } as never);
      break;
    default:
      break;
  }
}

export function crmAppList(): CrmAppDef[] {
  return Object.values(CRM_APPS);
}

export function filterAppsByQuery(apps: CrmAppDef[], query: string): CrmAppDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return apps;
  return apps.filter((a) => a.label.toLowerCase().includes(q));
}
