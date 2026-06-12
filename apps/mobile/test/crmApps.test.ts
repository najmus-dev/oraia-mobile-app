import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRM_APPS,
  crmAppAccent,
  DEFAULT_PINNED_APP_IDS,
  filterAppsByQuery,
} from '../src/lib/crmApps';
import { createTheme } from '../src/theme/createTheme';
import { palette } from '../src/theme/palette';

describe('crmApps', () => {
  it('includes core mobile apps', () => {
    assert.ok(CRM_APPS.contacts.available);
    assert.ok(CRM_APPS.opportunities.available);
  });

  it('defaults pinned apps to GHL-style trio', () => {
    assert.deepEqual(DEFAULT_PINNED_APP_IDS, ['contacts', 'opportunities', 'conversations']);
  });

  it('filters apps by search query', () => {
    const list = filterAppsByQuery(Object.values(CRM_APPS), 'calendar');
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, 'calendar');
  });

  it('resolves brand accent colors from theme', () => {
    const theme = createTheme('dark');
    assert.equal(crmAppAccent(CRM_APPS.contacts, theme), palette.richIndigo);
    assert.equal(crmAppAccent(CRM_APPS.opportunities, theme), theme.colors.success);
  });
});
