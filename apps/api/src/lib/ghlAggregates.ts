import { normalizeConversationDate } from './conversationDates';
import type { GhlCalendarEvent, GhlConversation, GhlOpportunity } from '../services/ghl/types';
import type { GhlClient } from '../services/ghl/ghlClient';

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

function dedupeEventsById(events: GhlCalendarEvent[]): GhlCalendarEvent[] {
  const seen = new Set<string>();
  const out: GhlCalendarEvent[] = [];
  for (const event of events) {
    if (!event.id || seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }
  return out;
}

/** Fetches today's events across every calendar on the location. */
export async function listAllCalendarEvents(
  ghl: GhlClient,
  locationId: string,
  params: { startTime: string; endTime: string },
): Promise<GhlCalendarEvent[]> {
  const { calendars } = await ghl.listCalendars(locationId);
  const ids = (calendars ?? []).map((c) => c.id).filter(Boolean);
  if (ids.length === 0) return [];

  const batches = await Promise.all(
    ids.map((calendarId) =>
      ghl.listCalendarEvents(locationId, {
        startTime: params.startTime,
        endTime: params.endTime,
        calendarId,
      }),
    ),
  );
  return dedupeEventsById(batches.flatMap((b) => b.events ?? []));
}

/** Sums unread counts by paginating unread conversations only. */
export async function sumUnreadConversationCount(
  ghl: GhlClient,
  locationId: string,
): Promise<number> {
  let total = 0;
  let startAfterDate: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await ghl.searchConversations(locationId, {
      limit: PAGE_SIZE,
      status: 'unread',
      startAfterDate,
    });
    const batch = data.conversations ?? [];
    total += batch.reduce((sum, c: GhlConversation) => sum + (c.unreadCount ?? 0), 0);
    if (batch.length < PAGE_SIZE) break;
    const lastDate = normalizeConversationDate(batch[batch.length - 1]?.lastMessageDate);
    if (!lastDate || lastDate === startAfterDate) break;
    startAfterDate = lastDate;
  }

  return total;
}

/** Sums monetary value of all open opportunities (paginated). */
export async function sumOpenPipelineValue(
  ghl: GhlClient,
  locationId: string,
  opts?: { maxPages?: number },
): Promise<number> {
  let total = 0;
  let startAfterId: string | undefined;
  const maxPages = opts?.maxPages ?? MAX_PAGES;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await ghl.searchOpportunities(locationId, {
      limit: PAGE_SIZE,
      status: 'open',
      startAfterId,
    });
    const batch = data.opportunities ?? [];
    total += batch.reduce((sum, o: GhlOpportunity) => sum + (o.monetaryValue ?? 0), 0);
    if (batch.length < PAGE_SIZE) break;
    const lastId = batch[batch.length - 1]?.id;
    if (!lastId || lastId === startAfterId) break;
    startAfterId = lastId;
  }

  return total;
}
