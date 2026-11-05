import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createPushPollGateState,
  decidePushPollStart,
  finishPushPoll,
} from '../src/lib/pushPollGate';

describe('pushPollGate', () => {
  it('queues a follow-up instead of dropping while in flight', () => {
    const state = createPushPollGateState();
    const first = decidePushPollStart(state, 'health', 1_000, 20_000);
    assert.equal(first.action, 'start');

    const second = decidePushPollStart(state, 'webhook', 1_500, 20_000);
    assert.equal(second.action, 'queue');

    const next = finishPushPoll(state);
    assert.equal(next.action, 'start');
    if (next.action === 'start') assert.equal(next.source, 'webhook');
  });

  it('queues during throttle window so wakes are not lost', () => {
    const state = createPushPollGateState();
    decidePushPollStart(state, 'cron', 1_000, 20_000);
    finishPushPoll(state);

    const throttled = decidePushPollStart(state, 'health', 5_000, 20_000);
    assert.equal(throttled.action, 'queue');
  });
});
