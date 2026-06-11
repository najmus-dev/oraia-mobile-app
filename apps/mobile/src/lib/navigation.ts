import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { getTabNavigation, navigateToTabScreen } from '../navigation/tabNavigation';
import type { MainTabParamList } from '../navigation/MainTabs';
import type { MessageChannel } from './conversations';

/** Open Apps tab → contact detail (from Inbox, Home, Search, etc.). */
export function navigateToContactDetail(
  navigation: NavigationProp<ParamListBase>,
  contactId: string,
): void {
  navigateToTabScreen(navigation, 'AppsTab', 'ContactDetail', { contactId });
}

/** Open Inbox tab → conversation thread for a contact. */
export function navigateToContactMessage(
  navigation: NavigationProp<ParamListBase>,
  params: {
    contactId: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    conversationId?: string;
    channel?: MessageChannel;
  },
): void {
  navigateToTabScreen(navigation, 'InboxTab', 'ConversationThread', {
    contactId: params.contactId,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
    conversationId: params.conversationId,
    channel: params.channel ?? (params.contactPhone?.trim() ? 'SMS' : 'Email'),
  });
}

/** Open Calendar tab → schedule appointment for a contact. */
export function navigateToScheduleForContact(
  navigation: NavigationProp<ParamListBase>,
  contact: { id: string; name: string; phone?: string; email?: string },
): void {
  navigateToTabScreen(navigation, 'CalendarTab', 'ScheduleAppointment', { contact });
}

import type { NotificationAction } from './notificationFeedTypes';

/** Open the screen linked to an in-app notification. */
export function navigateFromNotification(
  navigation: NavigationProp<ParamListBase>,
  action: NotificationAction,
): boolean {
  const tab = getTabNavigation(navigation);
  if (!tab) return false;

  switch (action.kind) {
    case 'conversation':
      if (!action.conversationId && !action.contactId) return false;
      navigateToTabScreen(navigation, 'InboxTab', 'ConversationThread', {
        conversationId: action.conversationId,
        contactId: action.contactId,
      });
      return true;
    case 'appointment':
      if (!action.appointmentId) return false;
      navigateToTabScreen(navigation, 'CalendarTab', 'AppointmentDetail', {
        eventId: action.appointmentId,
      });
      return true;
    case 'task':
      if (!action.taskId) return false;
      navigateToTabScreen(navigation, 'AppsTab', 'TaskForm', {
        taskId: action.taskId,
        contactId: action.taskContactId ?? action.contactId,
      });
      return true;
    case 'contact':
      if (!action.contactId) return false;
      navigateToTabScreen(navigation, 'AppsTab', 'ContactDetail', { contactId: action.contactId });
      return true;
    case 'opportunity':
      if (!action.opportunityId) return false;
      navigateToTabScreen(navigation, 'AppsTab', 'OpportunityDetail', {
        opportunityId: action.opportunityId,
      });
      return true;
    default:
      return false;
  }
}

/** Open Calendar tab → appointment detail (from Home today's schedule, etc.). */
export function navigateToAppointmentDetail(
  navigation: NavigationProp<ParamListBase>,
  eventId: string,
  title?: string,
): void {
  navigateToTabScreen(navigation, 'CalendarTab', 'AppointmentDetail', { eventId, title });
}

export { getTabNavigation, navigateToTabScreen };
export type { MainTabParamList };
