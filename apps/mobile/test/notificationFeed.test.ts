import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNotificationsQuery,
  dedupeNotificationItems,
  formatNotificationTime,
  notificationActivityTime,
  notificationTypeIcon,
} from '../src/lib/notificationFeedUtils';
import type { NotificationItem } from '../src/lib/notificationFeedTypes';

function sampleConversation(id: string, occurredAt: string, status: 'read' | 'unread' = 'unread'): NotificationItem {
  return {
    id,
    locationId: 'loc_1',
    type: 'conversations',
    status,
    title: 'Message from Sam',
    body: 'Hello',
    action: { kind: 'conversation', conversationId: 'con_1' },
    occurredAt,
    createdAt: '2026-06-12T19:00:00.000Z',
  };
}

describe('notificationFeed', () => {
  it('builds query string with filters and sync', () => {
    const qs = buildNotificationsQuery({
      type: 'conversations',
      status: 'unread',
      sync: true,
      limit: 20,
    });
    assert.match(qs, /type=conversations/);
    assert.match(qs, /status=unread/);
    assert.match(qs, /sync=1/);
    assert.match(qs, /tzOffset=/);
  });

  it('maps type icons', () => {
    assert.equal(notificationTypeIcon('tasks'), 'checkbox-outline');
    assert.equal(notificationTypeIcon('all'), 'notifications-outline');
  });

  it('formats relative time from activity timestamp', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    assert.equal(formatNotificationTime(twoHoursAgo), '2h ago');
  });

  it('prefers occurredAt over createdAt', () => {
    const item = sampleConversation('a', '2026-06-01T12:00:00.000Z');
    assert.equal(notificationActivityTime(item), '2026-06-01T12:00:00.000Z');
  });

  it('dedupes conversation notifications by conversation id', () => {
    const deduped = dedupeNotificationItems([
      sampleConversation('n1', '2026-06-01T10:00:00.000Z'),
      sampleConversation('n2', '2026-06-01T12:00:00.000Z'),
      {
        ...sampleConversation('n3', '2026-06-01T08:00:00.000Z'),
        type: 'tasks',
        action: { kind: 'task', taskId: 't1' },
      },
    ]);
    assert.equal(deduped.length, 2);
    assert.equal(deduped[0]?.id, 'n2');
    assert.equal(deduped[1]?.id, 'n3');
  });
});
