import type { Contact } from './contacts';
import type { Conversation } from './conversations';
import type { CrmAppDef, CrmAppId } from './crmApps';
import { formatOpportunityMoney, type Opportunity } from './opportunities';

export const GLOBAL_SEARCH_LIMIT = 5;

export type SearchScope = CrmAppId | null;

export type GlobalSearchResults = {
  apps: CrmAppDef[];
  contacts: Contact[];
  conversations: Conversation[];
  opportunities: Opportunity[];
  contactsTotal?: number;
  conversationsTotal?: number;
  opportunitiesTotal?: number;
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
  section: 'apps' | 'contacts' | 'conversations' | 'opportunities',
): boolean {
  if (!scope) return true;
  if (section === 'apps') {
    return scope !== 'contacts' && scope !== 'conversations' && scope !== 'opportunities';
  }
  if (section === 'contacts') return scope === 'contacts';
  if (section === 'conversations') return scope === 'conversations';
  if (section === 'opportunities') return scope === 'opportunities';
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
    contactsTotal: shouldShowSearchSection(scope, 'contacts') ? partial.contactsTotal : undefined,
    conversationsTotal: shouldShowSearchSection(scope, 'conversations')
      ? partial.conversationsTotal
      : undefined,
    opportunitiesTotal: shouldShowSearchSection(scope, 'opportunities')
      ? partial.opportunitiesTotal
      : undefined,
  };
}
