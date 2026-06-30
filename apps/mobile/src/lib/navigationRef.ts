import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { PushNavigationTarget } from './pushNotifications';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateFromPushTarget(target: PushNavigationTarget): void {
  if (!navigationRef.isReady()) return;

  switch (target.type) {
    case 'conversation':
      navigationRef.navigate(
        'Main' as never,
        {
          screen: 'InboxTab',
          params: {
            screen: 'ConversationThread',
            params: {
              conversationId: target.conversationId,
              contactId: target.contactId,
            },
          },
        } as never,
      );
      return;
    case 'task':
      navigationRef.navigate(
        'Main' as never,
        {
          screen: 'AppsTab',
          params: {
            screen: 'TaskForm',
            params: {
              taskId: target.taskId,
              contactId: target.contactId,
            },
          },
        } as never,
      );
      return;
    case 'appointment':
      navigationRef.navigate(
        'Main' as never,
        {
          screen: 'CalendarTab',
          params: {
            screen: 'AppointmentDetail',
            params: {
              eventId: target.appointmentId,
            },
          },
        } as never,
      );
      return;
    default:
      return;
  }
}

/** @deprecated Use navigateFromPushTarget */
export function navigateToConversationFromPush(params: {
  conversationId: string;
  contactId?: string;
}): void {
  navigateFromPushTarget({
    type: 'conversation',
    conversationId: params.conversationId,
    contactId: params.contactId,
  });
}
