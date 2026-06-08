import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { normalizeAppointment, type Appointment } from '../lib/appointments';
import { formatEventRange } from '../lib/dates';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';
import { DetailRow } from '../components/DetailRow';
import type { CalendarStackParamList } from '../navigation/CalendarStack';

type Props = NativeStackScreenProps<CalendarStackParamList, 'AppointmentDetail'>;

export function AppointmentDetailScreen({ navigation, route }: Props) {
  const { eventId, title: routeTitle } = route.params;
  const scrollBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const res = await api.getJson<{ appointment: unknown }>(
        `/api/calendar/appointments/${eventId}`,
        { headers: withAuthHeaders({ token, locationId }) },
      );
      setAppointment(normalizeAppointment(res.appointment));
    } catch (e) {
      Alert.alert('Appointment', formatError(e));
    } finally {
      setLoading(false);
    }
  }, [token, locationId, eventId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  function cancel() {
    Alert.alert('Cancel appointment', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel appointment',
        style: 'destructive',
        onPress: async () => {
          if (!token || !locationId) return;
          setCancelling(true);
          try {
            await api.delete(`/api/calendar/appointments/${eventId}`, {
              headers: withAuthHeaders({ token, locationId }),
            });
            Alert.alert('Cancelled', 'Appointment removed.');
            navigation.goBack();
          } catch (e) {
            Alert.alert('Cancel failed', formatError(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  const title = appointment?.title ?? routeTitle ?? 'Appointment';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={loading ? 'Loading…' : (appointment?.appointmentStatus ?? 'Scheduled')}
        onBack={() => navigation.goBack()}
        actionIcon="create-outline"
        onAction={() => navigation.navigate('AppointmentForm', { eventId })}
        actionAccessibilityLabel="Reschedule appointment"
      />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}>
        <DetailRow
          label="When"
          value={formatEventRange(appointment?.startTime, appointment?.endTime)}
        />
        <DetailRow label="Status" value={appointment?.appointmentStatus} />
        <DetailRow label="Contact ID" value={appointment?.contactId} />
        <DetailRow label="Calendar ID" value={appointment?.calendarId} />
        <DetailRow label="Address" value={appointment?.address} />
        <DetailRow label="Notes" value={appointment?.notes} />

        {!loading && appointment ? (
          <View style={styles.actions}>
            <Button
              title="Reschedule"
              onPress={() => navigation.navigate('AppointmentForm', { eventId })}
              variant="dark"
              style={styles.actionBtn}
            />
            <Button
              title={cancelling ? 'Cancelling…' : 'Cancel'}
              variant="ghost"
              disabled={cancelling}
              onPress={cancel}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { padding: theme.spacing.xl, gap: theme.spacing.md },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  actionBtn: { flex: 1 },
});
