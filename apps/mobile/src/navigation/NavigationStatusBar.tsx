import React from 'react';
import { StatusBar } from 'expo-status-bar';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useThemeState } from '../state/ThemeState';

export function getActiveRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined,
): string | undefined {
  if (!state?.routes?.length) return undefined;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return undefined;
  const nested = route.state as NavigationState | PartialState<NavigationState> | undefined;
  if (nested?.routes?.length) {
    return getActiveRouteName(nested) ?? route.name;
  }
  return route.name;
}

/** Screens with indigo shell chrome behind the status bar — use light system icons. */
const SHELL_STATUS_BAR_ROUTES = new Set([
  'Login',
  'LocationPicker',
  'HomeMain',
  'Notifications',
  'Settings',
  'InboxList',
  'SearchMain',
  'ConversationThread',
  'AppsHome',
  'CalendarList',
  'ContactsList',
  'ContactDetail',
  'ContactForm',
  'ScanBusinessCard',
  'PipelineHome',
  'OpportunityDetail',
  'OpportunityForm',
  'PickContact',
  'PickContactForMessage',
  'SelectAssignees',
  'AppointmentDetail',
  'AppointmentForm',
  'ScheduleAppointment',
  'TaskForm',
  'InboxPickContact',
]);

type Props = {
  routeName?: string;
};

export function NavigationStatusBar({ routeName }: Props) {
  const { colorScheme } = useThemeState();
  const shellChrome = routeName != null && SHELL_STATUS_BAR_ROUTES.has(routeName);
  const style = shellChrome ? 'light' : colorScheme === 'light' ? 'dark' : 'light';
  return <StatusBar style={style} />;
}
