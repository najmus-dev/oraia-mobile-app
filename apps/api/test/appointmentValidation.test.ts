import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validateAppointmentCreateBody,
  validateAppointmentUpdateBody,
} from '../src/lib/appointmentValidation';

const validPayload = {
  title: 'Consultation',
  calendarId: 'cal_1',
  contactId: 'con_1',
  startTime: '2026-06-10T14:00:00.000Z',
  endTime: '2026-06-10T15:00:00.000Z',
};

describe('validateAppointmentCreateBody', () => {
  it('accepts a valid payload', () => {
    const body = validateAppointmentCreateBody(validPayload);
    assert.equal(body.title, 'Consultation');
    assert.equal(body.contactId, 'con_1');
  });

  it('rejects missing contactId', () => {
    assert.throws(
      () =>
        validateAppointmentCreateBody({
          title: 'x',
          calendarId: 'c',
          startTime: validPayload.startTime,
          endTime: validPayload.endTime,
        }),
      /contactId is required/,
    );
  });

  it('rejects end before start', () => {
    assert.throws(
      () =>
        validateAppointmentCreateBody({
          ...validPayload,
          endTime: '2026-06-10T13:00:00.000Z',
        }),
      /endTime must be after startTime/,
    );
  });
});

describe('validateAppointmentUpdateBody', () => {
  it('allows missing contactId', () => {
    const body = validateAppointmentUpdateBody({
      title: 'Rescheduled',
      calendarId: 'cal_1',
      startTime: validPayload.startTime,
      endTime: validPayload.endTime,
    });
    assert.equal(body.contactId, undefined);
  });
});
