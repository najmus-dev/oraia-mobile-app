import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNotificationsQuery,
  formatNotificationTime,
  notificationTypeIcon,
} from '../src/lib/notificationFeedUtils';

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

  it('formats relative time', () => {
    const recent = formatNotificationTime(new Date().toISOString());
    assert.equal(recent, 'Just now');
  });
});
