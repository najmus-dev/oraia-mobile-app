import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppState } from '../state/AppState';
import { emitNotificationRefresh } from '../lib/notificationEvents';
import {
  extractPushNavigationTarget,
  registerForPushNotificationsAsync,
  syncPushTokenWithApi,
  unregisterPushTokenFromApi,
} from '../lib/pushNotifications';
import { navigateFromPushTarget } from '../lib/navigationRef';

type RegisteredPush = {
  pushToken: string;
  authToken: string;
  locationId: string;
};

function openFromNotification(data: Record<string, unknown> | undefined) {
  const target = extractPushNavigationTarget(data);
  if (!target) return;
  navigateFromPushTarget(target);
}

export function usePushNotifications(): void {
  const { token, locationId } = useAppState();
  const registeredRef = useRef<RegisteredPush | null>(null);

  useEffect(() => {
    if (!token || !locationId) {
      const prev = registeredRef.current;
      if (prev) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        unregisterPushTokenFromApi(prev.pushToken, prev.authToken, prev.locationId);
        registeredRef.current = null;
      }
      return;
    }

    let alive = true;
    (async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (!alive || !pushToken) return;
        await syncPushTokenWithApi(pushToken, token, locationId);
        registeredRef.current = { pushToken, authToken: token, locationId };
      } catch {
        // permissions denied or simulator — surfaced via missing badge updates only
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, locationId]);

  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      openFromNotification(last.notification.request.content.data as Record<string, unknown>);
    }

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response.notification.request.content.data as Record<string, unknown>);
    });

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      emitNotificationRefresh();
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);
}
