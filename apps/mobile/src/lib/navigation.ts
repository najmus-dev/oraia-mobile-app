import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Open Apps tab → contact detail (from Inbox, Home, Search, etc.). */
export function navigateToContactDetail(
  navigation: NavigationProp<ParamListBase>,
  contactId: string,
): void {
  const tab = navigation.getParent();
  if (!tab) return;
  tab.navigate('AppsTab', {
    screen: 'ContactDetail',
    params: { contactId },
  });
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
  },
): void {
  const tab = navigation.getParent();
  if (!tab) return;
  tab.navigate('InboxTab', {
    screen: 'ConversationThread',
    params: {
      contactId: params.contactId,
      contactName: params.contactName,
      contactPhone: params.contactPhone,
      contactEmail: params.contactEmail,
      conversationId: params.conversationId,
      channel: params.contactPhone ? 'SMS' : 'Email',
    },
  });
}

/** Open Calendar tab → schedule appointment for a contact. */
export function navigateToScheduleForContact(
  navigation: NavigationProp<ParamListBase>,
  contact: { id: string; name: string; phone?: string; email?: string },
): void {
  const tab = navigation.getParent();
  if (!tab) return;
  tab.navigate('CalendarTab', {
    screen: 'ScheduleAppointment',
    params: { contact },
  });
}

/** Open Calendar tab → appointment detail (from Home today's schedule, etc.). */
export function navigateToAppointmentDetail(
  navigation: NavigationProp<ParamListBase>,
  eventId: string,
  title?: string,
): void {
  const tab = navigation.getParent();
  if (!tab) return;
  tab.navigate('CalendarTab', {
    screen: 'AppointmentDetail',
    params: { eventId, title },
  });
}
