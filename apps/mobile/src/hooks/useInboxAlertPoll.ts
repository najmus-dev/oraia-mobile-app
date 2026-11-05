import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppState } from '../state/AppState';
import { fetchNotifications } from '../lib/notificationFeed';
import { emitNotificationRefresh } from '../lib/notificationEvents';

const POLL_MS = 15_000;
const seenByLocation = new Map<string, Set<string>>();
const primedByLocation = new Map<string, boolean>();

function seenSetFor(locationId: string): Set<string> {
  let set = seenByLocation.get(locationId);
  if (!set) {
    set = new Set();
    seenByLocation.set(locationId, set);
  }
  return set;
}

/**
 * While the app is open, sync the notifications API and raise a local banner for new rows.
 * This covers missed remote Expo pushes (Render cold start, FCM delay, etc.).
 */
export function useInboxAlertPoll(): void {
  const { token, locationId } = useAppState();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token || !locationId) return;

    let alive = true;
    const seenIds = seenSetFor(locationId);

    const poll = async (opts?: { announceNew?: boolean }) => {
      try {
        const res = await fetchNotifications(
          { token, locationId },
          { sync: true, forceSync: true, limit: 40 },
        );
        if (!alive) return;

        const primed = primedByLocation.get(locationId) === true;
        const incoming = res.notifications ?? [];
        const announce = opts?.announceNew !== false && primed;
        let announced = 0;
        for (const item of incoming) {
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);
          if (!announce) continue;
          if (item.status === 'read') continue;
          const ageMs = Date.now() - new Date(item.occurredAt || item.createdAt).getTime();
          if (Number.isFinite(ageMs) && ageMs > 2 * 60 * 60 * 1000) continue;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: true,
              data: {
                type: item.action.kind === 'conversation' ? 'conversation' : item.type,
                conversationId: item.action.conversationId ?? '',
                contactId: item.action.contactId ?? '',
                locationId,
              },
            },
            trigger: null,
          });
          announced += 1;
        }
        primedByLocation.set(locationId, true);
        if (announced > 0) emitNotificationRefresh();
      } catch (err) {
        console.warn('Inbox alert poll failed', err);
      }
    };

    const start = () => {
      if (timerRef.current) return;
      void poll({ announceNew: primedByLocation.get(locationId) === true });
      timerRef.current = setInterval(() => {
        void poll({ announceNew: true });
      }, POLL_MS);
    };

    const stop = () => {
      if (!timerRef.current) return;
      clearInterval(timerRef.current);
      timerRef.current = null;
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        start();
        void poll({ announceNew: true });
      } else {
        stop();
      }
    });

    return () => {
      alive = false;
      stop();
      sub.remove();
    };
  }, [token, locationId]);
}
