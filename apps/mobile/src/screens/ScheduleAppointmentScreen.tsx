import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import { type CalendarOption } from '../lib/appointments';
import { formatShortDate, toDateKey, unixMillis } from '../lib/dates';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import {
  type AppointmentSlot,
  defaultScheduleFormState,
  parseFreeSlotsForDate,
  scheduleFormToPayload,
  validateScheduleForm,
} from '../lib/scheduleAppointment';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { BottomSheet } from '../components/BottomSheet';
import { FormPickerField } from '../components/FormPickerField';
import { LocationAvatar } from '../components/LocationAvatar';
import { MonthCalendar } from '../components/MonthCalendar';
import { TextField } from '../components/TextField';
import type { CalendarStackParamList } from '../navigation/CalendarStack';

type Props = NativeStackScreenProps<CalendarStackParamList, 'ScheduleAppointment'>;

export function ScheduleAppointmentScreen({ navigation, route }: Props) {
  const scrollBottom = useFullScreenBottomInset();
  const { contact } = route.params;
  const { token, locationId } = useAppState();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [form, setForm] = useState(defaultScheduleFormState());
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [calendarSheet, setCalendarSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [slotSheet, setSlotSheet] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  const calendarName = useMemo(
    () => calendars.find((c) => c.id === form.calendarId)?.name ?? '',
    [calendars, form.calendarId],
  );

  const loadCalendars = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const res = await api.getJson<{ calendars: CalendarOption[] }>('/api/calendar/calendars', {
        headers: withAuthHeaders({ token, locationId }),
      });
      const list = res.calendars ?? [];
      setCalendars(list);
      setForm((prev) => ({ ...prev, calendarId: prev.calendarId || list[0]?.id || '' }));
    } catch (e) {
      Alert.alert('Calendars', formatError(e), [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [token, locationId, navigation]);

  const loadSlots = useCallback(async () => {
    if (!token || !locationId || !form.calendarId || form.mode !== 'standard') {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const dayStart = new Date(form.selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(form.selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      const res = await api.getJson<{ slots: unknown }>(
        `/api/calendar/calendars/${encodeURIComponent(form.calendarId)}/free-slots?startDate=${unixMillis(dayStart)}&endDate=${unixMillis(dayEnd)}`,
        { headers: withAuthHeaders({ token, locationId }) },
      );
      const parsed = parseFreeSlotsForDate(res.slots, toDateKey(form.selectedDate));
      setSlots(parsed);
      setForm((prev) => ({
        ...prev,
        slot: parsed.find((s) => s.startTime === prev.slot?.startTime) ?? parsed[0] ?? null,
      }));
    } catch (e) {
      setSlots([]);
      setForm((prev) => ({ ...prev, slot: null }));
      if (__DEV__) console.warn('free-slots', formatError(e));
    } finally {
      setSlotsLoading(false);
    }
  }, [token, locationId, form.calendarId, form.selectedDate, form.mode]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadCalendars();
  }, [loadCalendars]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadSlots();
  }, [loadSlots]);

  async function save() {
    if (!token || !locationId) return;
    const err = validateScheduleForm(form);
    if (err) {
      Alert.alert('Schedule appointment', err);
      return;
    }
    const payload = scheduleFormToPayload(form, contact.id);
    if (!payload) {
      Alert.alert('Schedule appointment', 'Could not build appointment times.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.postJson<{ appointment: { id?: string; title?: string } }>(
        '/api/calendar/appointments',
        payload,
        { headers: withAuthHeaders({ token, locationId }) },
      );
      const eventId = res.appointment?.id;
      if (eventId) {
        navigation.replace('AppointmentDetail', {
          eventId,
          title: res.appointment?.title ?? payload.title,
        });
      } else {
        Alert.alert('Created', 'Appointment saved.');
        navigation.popToTop();
      }
    } catch (e) {
      Alert.alert('Create failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBar title="Schedule Appointment" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={theme.colors.secondary} style={{ marginTop: theme.spacing.xl }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar
        title="Schedule Appointment"
        onBack={() => navigation.goBack()}
        rightLabel="Save"
        onRightPress={save}
        rightLoading={saving}
      />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contactCard}>
          <LocationAvatar name={contact.name} size={48} />
          <View style={styles.contactBody}>
            <Text style={styles.contactName}>{contact.name}</Text>
            {contact.phone ? <Text style={styles.contactSub}>{contact.phone}</Text> : null}
            {contact.email ? <Text style={styles.contactSub}>{contact.email}</Text> : null}
          </View>
        </View>

        <FormPickerField
          label="Calendar"
          value={calendarName}
          placeholder="Select calendar"
          onPress={() => setCalendarSheet(true)}
        />

        <View style={styles.modeRow}>
          {(['standard', 'custom'] as const).map((mode) => {
            const active = form.mode === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.modeBtn, active && styles.modeBtnActive]}
                onPress={() => setForm((prev) => ({ ...prev, mode, slot: null }))}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {mode === 'standard' ? 'Standard' : 'Custom'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {form.mode === 'standard' ? (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.secondary} />
            <Text style={styles.infoText}>Pick from available slots on the selected calendar.</Text>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.secondary} />
            <Text style={styles.infoText}>Set a custom start and end time for this appointment.</Text>
          </View>
        )}

        <FormPickerField
          label="Date"
          value={formatShortDate(form.selectedDate)}
          icon="calendar-outline"
          onPress={() => {
            setPickerMonth(form.selectedDate);
            setDateSheet(true);
          }}
        />

        {form.mode === 'standard' ? (
          <FormPickerField
            label="Slot"
            value={form.slot?.label ?? (slotsLoading ? 'Loading slots…' : '')}
            placeholder={slots.length ? 'Select a time slot' : 'No slots available'}
            icon="time-outline"
            onPress={() => setSlotSheet(true)}
          />
        ) : (
          <>
            <TextField
              label="Start time (HH:mm)"
              value={form.customStartTime}
              onChangeText={(t) => setForm((prev) => ({ ...prev, customStartTime: t }))}
              placeholder="10:00"
            />
            <TextField
              label="End time (HH:mm)"
              value={form.customEndTime}
              onChangeText={(t) => setForm((prev) => ({ ...prev, customEndTime: t }))}
              placeholder="10:45"
            />
          </>
        )}

        <TextField
          label="Appointment title"
          value={form.title}
          onChangeText={(t) => setForm((prev) => ({ ...prev, title: t }))}
          placeholder="Consultation call"
          autoCapitalize="words"
        />
        <TextField
          label="Description"
          value={form.notes}
          onChangeText={(t) => setForm((prev) => ({ ...prev, notes: t }))}
          placeholder="Optional notes"
          autoCapitalize="sentences"
        />
      </ScrollView>

      <BottomSheet visible={calendarSheet} onClose={() => setCalendarSheet(false)} title="Select calendar">
        {calendars.map((cal) => (
          <Pressable
            key={cal.id}
            style={styles.sheetRow}
            onPress={() => {
              setForm((prev) => ({ ...prev, calendarId: cal.id, slot: null }));
              setCalendarSheet(false);
            }}
          >
            <Text style={styles.sheetRowText}>{cal.name ?? cal.id}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={dateSheet} onClose={() => setDateSheet(false)} title="Select Date">
        <MonthCalendar
          month={pickerMonth}
          selected={form.selectedDate}
          onSelect={(date) => {
            setForm((prev) => ({ ...prev, selectedDate: date, slot: null }));
            setDateSheet(false);
          }}
          onChangeMonth={setPickerMonth}
        />
      </BottomSheet>

      <BottomSheet visible={slotSheet} onClose={() => setSlotSheet(false)} title="Select Slot">
        {slotsLoading ? (
          <ActivityIndicator color={theme.colors.secondary} style={{ marginVertical: theme.spacing.lg }} />
        ) : slots.length === 0 ? (
          <Text style={styles.emptySlots}>No slots on this date. Try another day or use Custom mode.</Text>
        ) : (
          slots.map((slot) => (
            <Pressable
              key={slot.startTime}
              style={styles.sheetRow}
              onPress={() => {
                setForm((prev) => ({ ...prev, slot }));
                setSlotSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{slot.label}</Text>
            </Pressable>
          ))
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  contactCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  contactBody: { flex: 1, minWidth: 0 },
  contactName: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  contactSub: {
    marginTop: 4,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  modeBtnActive: { backgroundColor: theme.colors.primary },
  modeText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  modeTextActive: { color: theme.colors.white },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    color: theme.colors.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  sheetRow: {
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sheetRowText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  emptySlots: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
});
