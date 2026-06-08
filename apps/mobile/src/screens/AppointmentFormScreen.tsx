import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import {
  type CalendarOption,
  appointmentToFormValues,
  emptyAppointmentFormValues,
  formatIsoPreview,
  formValuesToAppointmentPayload,
  normalizeAppointment,
  validateAppointmentForm,
} from '../lib/appointments';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { ChipSelect } from '../components/ChipSelect';
import { ContactPickerField } from '../components/ContactPickerField';
import type { PickedContact } from '../lib/contacts';
import { contactToPicked } from '../lib/contacts';
import type { CalendarStackParamList } from '../navigation/CalendarStack';

type Props = NativeStackScreenProps<CalendarStackParamList, 'AppointmentForm'>;

export function AppointmentFormScreen({ navigation, route }: Props) {
  const scrollBottom = useFullScreenBottomInset();
  const eventId = route.params?.eventId;
  const isEdit = Boolean(eventId);
  const { token, locationId } = useAppState();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [pickedContact, setPickedContact] = useState<PickedContact | null>(null);
  const [values, setValues] = useState(emptyAppointmentFormValues());

  useEffect(() => {
    const incoming = route.params?.pickedContact;
    if (!incoming) return;
    setPickedContact(incoming);
    setValues((prev) => ({ ...prev, contactId: incoming.id }));
    navigation.setParams({ pickedContact: undefined });
  }, [route.params?.pickedContact, navigation]);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const calendarRes = await api.getJson<{ calendars: CalendarOption[] }>('/api/calendar/calendars', {
        headers: withAuthHeaders({ token, locationId }),
      });
      const list = calendarRes.calendars ?? [];
      setCalendars(list);

      if (isEdit && eventId) {
        const apptRes = await api.getJson<{ appointment: unknown }>(
          `/api/calendar/appointments/${eventId}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        const appointment = normalizeAppointment(apptRes.appointment);
        setValues(appointmentToFormValues(appointment));
        if (appointment.contactId) {
          try {
            const contactRes = await api.getJson<{ contact: { id: string; firstName?: string; lastName?: string; name?: string; phone?: string; email?: string } }>(
              `/api/contacts/${encodeURIComponent(appointment.contactId)}`,
              { headers: withAuthHeaders({ token, locationId }) },
            );
            setPickedContact(contactToPicked(contactRes.contact));
          } catch {
            setPickedContact({ id: appointment.contactId, name: appointment.contactId });
          }
        }
      } else {
        setValues((prev) => ({
          ...prev,
          calendarId: prev.calendarId || list[0]?.id || '',
        }));
      }
    } catch (e) {
      Alert.alert('Appointment', formatError(e), [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [token, locationId, isEdit, eventId, navigation]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  function setField<K extends keyof typeof values>(key: K, next: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  async function save() {
    if (!token || !locationId) return;
    const mode = isEdit ? 'update' : 'create';
    const validationError = validateAppointmentForm(values, mode);
    if (validationError) {
      Alert.alert(isEdit ? 'Reschedule' : 'New appointment', validationError);
      return;
    }

    const payload = formValuesToAppointmentPayload(values, mode);
    setSaving(true);
    try {
      if (isEdit && eventId) {
        await api.putJson(`/api/calendar/appointments/${eventId}`, payload, {
          headers: withAuthHeaders({ token, locationId }),
        });
        navigation.replace('AppointmentDetail', {
          eventId,
          title: values.title.trim(),
        });
      } else {
        const res = await api.postJson<{ appointment: { id?: string } }>(
          '/api/calendar/appointments',
          payload,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        const created = normalizeAppointment(res.appointment);
        if (created.id) {
          navigation.replace('AppointmentDetail', {
            eventId: created.id,
            title: created.title ?? values.title.trim(),
          });
        } else {
          Alert.alert('Created', 'Appointment saved.');
          navigation.goBack();
        }
      }
    } catch (e) {
      Alert.alert(isEdit ? 'Update failed' : 'Create failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEdit ? 'Reschedule' : 'New appointment'}
        subtitle={isEdit ? 'Update time and details' : 'Schedule on calendar'}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <ActivityIndicator color={theme.colors.secondary} style={styles.loader} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label="Title"
              value={values.title}
              onChangeText={(t) => setField('title', t)}
              placeholder="Consultation call"
              autoCapitalize="words"
            />

            {!isEdit ? (
              <ContactPickerField
                contact={pickedContact}
                onPress={() => navigation.navigate('PickContact', { flow: 'appointment', eventId })}
              />
            ) : values.contactId ? (
              <ContactPickerField
                contact={
                  pickedContact ??
                  (values.contactId
                    ? { id: values.contactId, name: values.contactId }
                    : null)
                }
                onPress={() =>
                  navigation.navigate('PickContact', { flow: 'appointment', eventId })
                }
              />
            ) : null}

            {calendars.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Calendar</Text>
                <ChipSelect
                  options={calendars.map((c) => ({ id: c.id, label: c.name ?? c.id }))}
                  value={values.calendarId}
                  onChange={(id) => setField('calendarId', id)}
                />
              </>
            ) : (
              <TextField
                label="Calendar ID"
                value={values.calendarId}
                onChangeText={(t) => setField('calendarId', t)}
                placeholder="calendar id"
                autoCapitalize="none"
              />
            )}

            <TextField
              label="Start (ISO 8601)"
              value={values.startTime}
              onChangeText={(t) => setField('startTime', t)}
              placeholder="2026-06-10T14:00:00.000Z"
              autoCapitalize="none"
            />
            {values.startTime.trim() ? (
              <Text style={styles.preview}>{formatIsoPreview(values.startTime)}</Text>
            ) : null}

            <TextField
              label="End (ISO 8601)"
              value={values.endTime}
              onChangeText={(t) => setField('endTime', t)}
              placeholder="2026-06-10T15:00:00.000Z"
              autoCapitalize="none"
            />
            {values.endTime.trim() ? (
              <Text style={styles.preview}>{formatIsoPreview(values.endTime)}</Text>
            ) : null}

            <TextField
              label="Notes (optional)"
              value={values.notes}
              onChangeText={(t) => setField('notes', t)}
              placeholder="Anything the team should know"
              autoCapitalize="sentences"
            />

            <Button
              title={
                saving
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Create appointment'
              }
              onPress={save}
              disabled={saving}
              style={styles.saveBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  body: { padding: theme.spacing.xl, gap: theme.spacing.lg },
  loader: { marginTop: theme.spacing['2xl'] },
  sectionLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: -theme.spacing.sm,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  preview: {
    marginTop: -theme.spacing.sm,
    color: theme.colors.secondary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  saveBtn: { marginTop: theme.spacing.md },
});
