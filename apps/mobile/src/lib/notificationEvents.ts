type NotificationRefreshListener = () => void;

const listeners = new Set<NotificationRefreshListener>();

/** Fired when a push notification is received (foreground/background). */
export function subscribeNotificationRefresh(listener: NotificationRefreshListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitNotificationRefresh(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // listener errors must not break delivery
    }
  }
}
