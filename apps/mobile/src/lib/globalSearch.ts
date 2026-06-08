import type { Contact } from './contacts';
import type { Conversation } from './conversations';
import type { CrmAppDef, CrmAppId } from './crmApps';
import { formatOpportunityMoney, type Opportunity } from './opportunities';
import type { Task } from './tasks';
import type { CalendarSearchEvent } from './appointmentSearch';

export const GLOBAL_SEARCH_LIMIT = 5;

export type SearchScope = CrmAppId | null;

export type GlobalSearchResults = {
  apps: CrmAppDef[];
  contacts: Contact[];
  conversations: Conversation[];
  opportunities: Opportunity[];
  tasks: Task[];
  appointments: CalendarSearchEvent[];
  contactsTotal?: number;
  conversationsTotal?: number;
  opportunitiesTotal?: number;
  tasksTotal?: number;
  appointmentsTotal?: number;
};

/** GHL-style contact line: email | phone */
export function contactSearchDetail(c: Contact): string {
  const email = c.email?.trim();
  const phone = c.phone?.trim();
  if (email && phone) return `${email} | ${phone}`;
  return email || phone || '';
}

export function opportunitySearchDetail(o: Opportunity): string {
  const parts: string[] = [];
  const value = formatOpportunityMoney(o.monetaryValue);
  if (value) parts.push(value);
  if (o.status?.trim()) parts.push(o.status);
  return parts.join(' · ');
}

export function shouldShowSearchSection(
  scope: SearchScope,
  section: 'apps' | 'contacts' | 'conversations' | 'opportunities' | 'tasks' | 'appointments',
): boolean {
  if (!scope) return true;
  if (section === 'apps') {
    return scope !== 'contacts' && scope !== 'conversations' && scope !== 'opportunities' && scope !== 'tasks' && scope !== 'calendar';
  }
  if (section === 'contacts') return scope === 'contacts';
  if (section === 'conversations') return scope === 'conversations';
  if (section === 'opportunities') return scope === 'opportunities';
  if (section === 'tasks') return scope === 'tasks';
  if (section === 'appointments') return scope === 'calendar';
  return true;
}

export function mergeGlobalSearchResults(
  scope: SearchScope,
  partial: GlobalSearchResults,
): GlobalSearchResults {
  return {
    apps: shouldShowSearchSection(scope, 'apps') ? partial.apps : [],
    contacts: shouldShowSearchSection(scope, 'contacts') ? partial.contacts : [],
    conversations: shouldShowSearchSection(scope, 'conversations') ? partial.conversations : [],
    opportunities: shouldShowSearchSection(scope, 'opportunities') ? partial.opportunities : [],
    tasks: shouldShowSearchSection(scope, 'tasks') ? partial.tasks : [],
    appointments: shouldShowSearchSection(scope, 'appointments') ? partial.appointments : [],
    contactsTotal: shouldShowSearchSection(scope, 'contacts') ? partial.contactsTotal : undefined,
    conversationsTotal: shouldShowSearchSection(scope, 'conversations')
      ? partial.conversationsTotal
      : undefined,
    opportunitiesTotal: shouldShowSearchSection(scope, 'opportunities')
      ? partial.opportunitiesTotal
      : undefined,
    tasksTotal: shouldShowSearchSection(scope, 'tasks') ? partial.tasksTotal : undefined,
    appointmentsTotal: shouldShowSearchSection(scope, 'appointments')
      ? partial.appointmentsTotal
      : undefined,
  };
}
