import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  formatDayLabel,
  formatEventRange,
  formatMonthYear,
  startOfDay,
  startOfMonth,
  toIso,
} from '../lib/dates';
import {
  buildCalendarRangeKey,
  calendarLoadingState,
  clampDayInMonth,
  collectMarkedDates,
  computeCalendarFetchRange,
  filterEventsForView,
  groupEventsByDay,
  mergeCalendarOptions,
  shiftVisibleMonth,
  shiftVisibleWeek,
  type CalendarListEvent,
  type CalendarViewMode,
} from '../lib/calendarView';
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

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  list: 'List View',
  weekly: 'Weekly View',
  monthly: 'Monthly View',
};

function ContentLoadingOverlay({ message }: { message: string }) {
  return (
    <View style={styles.contentLoading} pointerEvents="none">
      <ActivityIndicator color={theme.colors.link} size="large" />
      <Text style={styles.contentLoadingText}>{message}</Text>
    </View>
  );
}

const CalendarEventRow = React.memo(function CalendarEventRow({
  event,
  onPress,
}: {
  event: CalendarListEvent;
  onPress: (event: CalendarListEvent) => void;
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

  const [viewMode, setViewMode] = useState<CalendarViewMode>('list');
  const [focusDate, setFocusDate] = useState(() => startOfDay());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarListEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [calendars, setCalendars] = useState<Array<{ id: string; name?: string }>>([]);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const loadRequestRef = useRef(0);
  const loadRef = useRef<(opts?: { pull?: boolean }) => Promise<void>>(async () => {});
  const isFirstFocusRef = useRef(true);

  const monthCursor = useMemo(() => startOfMonth(focusDate), [focusDate]);

  const range = useMemo(
    () => computeCalendarFetchRange(viewMode, focusDate),
    [viewMode, focusDate],
  );

  const rangeKey = useMemo(
    () => buildCalendarRangeKey(viewMode, range.start, range.end, calendarId),
    [viewMode, range.start, range.end, calendarId],
  );

  const loadState = useMemo(
    () => calendarLoadingState(loading, loadedRangeKey, rangeKey),
    [loading, loadedRangeKey, rangeKey],
  );

  const filteredEvents = useMemo(
    () => filterEventsForView(events, viewMode, focusDate),
    [events, viewMode, focusDate],
  );

  const markedDates = useMemo(() => collectMarkedDates(events), [events]);
  const sections = useMemo(() => groupEventsByDay(filteredEvents, formatDayLabel), [filteredEvents]);
  const emptyRangeLabel = formatMonthYear(focusDate);
  const showEmpty = loadState.showEmpty && filteredEvents.length === 0;
  const showContentLoading = loadState.updating && filteredEvents.length === 0;

  const load = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!token || !locationId) return;
      const requestId = ++loadRequestRef.current;
      const fetchKey = rangeKey;
      const isFirstLoad = loadedRangeKey === null;
      setLoading(true);
      if (opts?.pull) setRefreshing(true);
      setLoadError(null);
      try {
        const calQs = calendarId ? `&calendarId=${encodeURIComponent(calendarId)}` : '';
        const res = await api.getJson<{
          events: CalendarListEvent[];
          calendars?: Array<{ id: string; name?: string }>;
        }>(
          `/api/calendar/events?startTime=${encodeURIComponent(toIso(range.start))}&endTime=${encodeURIComponent(toIso(range.end))}${calQs}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        if (requestId !== loadRequestRef.current) return;
        setEvents(res.events ?? []);
        setLoadedRangeKey(fetchKey);
        if (res.calendars?.length) {
          setCalendars((prev) => mergeCalendarOptions(prev, res.calendars ?? []));
        }
      } catch (e) {
        if (requestId !== loadRequestRef.current) return;
        setLoadError(formatError(e));
        if (isFirstLoad) setEvents([]);
      } finally {
        if (requestId === loadRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, locationId, range.start, range.end, rangeKey, calendarId, loadedRangeKey],
  );

  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      if (!token || !locationId) return;
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      loadRef.current();
    }, [token, locationId]),
  );

  useEffect(() => {
    if (!token || !locationId) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.getJson<{ calendars: Array<{ id: string; name?: string }> }>(
          '/api/calendar/calendars',
          { headers: withAuthHeaders({ token, locationId }) },
        );
        if (alive) setCalendars(res.calendars ?? []);
      } catch {
        if (alive) setCalendars([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, locationId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  function openEvent(event: CalendarListEvent) {
    navigation.navigate('AppointmentDetail', { eventId: event.id, title: event.title });
  }

  function goToToday() {
    setFocusDate(startOfDay());
  }

  function shiftPeriod(step: number) {
    if (viewMode === 'weekly') {
      setFocusDate((prev) => shiftVisibleWeek(prev, step));
      return;
    }
    setFocusDate((prev) => shiftVisibleMonth(prev, step));
  }

  function onChangeVisibleMonth(nextMonth: Date) {
    setFocusDate((prev) => clampDayInMonth(prev, nextMonth));
  }

  const periodLabel = formatMonthYear(focusDate);

  function renderListContent() {
    if (loadState.blocking) {
      return <ListBusyState blocking message="Loading appointments…" />;
    }

    if (viewMode === 'weekly') {
      return (
        <WeekScheduleGrid
          focusDate={focusDate}
          events={filteredEvents}
          onSelectDay={setFocusDate}
          onPrevWeek={() => shiftPeriod(-1)}
          onNextWeek={() => shiftPeriod(1)}
          onEventPress={openEvent}
          loading={loadState.updating}
          emptyHint={showEmpty ? 'No appointments this week. Tap + to create one.' : undefined}
        />
      );
    }

    if (showContentLoading) {
      return (
        <View style={styles.contentArea}>
          <ContentLoadingOverlay message="Loading appointments…" />
        </View>
      );
    }

    if (showEmpty) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={56} color={theme.colors.surfaceMuted} />
          <Text style={styles.emptyTitle}>No events for {emptyRangeLabel}!</Text>
          <Text style={styles.emptySub}>Tap + to create an appointment.</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentArea}>
        {loadState.updating ? (
          <View style={styles.contentLoadingOverlay} pointerEvents="none">
            <ContentLoadingOverlay message="Updating appointments…" />
          </View>
        ) : null}
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar title="Appointments" onRefresh={() => load({ pull: true })} />

      <View style={styles.toolbar}>
        <Pressable style={styles.viewBtn} onPress={() => setCalendarSheetOpen(true)}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.textOnDark} />
          <Text style={styles.viewBtnText} numberOfLines={1}>
            {calendarId
              ? calendars.find((c) => c.id === calendarId)?.name ?? 'Calendar'
              : 'All calendars'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.mutedTextOnDark} />
        </Pressable>
        <Pressable style={styles.viewBtn} onPress={() => setViewSheetOpen(true)}>
          <Ionicons
            name={viewMode === 'weekly' ? 'grid-outline' : 'list-outline'}
            size={18}
            color={theme.colors.textOnDark}
          />
          <Text style={styles.viewBtnText}>{VIEW_LABELS[viewMode]}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.mutedTextOnDark} />
        </Pressable>
        <Pressable style={styles.todayBtn} onPress={goToToday}>
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

      {viewMode === 'list' ? (
        <View style={styles.periodNav}>
          <Pressable onPress={() => shiftPeriod(-1)} hitSlop={12} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={22} color={theme.colors.link} />
          </Pressable>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <Pressable onPress={() => shiftPeriod(1)} hitSlop={12} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={22} color={theme.colors.link} />
          </Pressable>
        </View>
      ) : null}

      {viewMode === 'monthly' ? (
        <View style={styles.monthWrap}>
          <MonthCalendar
            month={monthCursor}
            selected={focusDate}
            onSelect={setFocusDate}
            onChangeMonth={onChangeVisibleMonth}
            markedDates={markedDates}
          />
        </View>
      ) : null}

      {renderListContent()}

      <FloatingActionButton
        onPress={() => setNewSheetOpen(true)}
        accessibilityLabel="Create appointment"
      />

      <BottomSheet visible={viewSheetOpen} onClose={() => setViewSheetOpen(false)}>
        {(Object.keys(VIEW_LABELS) as CalendarViewMode[]).map((mode) => (
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

      <BottomSheet
        visible={calendarSheetOpen}
        onClose={() => setCalendarSheetOpen(false)}
        title="Calendars"
      >
        <Pressable
          style={styles.sheetRow}
          onPress={() => {
            setCalendarId(null);
            setCalendarSheetOpen(false);
          }}
        >
          <Text style={styles.sheetRowText}>All calendars</Text>
          {!calendarId ? <Ionicons name="checkmark" size={20} color={theme.colors.link} /> : null}
        </Pressable>
        {calendars.map((cal) => (
          <Pressable
            key={cal.id}
            style={styles.sheetRow}
            onPress={() => {
              setCalendarId(cal.id);
              setCalendarSheetOpen(false);
            }}
          >
            <Text style={styles.sheetRowText}>{cal.name ?? cal.id}</Text>
            {calendarId === cal.id ? (
              <Ionicons name="checkmark" size={20} color={theme.colors.link} />
            ) : null}
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
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  periodLabel: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
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
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  contentLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  contentLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
    gap: theme.spacing.sm,
  },
  contentLoadingText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  list: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    gap: theme.spacing.lg,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
