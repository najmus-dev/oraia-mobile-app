import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { normalizeAppointment, type Appointment, type CalendarOption } from '../lib/appointments';
import { contactDisplayName, type Contact, type ContactResponse } from '../lib/contacts';
import { formatEventRange } from '../lib/dates';
import { formatError } from '../lib/errors';
import { navigateToContactDetail } from '../lib/navigation';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { popWizardBack } from '../lib/stackNavigation';
import { useAppState } from '../state/AppState';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';
import { DetailRow } from '../components/DetailRow';
import type { CalendarStackParamList } from '../navigation/CalendarStack';

type Props = NativeStackScreenProps<CalendarStackParamList, 'AppointmentDetail'>;

export function AppointmentDetailScreen({ navigation, route }: Props) {
  const { eventId, title: routeTitle } = route.params;
  const scrollBottom = useFullScreenBottomInset();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { token, locationId } = useAppState();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);

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

  useEffect(() => {
    const contactId = appointment?.contactId?.trim();
    if (!contactId || !token || !locationId) {
      setContactName(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api.getJson<ContactResponse>(`/api/contacts/${contactId}`, {
          headers: withAuthHeaders({ token, locationId }),
        });
        if (alive) setContactName(contactDisplayName(res.contact as Contact));
      } catch {
        if (alive) setContactName(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [appointment?.contactId, token, locationId]);

  useEffect(() => {
    const calendarId = appointment?.calendarId?.trim();
    if (!calendarId || !token || !locationId) {
      setCalendarName(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api.getJson<{ calendars: CalendarOption[] }>('/api/calendar/calendars', {
          headers: withAuthHeaders({ token, locationId }),
        });
        const match = (res.calendars ?? []).find((c) => c.id === calendarId);
        if (alive) setCalendarName(match?.name?.trim() || null);
      } catch {
        if (alive) setCalendarName(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [appointment?.calendarId, token, locationId]);

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

  function openReschedule() {
    const contactId = appointment?.contactId?.trim();
    if (!contactId) {
      Alert.alert('Reschedule', 'This appointment has no linked contact.');
      return;
    }
    navigation.navigate('ScheduleAppointment', {
      eventId,
      contact: {
        id: contactId,
        name: contactName ?? 'Contact',
      },
    });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={loading ? 'Loading…' : (appointment?.appointmentStatus ?? 'Scheduled')}
        onBack={() => popWizardBack(navigation, 'CalendarList')}
        actionIcon="create-outline"
        onAction={openReschedule}
        actionAccessibilityLabel="Reschedule appointment"
      />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}>
        <DetailRow
          label="When"
          value={formatEventRange(appointment?.startTime, appointment?.endTime)}
        />
        <DetailRow label="Status" value={appointment?.appointmentStatus} />
        <DetailRow
          label="Contact"
          value={contactName ?? appointment?.contactId ?? undefined}
          onPress={
            appointment?.contactId?.trim()
              ? () => navigateToContactDetail(navigation, appointment.contactId!.trim())
              : undefined
          }
        />
        <DetailRow label="Calendar" value={calendarName ?? appointment?.calendarId ?? undefined} />
        <DetailRow label="Address" value={appointment?.address} />
        <DetailRow label="Notes" value={appointment?.notes} />

        {!loading && appointment ? (
          <View style={styles.actions}>
            <Button
              title="Reschedule"
              onPress={openReschedule}
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

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { padding: theme.spacing.xl, gap: theme.spacing.md },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  actionBtn: { flex: 1 },
});
}
