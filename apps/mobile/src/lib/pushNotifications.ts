import { Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api, withAuthHeaders } from './api';

export type { PushNavigationTarget } from './pushNavigation';
export { extractConversationPushData, extractPushNavigationTarget } from './pushNavigation';

const ANDROID_CHANNELS: { id: string; name: string }[] = [
  { id: 'messages', name: 'Messages' },
  { id: 'calls', name: 'Calls' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'appointments', name: 'Appointments' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function remotePushUnavailableMessage(): string | null {
  if (isExpoGo()) {
    return 'Expo Go cannot receive SMS or call alerts. Install the Oraia preview APK (EAS build) to test notifications.';
  }
  if (!Device.isDevice) {
    return 'Use a physical phone. Emulators do not receive push alerts.';
  }
  return null;
}

export async function openAppNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // device may not support settings deep link
  }
}

export async function registerForPushNotificationsAsync(): Promise<string> {
  const blocked = remotePushUnavailableMessage();
  if (blocked) {
    throw new Error(blocked);
  }

  if (Platform.OS === 'android') {
    for (const channel of ANDROID_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    throw new Error(
      'Notifications are turned off for Oraia. Open Android Settings → Apps → ORAIA CRM → Notifications, turn them on, then try again.',
    );
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('Missing Expo project ID. Rebuild the preview APK.');
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token?.data) {
      throw new Error('This phone did not return a push token.');
    }
    return token.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/fcm|firebase|google.?services|credentials|sender/i.test(message)) {
      throw new Error(
        'Android push is not configured (Firebase FCM). Add google-services.json and rebuild the APK.',
      );
    }
    throw new Error(`Could not register this phone for alerts. ${message}`);
  }
}

export async function syncPushTokenWithApi(
  pushToken: string,
  authToken: string,
  locationId: string,
): Promise<void> {
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  await api.postJson(
    '/api/push-tokens/register',
    {
      token: pushToken,
      platform,
      deviceName: Device.modelName ?? Device.deviceName ?? undefined,
    },
    { headers: withAuthHeaders({ token: authToken, locationId }) },
  );
}

export async function sendTestPushToApi(authToken: string, locationId: string): Promise<number> {
  const res = await api.postJson<{ sent?: number }>(
    '/api/push-tokens/test',
    {},
    { headers: withAuthHeaders({ token: authToken, locationId }) },
  );
  return res.sent ?? 0;
}

export async function unregisterPushTokenFromApi(
  pushToken: string,
  authToken: string,
  locationId: string,
): Promise<void> {
  try {
    await api.postJson(
      '/api/push-tokens/unregister',
      { token: pushToken },
      { headers: withAuthHeaders({ token: authToken, locationId }) },
    );
  } catch {
    // best effort on sign-out
  }
}

