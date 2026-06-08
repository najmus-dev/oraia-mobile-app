import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchGhlUserByEmail } from '../src/services/ghlUserResolver';

describe('matchGhlUserByEmail', () => {
  it('matches email case-insensitively', () => {
    const match = matchGhlUserByEmail(
      [{ id: 'u1', email: 'Agent@Example.com' }],
      'agent@example.com',
    );
    assert.equal(match?.id, 'u1');
  });

  it('returns undefined when no exact email match', () => {
    const match = matchGhlUserByEmail([{ id: 'u1', email: 'other@example.com' }], 'agent@example.com');
    assert.equal(match, undefined);
  });
});
