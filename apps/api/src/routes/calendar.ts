import { Router } from 'express';
import { AppError } from '../lib/errors';
import { parseFreeSlotsQuery } from '../lib/calendarFreeSlots';
import { listAllCalendarEvents } from '../lib/ghlAggregates';
import {
  validateAppointmentCreateBody,
  validateAppointmentUpdateBody,
} from '../lib/appointmentValidation';
import { param } from '../lib/params';
import { locationDelete, locationGet, locationPost, locationPut } from '../middleware/locationRoute';
import { getLocationGhlClient } from '../services/tokenVault';

export const calendarRouter = Router();

function mapAppointment(a: {
  id?: string;
  title?: string;
  calendarId?: string;
  contactId?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
  address?: string;
  notes?: string;
}) {
  return {
    id: a.id,
    title: a.title,
    calendarId: a.calendarId,
    contactId: a.contactId,
    startTime: a.startTime,
    endTime: a.endTime,
    appointmentStatus: a.appointmentStatus,
    address: a.address,
    notes: a.notes,
  };
}

function unwrapAppointment(raw: unknown): ReturnType<typeof mapAppointment> {
  if (raw && typeof raw === 'object') {
    if ('appointment' in raw) {
      return mapAppointment(
        (raw as { appointment: Parameters<typeof mapAppointment>[0] }).appointment,
      );
    }
    if ('event' in raw) {
      return mapAppointment((raw as { event: Parameters<typeof mapAppointment>[0] }).event);
    }
  }
  return mapAppointment(raw as Parameters<typeof mapAppointment>[0]);
}

locationGet(calendarRouter, '/calendars', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.listCalendars(locationId);
  res.json({
    locationId,
    calendars: (data.calendars ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    })),
  });
});

locationGet(calendarRouter, '/calendars/:calendarId/free-slots', async (req, res) => {
  const locationId = req.locationId!;
  const calendarId = param(req.params, 'calendarId');
  let query: ReturnType<typeof parseFreeSlotsQuery>;
  try {
    query = parseFreeSlotsQuery(req.query as Record<string, unknown>);
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid free-slots query',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  const slots = await ghl.getFreeSlots(calendarId, query);
  res.json({ locationId, calendarId, slots });
});

locationGet(calendarRouter, '/events', async (req, res) => {
  const locationId = req.locationId!;
  const startTime = typeof req.query.startTime === 'string' ? req.query.startTime : undefined;
  const endTime = typeof req.query.endTime === 'string' ? req.query.endTime : undefined;
  if (!startTime || !endTime) {
    throw new AppError(400, 'startTime and endTime query params are required (ISO 8601)', 'VALIDATION_ERROR');
  }

  let calendarId = typeof req.query.calendarId === 'string' ? req.query.calendarId : undefined;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;

  const ghl = getLocationGhlClient(locationId);

  if (!calendarId && !userId && !groupId) {
    const events = await listAllCalendarEvents(ghl, locationId, { startTime, endTime });
    const { calendars } = await ghl.listCalendars(locationId);
    res.json({
      locationId,
      calendarId: null,
      calendars: (calendars ?? []).map((c) => ({ id: c.id, name: c.name })),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        calendarId: e.calendarId,
        contactId: e.contactId,
        startTime: e.startTime,
        endTime: e.endTime,
        appointmentStatus: e.appointmentStatus,
      })),
    });
    return;
  }

  const data = await ghl.listCalendarEvents(locationId, {
    startTime,
    endTime,
    calendarId,
    userId,
    groupId,
  });

  res.json({
    locationId,
    calendarId: calendarId ?? null,
    events: (data.events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      calendarId: e.calendarId,
      contactId: e.contactId,
      startTime: e.startTime,
      endTime: e.endTime,
      appointmentStatus: e.appointmentStatus,
    })),
  });
});

locationGet(calendarRouter, '/appointments/:eventId', async (req, res) => {
  const locationId = req.locationId!;
  const eventId = param(req.params, 'eventId');
  const ghl = getLocationGhlClient(locationId);
  const appointment = await ghl.getAppointment(eventId, locationId);
  res.json({ locationId, appointment: unwrapAppointment(appointment) });
});

locationPost(calendarRouter, '/appointments', async (req, res) => {
  const locationId = req.locationId!;
  let body: Record<string, unknown>;
  try {
    body = validateAppointmentCreateBody(req.body) as Record<string, unknown>;
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid appointment body',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  const created = await ghl.createAppointment(locationId, body);
  res.status(201).json({ locationId, appointment: unwrapAppointment(created) });
});

locationPut(calendarRouter, '/appointments/:eventId', async (req, res) => {
  const locationId = req.locationId!;
  const eventId = param(req.params, 'eventId');
  let body: Record<string, unknown>;
  try {
    body = validateAppointmentUpdateBody(req.body) as Record<string, unknown>;
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid appointment body',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  const updated = await ghl.updateAppointment(eventId, locationId, body);
  res.json({ locationId, appointment: unwrapAppointment(updated) });
});

locationDelete(calendarRouter, '/appointments/:eventId', async (req, res) => {
  const locationId = req.locationId!;
  const eventId = param(req.params, 'eventId');
  const ghl = getLocationGhlClient(locationId);
  await ghl.deleteCalendarEvent(eventId, locationId);
  res.status(204).send();
});
