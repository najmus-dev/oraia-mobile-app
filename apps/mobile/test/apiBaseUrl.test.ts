import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveHydratedApiBaseUrl,
  shouldReplaceStoredApiUrl,
} from '../src/lib/apiBaseUrl';

describe('api base URL', () => {
  it('prefers locked build URL over stored dev URL', () => {
    assert.equal(
      resolveHydratedApiBaseUrl('http://192.168.1.5:3000', 'https://api.oraiacrm.com/'),
      'https://api.oraiacrm.com',
    );
  });

  it('uses stored URL when build URL is not locked', () => {
    assert.equal(
      resolveHydratedApiBaseUrl('http://192.168.1.5:3000', null, 'http://10.0.2.2:3000'),
      'http://192.168.1.5:3000',
    );
  });

  it('does not replace LAN stored URLs', () => {
    assert.equal(
      shouldReplaceStoredApiUrl('http://192.168.1.5:3000', 'http://192.168.1.5:3000'),
      false,
    );
  });
});
