import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractPushNavigationTarget } from '../src/lib/pushNavigation';

describe('pushNotifications', () => {
  it('opens SMS and call pushes on the conversation thread', () => {
    assert.deepEqual(
      extractPushNavigationTarget({
        type: 'conversation',
        conversationId: 'con_1',
        contactId: 'c_1',
      }),
      { type: 'conversation', conversationId: 'con_1', contactId: 'c_1' },
    );
  });

  it('ignores test pushes with no destination', () => {
    assert.equal(extractPushNavigationTarget({ type: 'test', locationId: 'loc_1' }), null);
  });
});
