import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GhlCalendarEvent, GhlConversation, GhlOpportunity } from '../src/services/ghl/types';
import {
  listAllCalendarEvents,
  sumOpenPipelineValue,
  sumUnreadConversationCount,
} from '../src/lib/ghlAggregates';

function mockGhl(overrides: {
  calendars?: Array<{ id: string; name?: string }>;
  eventsByCalendar?: Record<string, GhlCalendarEvent[]>;
  conversations?: GhlConversation[][];
  opportunities?: GhlOpportunity[][];
}) {
  const eventsByCalendar = overrides.eventsByCalendar ?? {};
  return {
    listCalendars: async () => ({ calendars: overrides.calendars ?? [] }),
    listCalendarEvents: async (_locationId: string, params: { calendarId?: string }) => ({
      events: eventsByCalendar[params.calendarId ?? ''] ?? [],
    }),
    searchConversations: async (_locationId: string, params?: { startAfterDate?: string }) => {
      const pages = overrides.conversations ?? [[]];
      const idx = params?.startAfterDate ? 1 : 0;
      return { conversations: pages[idx] ?? [] };
    },
    searchOpportunities: async (_locationId: string, params?: { startAfterId?: string }) => {
      const pages = overrides.opportunities ?? [[]];
      const idx = params?.startAfterId ? 1 : 0;
      return { opportunities: pages[idx] ?? [] };
    },
  };
}

describe('ghlAggregates', () => {
  it('merges events from all calendars and dedupes by id', async () => {
    const ghl = mockGhl({
      calendars: [{ id: 'cal_a' }, { id: 'cal_b' }],
      eventsByCalendar: {
        cal_a: [{ id: 'e1', title: 'A' }],
        cal_b: [
          { id: 'e1', title: 'Dup' },
          { id: 'e2', title: 'B' },
        ],
      },
    });
    const events = await listAllCalendarEvents(ghl as never, 'loc_1', {
      startTime: '2026-06-08T00:00:00.000Z',
      endTime: '2026-06-08T23:59:59.999Z',
    });
    assert.equal(events.length, 2);
    assert.deepEqual(events.map((e) => e.id).sort(), ['e1', 'e2']);
  });

  it('sums unread counts from conversations', async () => {
    const ghl = mockGhl({
      conversations: [
        [
          { id: 'c1', unreadCount: 2 },
          { id: 'c2', unreadCount: 1 },
          { id: 'c3', unreadCount: 3 },
        ],
      ],
    });
    const total = await sumUnreadConversationCount(ghl as never, 'loc_1');
    assert.equal(total, 6);
  });

  it('sums open pipeline value', async () => {
    const ghl = mockGhl({
      opportunities: [
        [
          { id: 'o1', name: 'A', monetaryValue: 100 },
          { id: 'o2', name: 'B', monetaryValue: 50 },
          { id: 'o3', name: 'C', monetaryValue: 25 },
        ],
      ],
    });
    const total = await sumOpenPipelineValue(ghl as never, 'loc_1');
    assert.equal(total, 175);
  });
});
