import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { userDisplayName, userInitials } from '../src/lib/userDisplay';

describe('userDisplay', () => {
  it('formats email local part as display name', () => {
    assert.equal(userDisplayName('najam@oraia.biz'), 'Najam');
    assert.equal(userDisplayName('najmus.saqib@oraia.biz'), 'Najmus Saqib');
  });

  it('builds initials from display name', () => {
    assert.equal(userInitials('najmus.saqib@oraia.biz'), 'NS');
  });
});
