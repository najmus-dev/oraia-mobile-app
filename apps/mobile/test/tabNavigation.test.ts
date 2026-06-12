import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTabStackResetRoutes,
  shouldResetTabStackToRoot,
} from '../src/navigation/tabStackReset';

describe('tab navigation reset', () => {
  it('does not reset when already on tab root', () => {
    assert.equal(
      shouldResetTabStackToRoot({ index: 0, routes: [{ name: 'AppsHome' }] }, 'AppsHome'),
      false,
    );
  });

  it('resets when apps stack is on a nested screen', () => {
    assert.equal(
      shouldResetTabStackToRoot(
        { index: 1, routes: [{ name: 'AppsHome' }, { name: 'ContactDetail' }] },
        'AppsHome',
      ),
      true,
    );
  });

  it('resets when root screen is not focused at index 0', () => {
    assert.equal(
      shouldResetTabStackToRoot({ index: 0, routes: [{ name: 'ContactsList' }] }, 'AppsHome'),
      true,
    );
  });

  it('resets when edit contact left a deep stack', () => {
    assert.equal(
      shouldResetTabStackToRoot(
        {
          index: 3,
          routes: [
            { name: 'AppsHome' },
            { name: 'ContactsList' },
            { name: 'ContactDetail' },
            { name: 'ContactForm' },
          ],
        },
        'AppsHome',
      ),
      true,
    );
  });

  it('does not reset when nested stack state is missing', () => {
    assert.equal(shouldResetTabStackToRoot(undefined, 'AppsHome'), false);
  });

  it('buildTabStackResetRoutes collapses apps tab to AppsHome', () => {
    const next = buildTabStackResetRoutes(
      [
        { name: 'HomeTab' },
        {
          name: 'AppsTab',
          state: {
            index: 2,
            routes: [
              { name: 'AppsHome' },
              { name: 'ContactsList' },
              { name: 'ContactForm' },
            ],
          },
        },
      ],
      'AppsTab',
      'AppsHome',
    );
    assert.deepEqual(next?.[1], {
      name: 'AppsTab',
      state: { routes: [{ name: 'AppsHome' }], index: 0 },
    });
  });
});
