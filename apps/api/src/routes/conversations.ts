import { Router } from 'express';
import multer from 'multer';
import { enrichConversationAssignees } from '../lib/conversationEnrichment';
import { AppError } from '../lib/errors';
import { extractUploadedAttachmentUrls } from '../lib/attachmentUrls';
import { parseMessageAttachments } from '../lib/parseMessageAttachments';
import { param } from '../lib/params';
import { locationGet, locationPost, locationPostWith, locationPut } from '../middleware/locationRoute';
import { getLocationGhlClient } from '../services/tokenVault';

export const conversationsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function mapConversation(
  c: {
    id: string;
    contactId?: string;
    contactName?: string;
    fullName?: string;
    lastMessageBody?: string;
    lastMessageDate?: string;
    lastMessageType?: string;
    unreadCount?: number;
    starred?: boolean;
    assignedTo?: string;
  },
  assigneeNames?: Map<string, string>,
) {
  const assignedTo = typeof c.assignedTo === 'string' ? c.assignedTo.trim() : undefined;
  return {
    id: c.id,
    contactId: c.contactId,
    contactName: c.contactName ?? c.fullName,
    lastMessageBody: c.lastMessageBody,
    lastMessageDate: c.lastMessageDate,
    lastMessageType: c.lastMessageType,
    unreadCount: c.unreadCount,
    starred: c.starred,
    assignedTo,
    assignedToName: assignedTo ? assigneeNames?.get(assignedTo) : undefined,
  };
}

locationGet(conversationsRouter, '/phone-numbers', async (req, res, next) => {
  const locationId = req.locationId!;
  const searchFilter = typeof req.query.search === 'string' ? req.query.search : undefined;
  const ghl = getLocationGhlClient(locationId);
  try {
    const data = await ghl.listActivePhoneNumbers(locationId, { searchFilter });
    const raw = data.numbers ?? (Array.isArray(data) ? data : []);
    const numbers = (raw as Array<Record<string, unknown>>).map((n, idx) => {
      const phone =
        (typeof n.phoneNumber === 'string' && n.phoneNumber) ||
        (typeof n.number === 'string' && n.number) ||
        (typeof n.phone === 'string' && n.phone) ||
        '';
      return {
        id: String(n.id ?? phone ?? idx),
        phoneNumber: phone,
        friendlyName: typeof n.friendlyName === 'string' ? n.friendlyName : undefined,
        isDefault: Boolean(n.isDefault ?? n.default),
        assignedTo: typeof n.assignedTo === 'string' ? n.assignedTo : undefined,
        label: typeof n.name === 'string' ? n.name : undefined,
      };
    }).filter((n) => n.phoneNumber);
    res.json({ locationId, numbers });
  } catch (err) {
    next(err);
  }
});

locationGet(conversationsRouter, '/lookup', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = typeof req.query.contactId === 'string' ? req.query.contactId.trim() : '';
  if (!contactId) {
    throw new AppError(400, 'contactId is required', 'VALIDATION_ERROR');
  }
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.searchConversations(locationId, { contactId, limit: 5 });
  const match = (data.conversations ?? []).find((c) => c.contactId === contactId) ?? data.conversations?.[0];
  const assigneeIds = match?.assignedTo ? [match.assignedTo] : [];
  const assigneeNames = await enrichConversationAssignees(locationId, assigneeIds);
  res.json({
    locationId,
    conversation: match ? mapConversation(match, assigneeNames) : null,
  });
});

locationGet(conversationsRouter, '/', async (req, res) => {
  const locationId = req.locationId!;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';
  const allowed = new Set(['all', 'read', 'unread', 'starred', 'recents']);
  const status = allowed.has(rawStatus) ? rawStatus : undefined;
  const query = typeof req.query.query === 'string' ? req.query.query : undefined;
  const contactId = typeof req.query.contactId === 'string' ? req.query.contactId : undefined;
  const assignedTo =
    typeof req.query.assignedTo === 'string' && req.query.assignedTo.trim()
      ? req.query.assignedTo.trim()
      : undefined;
  const startAfterDate =
    typeof req.query.startAfterDate === 'string' && req.query.startAfterDate.trim()
      ? req.query.startAfterDate.trim()
      : undefined;
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.searchConversations(locationId, {
    limit,
    status,
    query,
    contactId,
    assignedTo,
    startAfterDate,
  });
  const raw = data.conversations ?? [];
  const assigneeIds = raw
    .map((c) => c.assignedTo)
    .filter((id): id is string => Boolean(id?.trim()));
  const assigneeNames = await enrichConversationAssignees(locationId, assigneeIds);
  const last = raw[raw.length - 1];
  res.json({
    locationId,
    conversations: raw.map((c) => mapConversation(c, assigneeNames)),
    total: data.total,
    nextStartAfterDate:
      raw.length >= limit && last?.lastMessageDate ? last.lastMessageDate : undefined,
  });
});

locationPut(conversationsRouter, '/:conversationId', async (req, res) => {
  const locationId = req.locationId!;
  const conversationId = param(req.params, 'conversationId');
  const body = req.body as Record<string, unknown>;
  const patch: { unreadCount?: number; starred?: boolean } = {};
  if (typeof body.unreadCount === 'number' && Number.isFinite(body.unreadCount)) {
    patch.unreadCount = Math.max(0, Math.floor(body.unreadCount));
  }
  if (typeof body.starred === 'boolean') patch.starred = body.starred;
  if (Object.keys(patch).length === 0) {
    throw new AppError(400, 'unreadCount or starred is required', 'VALIDATION_ERROR');
  }
  const ghl = getLocationGhlClient(locationId);
  const result = await ghl.updateConversation(conversationId, locationId, patch);
  res.json({ locationId, conversationId, result });
});

locationPostWith(
  conversationsRouter,
  '/attachments',
  [upload.single('file')],
  async (req, res) => {
    const locationId = req.locationId!;
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new AppError(400, 'file is required (max 5 MB)', 'VALIDATION_ERROR');
    }
    const contactId =
      typeof req.body?.contactId === 'string' ? req.body.contactId.trim() : '';
    const conversationId =
      typeof req.body?.conversationId === 'string' ? req.body.conversationId.trim() : '';
    if (!contactId && !conversationId) {
      throw new AppError(400, 'contactId or conversationId is required', 'VALIDATION_ERROR');
    }
    const ghl = getLocationGhlClient(locationId);
    const result = await ghl.uploadMessageAttachment(
      locationId,
      { contactId: contactId || undefined, conversationId: conversationId || undefined },
      {
        buffer: file.buffer,
        filename: file.originalname || 'attachment.jpg',
        mimeType: file.mimetype || 'application/octet-stream',
      },
    );
    const urls = extractUploadedAttachmentUrls(result);
    res.status(201).json({ locationId, urls });
  },
);

locationGet(conversationsRouter, '/:conversationId/messages', async (req, res) => {
  const locationId = req.locationId!;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const lastMessageId =
    typeof req.query.lastMessageId === 'string' ? req.query.lastMessageId.trim() : undefined;
  const ghl = getLocationGhlClient(locationId);
  const conversationId = param(req.params, 'conversationId');
  const data = await ghl.getConversationMessages(conversationId, locationId, {
    limit,
    lastMessageId: lastMessageId || undefined,
  });
  const nested = data.messages;
  const list = nested?.messages ?? [];
  res.json({
    locationId,
    conversationId,
    messages: list.map((m) => ({
      id: m.id,
      body: m.body,
      direction: m.direction,
      status: m.status,
      messageType: m.messageType,
      dateAdded: m.dateAdded,
      contactId: m.contactId,
      attachments: parseMessageAttachments(m.attachments),
    })),
    nextPage: nested?.nextPage,
    lastMessageId: nested?.lastMessageId,
  });
});

locationPost(conversationsRouter, '/messages', async (req, res) => {
  const locationId = req.locationId!;
  const body = req.body as Record<string, unknown>;
  if (!body.type || !body.contactId) {
    throw new AppError(400, 'type and contactId are required', 'VALIDATION_ERROR');
  }
  const messageText = typeof body.message === 'string' ? body.message.trim() : '';
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    : [];
  if (!messageText && attachments.length === 0) {
    throw new AppError(400, 'message or attachments is required', 'VALIDATION_ERROR');
  }
  const payload: Record<string, unknown> = {
    type: body.type,
    contactId: body.contactId,
    message: messageText || ' ',
  };
  if (typeof body.conversationId === 'string' && body.conversationId.trim()) {
    payload.conversationId = body.conversationId.trim();
  }
  if (typeof body.conversationProviderId === 'string' && body.conversationProviderId.trim()) {
    payload.conversationProviderId = body.conversationProviderId.trim();
  }
  if (attachments.length > 0) payload.attachments = attachments;
  const ghl = getLocationGhlClient(locationId);
  const result = await ghl.sendMessage(locationId, payload);
  const resultPayload = (result ?? {}) as Record<string, unknown>;
  res.status(201).json({
    locationId,
    conversationId:
      typeof resultPayload.conversationId === 'string' ? resultPayload.conversationId : undefined,
    messageId: typeof resultPayload.messageId === 'string' ? resultPayload.messageId : undefined,
    result,
  });
});
