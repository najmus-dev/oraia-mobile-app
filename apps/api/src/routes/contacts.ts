import { Router } from 'express';
import { AppError } from '../lib/errors';
import { validateContactCreateBody } from '../lib/contactValidation';
import {
  decodeSmartListFilter,
  parseSmartListRecords,
  parseTagRecords,
  type NormalizedSmartList,
} from '../lib/contactSmartLists';
import { mapGhlTasks } from '../lib/taskMapping';
import { enrichTaskContext } from '../lib/taskEnrichment';
import { param } from '../lib/params';
import { locationDelete, locationGet, locationPost, locationPut } from '../middleware/locationRoute';
import { getLocationGhlClient } from '../services/tokenVault';
import type { GhlContact } from '../services/ghl/types';

export const contactsRouter = Router();

function mapContact(c: GhlContact) {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    name: c.name,
    email: c.email,
    phone: c.phone,
    companyName: c.companyName,
    timezone: c.timezone,
    type: c.type,
    tags: c.tags,
    assignedTo: c.assignedTo,
    website: c.website,
    address1: c.address1,
    city: c.city,
    state: c.state,
    country: c.country,
    postalCode: c.postalCode,
    dnd: c.dnd,
    dndSettings: c.dndSettings,
    dateAdded: c.dateAdded,
    dateUpdated: c.dateUpdated,
  };
}

async function resolveTagName(locationId: string, tagId: string): Promise<string | undefined> {
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.listLocationTags(locationId);
  return (data.tags ?? []).find((t) => t.id === tagId)?.name?.trim();
}

async function loadSmartListOptions(locationId: string) {
  const ghl = getLocationGhlClient(locationId);
  const [smartListRaw, tagsData] = await Promise.all([
    ghl.listSmartLists(locationId),
    ghl.listLocationTags(locationId),
  ]);

  const smartLists = parseSmartListRecords(smartListRaw);
  const tagLists = parseTagRecords(tagsData.tags ?? []);

  const lists: NormalizedSmartList[] = [
    { id: 'all', name: 'All Contacts', source: 'all' },
  ];
  if (smartLists.length > 0) {
    lists.push(...smartLists);
  } else {
    // GHL smart lists are not public via API — fall back to tag segments for filtering.
    lists.push(...tagLists);
  }

  lists.sort((a, b) => {
    if (a.id === 'all') return -1;
    if (b.id === 'all') return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return {
    lists,
    usesTagsFallback: smartLists.length === 0 && tagLists.length > 0,
  };
}

locationGet(contactsRouter, '/smart-lists', async (req, res) => {
  const locationId = req.locationId!;
  const { lists, usesTagsFallback } = await loadSmartListOptions(locationId);
  res.json({ locationId, lists, usesTagsFallback });
});

/** @deprecated use /smart-lists */
locationGet(contactsRouter, '/tags', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.listLocationTags(locationId);
  const tags = (data.tags ?? []).map((t) => ({
    id: t.id,
    name: t.name,
  }));
  res.json({ locationId, tags });
});

locationGet(contactsRouter, '/', async (req, res) => {
  const locationId = req.locationId!;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const query = typeof req.query.query === 'string' ? req.query.query : undefined;
  const filterId = typeof req.query.filterId === 'string' ? req.query.filterId : 'all';
  const page = Math.max(Number(req.query.page) || 1, 1);
  const startAfterId =
    typeof req.query.startAfterId === 'string' ? req.query.startAfterId : undefined;
  const startAfterRaw = req.query.startAfter;
  const startAfter =
    typeof startAfterRaw === 'string' && startAfterRaw.trim()
      ? Number(startAfterRaw)
      : typeof startAfterRaw === 'number'
        ? startAfterRaw
        : undefined;

  const ghl = getLocationGhlClient(locationId);
  const filter = decodeSmartListFilter(filterId);

  if (filter.source === 'smartList' && filter.value) {
    const data = await ghl.searchContacts(locationId, {
      smartListId: filter.value,
      query,
      pageLimit: limit,
      page,
    });
    const contacts = data.contacts ?? [];
    const total = data.total ?? contacts.length;
    res.json({
      locationId,
      contacts: contacts.map(mapContact),
      meta: {
        total,
        page,
        pageLimit: limit,
        hasMore: page * limit < total,
      },
    });
    return;
  }

  if (filter.source === 'tag' && filter.value) {
    const tagName = await resolveTagName(locationId, filter.value);
    if (!tagName) {
      res.json({
        locationId,
        contacts: [],
        meta: { total: 0, page, pageLimit: limit, hasMore: false },
      });
      return;
    }

    const data = await ghl.searchContacts(locationId, {
      query,
      pageLimit: limit,
      page,
      filters: [{ field: 'tags', operator: 'eq', value: tagName }],
    });
    const contacts = data.contacts ?? [];
    const total = data.total ?? contacts.length;
    res.json({
      locationId,
      contacts: contacts.map(mapContact),
      meta: {
        total,
        page,
        pageLimit: limit,
        hasMore: page * limit < total,
      },
    });
    return;
  }

  const data = await ghl.listContacts(locationId, {
    limit,
    query,
    startAfterId,
    startAfter: Number.isFinite(startAfter) ? startAfter : undefined,
  });
  res.json({
    locationId,
    contacts: (data.contacts ?? []).map(mapContact),
    meta: data.meta ?? { total: data.contacts?.length ?? 0 },
  });
});

locationGet(contactsRouter, '/:contactId/notes', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.listContactNotes(contactId, locationId);
  const raw = data.notes ?? (Array.isArray(data) ? data : []);
  const notes = (raw as Array<Record<string, unknown>>).map((n) => ({
    id: String(n.id ?? ''),
    body: typeof n.body === 'string' ? n.body : undefined,
    dateAdded: typeof n.dateAdded === 'string' ? n.dateAdded : undefined,
    userId: typeof n.userId === 'string' ? n.userId : undefined,
  })).filter((n) => n.id);
  res.json({ locationId, contactId, notes });
});

locationGet(contactsRouter, '/:contactId/tasks', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.listContactTasks(contactId);
  const rawTasks = data.tasks ?? [];
  const { assigneeNames, contactNames } = await enrichTaskContext(locationId, rawTasks);
  res.json({
    locationId,
    contactId,
    tasks: mapGhlTasks(rawTasks, assigneeNames, contactNames),
  });
});

locationPost(contactsRouter, '/:contactId/notes', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const body = req.body as Record<string, unknown>;
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    throw new AppError(400, 'body is required', 'VALIDATION_ERROR');
  }
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.createContactNote(contactId, locationId, text);
  const note = data.note as Record<string, unknown> | undefined;
  res.status(201).json({
    locationId,
    contactId,
    note: note
      ? {
          id: String(note.id ?? ''),
          body: typeof note.body === 'string' ? note.body : text,
          dateAdded: typeof note.dateAdded === 'string' ? note.dateAdded : undefined,
        }
      : { id: '', body: text },
  });
});

locationGet(contactsRouter, '/:contactId', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  const contact = await ghl.getContact(param(req.params, 'contactId'), locationId);
  res.json({ locationId, contact: mapContact(contact) });
});

locationPost(contactsRouter, '/', async (req, res) => {
  const locationId = req.locationId!;
  let body: Record<string, unknown>;
  try {
    body = validateContactCreateBody(req.body) as Record<string, unknown>;
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid contact body',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  const contact = await ghl.createContact(locationId, body);
  res.status(201).json({ locationId, contact: mapContact(contact) });
});

locationPut(contactsRouter, '/:contactId', async (req, res) => {
  const locationId = req.locationId!;
  let body: Record<string, unknown>;
  try {
    body = validateContactCreateBody(req.body, true) as Record<string, unknown>;
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid contact body',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  const contact = await ghl.updateContact(
    param(req.params, 'contactId'),
    locationId,
    body,
  );
  res.json({ locationId, contact: mapContact(contact) });
});

locationDelete(contactsRouter, '/:contactId', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  await ghl.deleteContact(param(req.params, 'contactId'), locationId);
  res.status(204).send();
});
