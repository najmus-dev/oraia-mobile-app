export type WebhookTelemetrySnapshot = {
  lastReceivedAt: string | null;
  lastAcceptedAt: string | null;
  lastType: string | null;
  lastAction: string | null;
  lastError: string | null;
  receivedCount: number;
  acceptedCount: number;
};

const state: {
  lastReceivedAt: number | null;
  lastAcceptedAt: number | null;
  lastType: string | null;
  lastAction: string | null;
  lastError: string | null;
  receivedCount: number;
  acceptedCount: number;
} = {
  lastReceivedAt: null,
  lastAcceptedAt: null,
  lastType: null,
  lastAction: null,
  lastError: null,
  receivedCount: 0,
  acceptedCount: 0,
};

export function recordWebhookReceived(type: string): void {
  state.lastReceivedAt = Date.now();
  state.lastType = type || null;
  state.receivedCount += 1;
}

export function recordWebhookAccepted(type: string, action: string): void {
  state.lastAcceptedAt = Date.now();
  state.lastType = type || null;
  state.lastAction = action;
  state.lastError = null;
  state.acceptedCount += 1;
}

export function recordWebhookError(type: string, error: string): void {
  state.lastType = type || null;
  state.lastError = error.slice(0, 240);
}

export function getWebhookTelemetry(): WebhookTelemetrySnapshot {
  return {
    lastReceivedAt: state.lastReceivedAt ? new Date(state.lastReceivedAt).toISOString() : null,
    lastAcceptedAt: state.lastAcceptedAt ? new Date(state.lastAcceptedAt).toISOString() : null,
    lastType: state.lastType,
    lastAction: state.lastAction,
    lastError: state.lastError,
    receivedCount: state.receivedCount,
    acceptedCount: state.acceptedCount,
  };
}
