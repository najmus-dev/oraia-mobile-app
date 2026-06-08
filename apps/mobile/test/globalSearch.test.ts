import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  contactSearchDetail,
  mergeGlobalSearchResults,
  opportunitySearchDetail,
  shouldShowSearchSection,
} from '../src/lib/globalSearch';
import type { Contact } from '../src/lib/contacts';

describe('globalSearch', () => {
  it('formats contact detail as email | phone', () => {
    const c: Contact = {
      id: '1',
      email: 'a@b.com',
      phone: '+15551234567',
    };
    assert.equal(contactSearchDetail(c), 'a@b.com | +15551234567');
  });

  it('formats opportunity detail with value and status', () => {
    const detail = opportunitySearchDetail({
      id: 'o1',
      name: 'Deal',
      monetaryValue: 1200,
      status: 'open',
    });
    assert.match(detail, /1,200|1200/);
    assert.match(detail, /open/i);
  });

  it('scopes sections when an app is selected', () => {
    assert.equal(shouldShowSearchSection('contacts', 'contacts'), true);
    assert.equal(shouldShowSearchSection('contacts', 'conversations'), false);
    assert.equal(shouldShowSearchSection('opportunities', 'opportunities'), true);
    assert.equal(shouldShowSearchSection('opportunities', 'contacts'), false);
    assert.equal(shouldShowSearchSection(null, 'contacts'), true);
  });

  it('filters merged results by scope', () => {
    const merged = mergeGlobalSearchResults('conversations', {
      apps: [{ id: 'contacts', label: 'Contacts', icon: 'people-outline', accent: '#000', available: true }],
      contacts: [{ id: 'c1' }],
      conversations: [{ id: 'v1' }],
      opportunities: [{ id: 'o1', name: 'Deal' }],
    });
    assert.equal(merged.contacts.length, 0);
    assert.equal(merged.conversations.length, 1);
    assert.equal(merged.opportunities.length, 0);
    assert.equal(merged.apps.length, 0);
  });
});
