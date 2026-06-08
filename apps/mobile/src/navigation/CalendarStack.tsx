import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarScreen } from '../screens/CalendarScreen';
import { AppointmentDetailScreen } from '../screens/AppointmentDetailScreen';
import { AppointmentFormScreen } from '../screens/AppointmentFormScreen';
import { PickContactScreen } from '../screens/PickContactScreen';
import { ScheduleAppointmentScreen } from '../screens/ScheduleAppointmentScreen';
import { theme } from '../theme';
import type { PickContactParams } from '../screens/PickContactScreen';
import type { PickedContact } from '../lib/contacts';

export type CalendarStackParamList = {
  CalendarList: undefined;
  AppointmentDetail: { eventId: string; title?: string };
  /** Edit / reschedule (legacy form) */
  AppointmentForm: { eventId?: string; pickedContact?: PickedContact } | undefined;
  PickContact: PickContactParams;
  ScheduleAppointment: { contact: PickedContact; eventId?: string };
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.shell },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CalendarList" component={CalendarScreen} />
      <Stack.Screen name="PickContact" component={PickContactScreen} />
      <Stack.Screen name="ScheduleAppointment" component={ScheduleAppointmentScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="AppointmentForm" component={AppointmentFormScreen} />
    </Stack.Navigator>
  );
}
