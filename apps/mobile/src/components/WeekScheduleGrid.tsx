import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  formatWeekRange,
  isSameDay,
  startOfWeekSunday,
  timezoneAbbrev,
} from '../lib/dates';
import {
  bucketWeekEventsByDay,
  earliestWeekEventTop,
  WEEK_GRID_CONTENT_HEIGHT,
  WEEK_GRID_HOUR_HEIGHT,
  WEEK_GRID_HOURS,
  type WeekGridEvent,
} from '../lib/weekScheduleGrid';
import { theme } from '../theme';

export type ScheduleEvent = WeekGridEvent;

type Props = {
  focusDate: Date;
  events: ScheduleEvent[];
  onSelectDay: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onEventPress: (event: ScheduleEvent) => void;
  /** When true, show a single-day column (daily agenda). */
  daily?: boolean;
  loading?: boolean;
  emptyHint?: string;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfDayCopy(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

const DayColumn = React.memo(function DayColumn({
  placed,
  active,
  onEventPress,
}: {
  placed: Array<{ event: ScheduleEvent; top: number; height: number }>;
  active: boolean;
  onEventPress: (event: ScheduleEvent) => void;
}) {
  return (
    <View style={styles.dayCol}>
      {WEEK_GRID_HOURS.map((h) => (
        <View
          key={h}
          style={[styles.hourCell, { height: WEEK_GRID_HOUR_HEIGHT }, active && styles.hourCellActive]}
        />
      ))}
      {placed.map(({ event, top, height }) => (
        <Pressable
          key={event.id}
          style={[styles.eventBlock, { top, height }]}
          onPress={() => onEventPress(event)}
        >
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title ?? 'Appointment'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

export function WeekScheduleGrid({
  focusDate,
  events,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  onEventPress,
  daily = false,
  loading = false,
  emptyHint,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const weekStart = useMemo(
    () => (daily ? startOfDayCopy(focusDate) : startOfWeekSunday(focusDate)),
    [focusDate, daily],
  );
  const weekEnd = useMemo(
    () => (daily ? startOfDayCopy(focusDate) : addDays(weekStart, 6)),
    [weekStart, focusDate, daily],
  );
  const days = useMemo(
    () =>
      daily
        ? [startOfDayCopy(focusDate)]
        : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart, focusDate, daily],
  );
  const eventsByDay = useMemo(
    () => bucketWeekEventsByDay(events, weekStart, days.length),
    [events, weekStart, days.length],
  );
  const placedCount = useMemo(
    () => eventsByDay.reduce((sum, col) => sum + col.length, 0),
    [eventsByDay],
  );

  useEffect(() => {
    if (loading) return;
    const top = placedCount > 0 ? earliestWeekEventTop(eventsByDay) : null;
    const y =
      top != null
        ? Math.max(0, top - WEEK_GRID_HOUR_HEIGHT)
        : 7 * WEEK_GRID_HOUR_HEIGHT;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [eventsByDay, loading, placedCount, weekStart]);

  const tz = timezoneAbbrev(focusDate);
  const rangeLabel = daily
    ? focusDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : formatWeekRange(weekStart, weekEnd);
  const showEmptyHint = Boolean(emptyHint) && !loading && events.length === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable onPress={onPrevWeek} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.link} />
        </Pressable>
        <Text style={styles.rangeLabel} numberOfLines={1}>
          {rangeLabel}
        </Text>
        <Pressable onPress={onNextWeek} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.link} />
        </Pressable>
      </View>

      <View style={styles.dayHeaderRow}>
        <Text style={styles.tzLabel}>{tz ? `(${tz})` : ''}</Text>
        {days.map((day) => {
          const active = isSameDay(day, focusDate);
          const dayIdx = day.getDay();
          return (
            <Pressable key={day.toISOString()} style={styles.dayHead} onPress={() => onSelectDay(day)}>
              <Text style={styles.dayLetter}>{WEEKDAY_LABELS[dayIdx]}</Text>
              <View style={[styles.dayNumCircle, active && styles.dayNumCircleActive]}>
                <Text style={[styles.dayNum, active && styles.dayNumActive]}>{day.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridRow}>
          <View style={styles.timeCol}>
            {WEEK_GRID_HOURS.map((h) => (
              <View key={h} style={[styles.timeCell, { height: WEEK_GRID_HOUR_HEIGHT }]}>
                <Text style={styles.timeLabel}>
                  {new Date(2000, 0, 1, h).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.daysRow}>
            {days.map((day, dayOffset) => (
              <DayColumn
                key={day.toISOString()}
                placed={eventsByDay[dayOffset] ?? []}
                active={isSameDay(day, focusDate)}
                onEventPress={onEventPress}
              />
            ))}
          </View>
        </View>
        {showEmptyHint ? (
          <View style={styles.emptyHintWrap}>
            <Text style={styles.emptyHintText}>{emptyHint}</Text>
          </View>
        ) : null}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={theme.colors.link} size="large" />
          <Text style={styles.loadingText}>Loading appointments…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, position: 'relative' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  rangeLabel: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
    marginHorizontal: theme.spacing.sm,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tzLabel: {
    width: 40,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  dayHead: { flex: 1, alignItems: 'center', gap: 2 },
  dayLetter: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 11,
  },
  dayNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumCircleActive: { backgroundColor: theme.colors.link },
  dayNum: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  dayNumActive: { color: theme.colors.navy, fontFamily: theme.typography.fontFamily.bold },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    minHeight: WEEK_GRID_CONTENT_HEIGHT,
  },
  timeCol: { width: 44 },
  timeCell: { justifyContent: 'flex-start', paddingTop: 2 },
  timeLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 4,
  },
  daysRow: { flex: 1, flexDirection: 'row' },
  dayCol: {
    flex: 1,
    position: 'relative',
    minHeight: WEEK_GRID_CONTENT_HEIGHT,
    overflow: 'visible',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  hourCell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  hourCellActive: { backgroundColor: 'rgba(96, 165, 250, 0.06)' },
  eventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    zIndex: 2,
    elevation: 2,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  eventTitle: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: 10,
  },
  emptyHintWrap: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyHintText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
});
