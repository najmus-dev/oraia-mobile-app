import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  addDays,
  endOfMonth,
  endOfWeekSunday,
  formatDayLabel,
  formatEventRange,
  formatMonthYear,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeekSunday,
  toDateKey,
  toIso,
} from '../lib/dates';
import { formatError } from '../lib/errors';
import { FAB_LIST_PADDING_BOTTOM } from '../lib/fabLayout';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { ErrorBanner } from '../components/ErrorBanner';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { ListBusyState } from '../components/ListBusyState';
import { BottomSheet } from '../components/BottomSheet';
import { ListRow } from '../components/ListRow';
import { MonthCalendar } from '../components/MonthCalendar';
import { WeekScheduleGrid } from '../components/WeekScheduleGrid';
import type { CalendarStackParamList } from '../navigation/CalendarStack';

type Props = NativeStackScreenProps<CalendarStackParamList, 'CalendarList'>;

type CalendarEvent = {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
};

type ViewMode = 'list' | 'weekly' | 'monthly';

const VIEW_LABELS: Record<ViewMode, string> = {
  list: 'List View',
  weekly: 'Weekly View',
  monthly: 'Monthly View',
};

type CalendarSection = { title: string; data: CalendarEvent[] };

function groupByDay(events: CalendarEvent[]): CalendarSection[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.startTime ? new Date(e.startTime).toDateString() : 'Unknown';
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([_, items]) => ({
      title: formatDayLabel(items[0]?.startTime ?? ''),
      data: items.sort(
        (a, b) => new Date(a.startTime ?? 0).getTime() - new Date(b.startTime ?? 0).getTime(),
      ),
    }));
}

const CalendarEventRow = React.memo(function CalendarEventRow({
  event,
  onPress,
}: {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
}) {
  return (
    <View style={styles.rowWrap}>
      <ListRow
        title={event.title ?? 'Untitled appointment'}
        subtitle={`${formatEventRange(event.startTime, event.endTime)}${event.appointmentStatus ? ` · ${event.appointmentStatus}` : ''}`}
        onPress={() => onPress(event)}
      />
    </View>
  );
});

export function CalendarScreen({ navigation }: Props) {
  const { token, locationId, locationName } = useAppState();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [focusDate, setFocusDate] = useState(() => startOfDay());
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);

  const range = useMemo(() => {
    if (viewMode === 'monthly' || viewMode === 'list') {
      const month = startOfMonth(focusDate);
      return { start: month, end: endOfMonth(month) };
    }
    return { start: startOfWeekSunday(focusDate), end: endOfWeekSunday(focusDate) };
  }, [viewMode, focusDate]);

  const markedDates = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.startTime) set.add(toDateKey(new Date(e.startTime)));
    }
    return set;
  }, [events]);

  const load = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!token || !locationId) return;
      if (opts?.pull) setRefreshing(true);
      else if (!hasLoaded) setInitialLoading(true);
      setLoadError(null);
      try {
        const res = await api.getJson<{ events: CalendarEvent[] }>(
          `/api/calendar/events?startTime=${encodeURIComponent(toIso(range.start))}&endTime=${encodeURIComponent(toIso(range.end))}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        setEvents(res.events ?? []);
        setHasLoaded(true);
      } catch (e) {
        setLoadError(formatError(e));
        if (!hasLoaded) setEvents([]);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [token, locationId, range.start, range.end, hasLoaded],
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  const filteredEvents = useMemo(() => {
    if (viewMode === 'monthly') {
      return events.filter((e) => e.startTime && isSameDay(new Date(e.startTime), focusDate));
    }
    if (viewMode === 'weekly') {
      return events;
    }
    return events;
  }, [events, viewMode, focusDate]);

  const sections = useMemo(() => groupByDay(filteredEvents), [filteredEvents]);
  const emptyMonthLabel = formatMonthYear(focusDate);
  const showEmpty = hasLoaded && !initialLoading && sections.length === 0;

  function openEvent(event: CalendarEvent) {
    navigation.navigate('AppointmentDetail', { eventId: event.id, title: event.title });
  }

  function shiftFocus(step: number) {
    if (viewMode === 'list') {
      const next = startOfMonth(focusDate);
      next.setMonth(next.getMonth() + step);
      setFocusDate(next);
      setMonthCursor(next);
      return;
    }
    const days = viewMode === 'weekly' ? 7 : 1;
    setFocusDate((prev) => addDays(prev, step * days));
  }

  return (
    <View style={styles.container}>
      <AppBar title="Appointments" onRefresh={() => load({ pull: true })} />

      <View style={styles.toolbar}>
        <Pressable style={styles.viewBtn} onPress={() => setViewSheetOpen(true)}>
          <Ionicons
            name={viewMode === 'weekly' ? 'grid-outline' : 'list-outline'}
            size={18}
            color={theme.colors.textOnDark}
          />
          <Text style={styles.viewBtnText}>{VIEW_LABELS[viewMode]}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.mutedTextOnDark} />
        </Pressable>
        <Pressable
          style={styles.todayBtn}
          onPress={() => {
            const today = startOfDay();
            setFocusDate(today);
            setMonthCursor(startOfMonth(today));
          }}
        >
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      </View>

      {locationName ? (
        <View style={styles.locationRow}>
          <View style={styles.filterChip}>
            <Ionicons name="business-outline" size={14} color={theme.colors.mutedTextOnDark} />
            <Text style={styles.filterChipText} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </View>
      ) : null}

      {loadError ? (
        <ErrorBanner
          message={loadError}
          onRetry={() => load({ pull: true })}
          onDismiss={() => setLoadError(null)}
        />
      ) : null}

      {viewMode === 'monthly' ? (
        <View style={styles.monthWrap}>
          <MonthCalendar
            month={monthCursor}
            selected={focusDate}
            onSelect={(date) => {
              setFocusDate(date);
              setMonthCursor(startOfMonth(date));
            }}
            onChangeMonth={setMonthCursor}
            markedDates={markedDates}
          />
        </View>
      ) : null}

      {initialLoading && !hasLoaded ? (
        <ListBusyState blocking message="Loading appointments…" />
      ) : viewMode === 'weekly' ? (
        <WeekScheduleGrid
          focusDate={focusDate}
          events={filteredEvents}
          onSelectDay={setFocusDate}
          onPrevWeek={() => shiftFocus(-1)}
          onNextWeek={() => shiftFocus(1)}
          onEventPress={openEvent}
        />
      ) : showEmpty ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={56} color={theme.colors.surfaceMuted} />
          <Text style={styles.emptyTitle}>
            {viewMode === 'list' || viewMode === 'monthly'
              ? `No events for ${emptyMonthLabel}!`
              : 'No appointments in this range'}
          </Text>
          <Text style={styles.emptySub}>Tap + to create an appointment.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => load({ pull: true })}
          stickySectionHeadersEnabled={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          renderItem={({ item }) => <CalendarEventRow event={item} onPress={openEvent} />}
        />
      )}

      <FloatingActionButton
        onPress={() => setNewSheetOpen(true)}
        accessibilityLabel="Create appointment"
      />

      <BottomSheet visible={viewSheetOpen} onClose={() => setViewSheetOpen(false)}>
        {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={styles.sheetRow}
            onPress={() => {
              setViewMode(mode);
              setViewSheetOpen(false);
            }}
          >
            <Text style={styles.sheetRowText}>{VIEW_LABELS[mode]}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={newSheetOpen} onClose={() => setNewSheetOpen(false)} title="New">
        <Pressable
          style={styles.newRow}
          onPress={() => {
            setNewSheetOpen(false);
            navigation.navigate('PickContact', { flow: 'schedule' });
          }}
        >
          <View style={styles.newIcon}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.link} />
          </View>
          <Text style={styles.newLabel}>Schedule Appointment</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    minHeight: 40,
    backgroundColor: theme.colors.surfaceElevated,
  },
  viewBtnText: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  todayBtn: {
    borderRadius: 10,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  todayText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  locationRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    maxWidth: '100%',
  },
  filterChipText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  monthWrap: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  list: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    gap: theme.spacing.lg,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
  },
  section: { gap: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  rowWrap: { marginBottom: theme.spacing.sm },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
  },
  emptyTitle: {
    marginTop: theme.spacing.lg,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
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
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  newIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLabel: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
});
