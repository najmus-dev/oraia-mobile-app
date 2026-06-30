import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildExpoPushMessages } from '../src/services/pushService';

describe('pushService', () => {
  it('includes Android channelId and high priority on push messages', () => {
    const messages = buildExpoPushMessages([{ token: 'ExponentPushToken[test]' }], {
      locationId: 'loc_1',
      channel: 'messages',
      title: 'New message',
      body: 'Hello',
      data: {
        type: 'conversation',
        conversationId: 'con_1',
        contactId: 'c_1',
      },
    });

    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.channelId, 'messages');
    assert.equal(messages[0]?.priority, 'high');
    assert.equal(messages[0]?.data?.type, 'conversation');
    assert.equal(messages[0]?.data?.conversationId, 'con_1');
  });

  it('routes task pushes to the tasks channel', () => {
    const messages = buildExpoPushMessages([{ token: 'ExponentPushToken[test]' }], {
      locationId: 'loc_1',
      channel: 'tasks',
      title: 'New task',
      body: 'Follow up',
      data: { type: 'task', taskId: 'task_1', contactId: '' },
    });
    assert.equal(messages[0]?.channelId, 'tasks');
    assert.equal(messages[0]?.data?.type, 'task');
  });
});
