import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api, withAuthHeaders } from './api';

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
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
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

export function extractConversationPushData(
  data: Record<string, unknown> | undefined,
): { conversationId: string; contactId?: string } | null {
  if (!data || data.type !== 'conversation') return null;
  const conversationId =
    typeof data.conversationId === 'string' ? data.conversationId.trim() : '';
  if (!conversationId) return null;
  const contactId = typeof data.contactId === 'string' ? data.contactId.trim() : undefined;
  return { conversationId, contactId: contactId || undefined };
}
