import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  contactDisplayName,
  formatContactClipboardText,
  contactInitials,
  contactMatchesTag,
  contactToFormValues,
  formValuesToPayload,
  validateContactForm,
  emptyContactFormValues,
  usesPageBasedContactPagination,
} from '../src/lib/contacts';

describe('contactDisplayName', () => {
  it('prefers explicit name', () => {
    assert.equal(contactDisplayName({ name: 'ORAIA CRM', firstName: 'A' }), 'ORAIA CRM');
  });

  it('builds from first and last name', () => {
    assert.equal(contactDisplayName({ firstName: 'Jane', lastName: 'Doe' }), 'Jane Doe');
  });

  it('falls back to Unnamed', () => {
    assert.equal(contactDisplayName({}), 'Unnamed');
  });
});

describe('formatContactClipboardText', () => {
  it('joins name, phone, and email on separate lines', () => {
    assert.equal(
      formatContactClipboardText({
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 (555) 555-0100',
        email: 'jane@example.com',
      }),
      'Jane Doe\n+1 (555) 555-0100\njane@example.com',
    );
  });

  it('omits empty fields', () => {
    assert.equal(
      formatContactClipboardText({ firstName: 'Sam', lastName: 'Lee' }),
      'Sam Lee',
    );
  });
});

describe('contactInitials', () => {
  it('uses name initials', () => {
    assert.equal(contactInitials({ firstName: 'Rovin', lastName: 'Mahadeo' }), 'RM');
  });

  it('uses phone digits when unnamed', () => {
    assert.equal(contactInitials({ phone: '+16721234567' }), '67');
  });
});

describe('contactMatchesTag', () => {
  it('matches tag case-insensitively', () => {
    assert.equal(contactMatchesTag({ id: '1', tags: ['Brokers'] }, 'brokers'), true);
  });
});

describe('usesPageBasedContactPagination', () => {
  it('uses page pagination for filtered lists only', () => {
    assert.equal(usesPageBasedContactPagination('all'), false);
    assert.equal(usesPageBasedContactPagination('tag:t1'), true);
    assert.equal(usesPageBasedContactPagination('smart:abc'), true);
  });
});

describe('validateContactForm', () => {
  it('requires at least one identifier field', () => {
    assert.match(
      validateContactForm({
        ...emptyContactFormValues(),
        companyName: 'Acme',
      }) ?? '',
      /at least/i,
    );
  });

  it('requires first name when configured', () => {
    assert.match(
      validateContactForm(emptyContactFormValues(), { requireFirstName: true }) ?? '',
      /first name/i,
    );
  });

  it('accepts phone only', () => {
    assert.equal(
      validateContactForm({
        ...emptyContactFormValues(),
        phone: '(555) 010-0123',
      }),
      null,
    );
  });

  it('rejects invalid email', () => {
    assert.match(
      validateContactForm({
        ...emptyContactFormValues(),
        email: 'not-an-email',
      }) ?? '',
      /valid email/i,
    );
  });
});

describe('formValuesToPayload', () => {
  it('omits empty optional fields and maps type/timezone/dnd', () => {
    const payload = formValuesToPayload(
      contactToFormValues({
        id: '1',
        firstName: 'Jane',
        lastName: '',
        email: 'jane@example.com',
        phone: '+15551234567',
        timezone: 'America/New_York',
        type: 'lead',
        dnd: true,
      }),
    );
    assert.equal(payload.firstName, 'Jane');
    assert.equal(payload.email, 'jane@example.com');
    assert.equal(payload.phone, '+15551234567');
    assert.equal(payload.timezone, 'America/New_York');
    assert.equal(payload.type, 'lead');
    assert.equal(payload.dnd, true);
  });

  it('formats entered phone numbers for the API', () => {
    const payload = formValuesToPayload({
      ...emptyContactFormValues(),
      firstName: 'Jane',
      phone: '(555) 123-4567',
      phoneCountryCode: '+1',
    });
    assert.equal(payload.phone, '+15551234567');
  });
});
