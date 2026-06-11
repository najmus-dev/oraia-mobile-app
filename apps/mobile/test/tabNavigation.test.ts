import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** Mirrors createTabPressToRootListener reset decision for unit tests. */
function shouldResetTabToRoot(
  nestedState: { index?: number; routes: { name: string }[] } | undefined,
  rootScreen: string,
): boolean {
  if (!nestedState?.routes?.length) return false;
  const index = nestedState.index ?? 0;
  const focused = nestedState.routes[index]?.name;
  return !(index === 0 && focused === rootScreen);
}

describe('tab navigation reset', () => {
  it('does not reset when already on tab root', () => {
    assert.equal(
      shouldResetTabToRoot({ index: 0, routes: [{ name: 'AppsHome' }] }, 'AppsHome'),
      false,
    );
  });

  it('resets when apps stack is on a nested screen', () => {
    assert.equal(
      shouldResetTabToRoot(
        { index: 1, routes: [{ name: 'AppsHome' }, { name: 'ContactDetail' }] },
        'AppsHome',
      ),
      true,
    );
  });

  it('resets when root screen is not focused at index 0', () => {
    assert.equal(
      shouldResetTabToRoot({ index: 0, routes: [{ name: 'ContactsList' }] }, 'AppsHome'),
      true,
    );
  });
});
