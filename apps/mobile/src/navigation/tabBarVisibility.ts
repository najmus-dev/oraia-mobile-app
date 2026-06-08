import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { ParamListBase, RouteProp } from '@react-navigation/native';

/** Nested stack routes where the bottom tab bar should be hidden. */
const HIDE_TAB_BAR: Record<string, readonly string[]> = {
  InboxTab: ['ConversationThread', 'PickContactForMessage'],
  HomeTab: ['Settings'],
  CalendarTab: ['PickContact', 'ScheduleAppointment', 'AppointmentDetail', 'AppointmentForm'],
  AppsTab: [
    'ContactDetail',
    'ContactForm',
    'ScanBusinessCard',
    'PipelineHome',
    'OpportunityDetail',
    'PickContact',
    'OpportunityForm',
    'TasksHome',
    'TaskForm',
    'TaskFilters',
    'SelectAssignees',
  ],
};

export function shouldHideTabBar(
  tabRouteName: string,
  route: RouteProp<ParamListBase>,
): boolean {
  const focused = getFocusedRouteNameFromRoute(route);
  if (!focused) return false;
  const hidden = HIDE_TAB_BAR[tabRouteName];
  return hidden?.includes(focused) ?? false;
}
