import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appointmentToFormValues,
  normalizeAppointment,
  validateAppointmentForm,
} from '../src/lib/appointments';

describe('validateAppointmentForm', () => {
  it('requires contactId on create', () => {
    assert.match(
      validateAppointmentForm(
        {
          title: 'Meet',
          contactId: '',
          calendarId: 'cal_1',
          startTime: '2026-06-10T14:00:00.000Z',
          endTime: '2026-06-10T15:00:00.000Z',
          notes: '',
        },
        'create',
      ) ?? '',
      /Select a contact/i,
    );
  });

  it('allows reschedule without contactId on update', () => {
    assert.equal(
      validateAppointmentForm(
        {
          title: 'Meet',
          contactId: '',
          calendarId: 'cal_1',
          startTime: '2026-06-10T14:00:00.000Z',
          endTime: '2026-06-10T15:00:00.000Z',
          notes: '',
        },
        'update',
      ),
      null,
    );
  });

  it('rejects phone number as contact id on create', () => {
    assert.match(
      validateAppointmentForm(
        {
          title: 'Meet',
          contactId: '+923157146610',
          calendarId: 'cal_1',
          startTime: '2026-06-10T14:00:00.000Z',
          endTime: '2026-06-10T15:00:00.000Z',
          notes: '',
        },
        'create',
      ) ?? '',
      /phone number/i,
    );
  });

  it('rejects invalid time range', () => {
    assert.match(
      validateAppointmentForm(
        {
          title: 'Meet',
          contactId: 'con_1',
          calendarId: 'cal_1',
          startTime: '2026-06-10T15:00:00.000Z',
          endTime: '2026-06-10T14:00:00.000Z',
          notes: '',
        },
        'create',
      ) ?? '',
      /after start/i,
    );
  });
});

describe('normalizeAppointment', () => {
  it('unwraps nested appointment', () => {
    const appt = normalizeAppointment({
      appointment: { id: 'evt_1', title: 'Call', startTime: '2026-06-10T14:00:00.000Z' },
    });
    assert.equal(appt.id, 'evt_1');
    assert.equal(appt.title, 'Call');
  });
});

describe('appointmentToFormValues', () => {
  it('maps appointment fields', () => {
    const values = appointmentToFormValues({
      id: 'evt_1',
      title: 'Review',
      calendarId: 'cal_1',
      contactId: 'con_1',
      startTime: '2026-06-10T14:00:00.000Z',
      endTime: '2026-06-10T15:00:00.000Z',
      notes: 'Bring docs',
    });
    assert.equal(values.title, 'Review');
    assert.equal(values.notes, 'Bring docs');
  });
});
