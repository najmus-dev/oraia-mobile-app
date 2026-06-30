import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api, withAuthHeaders } from './api';

export type PushNavigationTarget =
  | { type: 'conversation'; conversationId: string; contactId?: string }
  | { type: 'task'; taskId: string; contactId?: string }
  | { type: 'appointment'; appointmentId: string; contactId?: string };

const ANDROID_CHANNELS: { id: string; name: string }[] = [
  { id: 'messages', name: 'Messages' },
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

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    for (const channel of ANDROID_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
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
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
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

function readString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function extractPushNavigationTarget(
  data: Record<string, unknown> | undefined,
): PushNavigationTarget | null {
  if (!data) return null;
  const type = readString(data, 'type');

  if (type === 'conversation') {
    const conversationId = readString(data, 'conversationId');
    if (!conversationId) return null;
    return {
      type: 'conversation',
      conversationId,
      contactId: readString(data, 'contactId'),
    };
  }

  if (type === 'task') {
    const taskId = readString(data, 'taskId');
    if (!taskId) return null;
    return {
      type: 'task',
      taskId,
      contactId: readString(data, 'contactId'),
    };
  }

  if (type === 'appointment') {
    const appointmentId = readString(data, 'appointmentId');
    if (!appointmentId) return null;
    return {
      type: 'appointment',
      appointmentId,
      contactId: readString(data, 'contactId'),
    };
  }

  return null;
}

/** @deprecated Use extractPushNavigationTarget */
export function extractConversationPushData(
  data: Record<string, unknown> | undefined,
): { conversationId: string; contactId?: string } | null {
  const target = extractPushNavigationTarget(data);
  if (!target || target.type !== 'conversation') return null;
  return { conversationId: target.conversationId, contactId: target.contactId };
}
