/**
 * Throttle + queue for unread push polls.
 * Dropping a request while a poll is in-flight previously missed webhook wakeups.
 */
export type PushPollGateState = {
  lastStartedAt: number;
  inFlight: boolean;
  pendingSource: string | null;
};

export function createPushPollGateState(): PushPollGateState {
  return { lastStartedAt: 0, inFlight: false, pendingSource: null };
}

export type PushPollGateDecision =
  | { action: 'start'; source: string }
  | { action: 'queue'; source: string }
  | { action: 'skip'; reason: 'throttled' | 'duplicate_pending' };

export function decidePushPollStart(
  state: PushPollGateState,
  source: string,
  now: number,
  minGapMs: number,
): PushPollGateDecision {
  if (state.inFlight) {
    state.pendingSource = source;
    return { action: 'queue', source };
  }
  if (now - state.lastStartedAt < minGapMs && state.lastStartedAt > 0) {
    // Still queue a follow-up so webhook/health wakes are not lost after the gap.
    state.pendingSource = source;
    return { action: 'queue', source };
  }
  state.lastStartedAt = now;
  state.inFlight = true;
  state.pendingSource = null;
  return { action: 'start', source };
}

export function finishPushPoll(
  state: PushPollGateState,
): { action: 'start'; source: string } | { action: 'idle' } {
  state.inFlight = false;
  const pending = state.pendingSource;
  if (!pending) return { action: 'idle' };
  state.pendingSource = null;
  state.lastStartedAt = Date.now();
  state.inFlight = true;
  return { action: 'start', source: pending };
}
