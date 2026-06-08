import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  formatWeekRange,
  isSameDay,
  startOfWeekSunday,
  timezoneAbbrev,
} from '../lib/dates';
import { theme } from '../theme';

export type ScheduleEvent = {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
};

type Props = {
  focusDate: Date;
  events: ScheduleEvent[];
  onSelectDay: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onEventPress: (event: ScheduleEvent) => void;
  /** When true, show a single-day column (daily agenda). */
  daily?: boolean;
};

type PlacedEvent = {
  event: ScheduleEvent;
  top: number;
  height: number;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function startOfDayCopy(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function placeEventOnGrid(event: ScheduleEvent): PlacedEvent | null {
  if (!event.startTime) return null;
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 45 * 60 * 1000);
  const startMins = start.getHours() * 60 + start.getMinutes();
  const endMins = end.getHours() * 60 + end.getMinutes();
  const gridStart = START_HOUR * 60;
  const top = ((startMins - gridStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 22);
  if (top + height < 0 || top > (END_HOUR - START_HOUR) * HOUR_HEIGHT) return null;
  return { event, top, height };
}

function bucketEventsByDay(
  events: ScheduleEvent[],
  weekStart: Date,
  dayCount: number,
): PlacedEvent[][] {
  const cols: PlacedEvent[][] = Array.from({ length: dayCount }, () => []);
  for (const event of events) {
    if (!event.startTime) continue;
    const start = new Date(event.startTime);
    const dayStart = startOfDayCopy(start);
    const dayIndex = Math.round((dayStart.getTime() - weekStart.getTime()) / 86_400_000);
    if (dayIndex < 0 || dayIndex >= dayCount) continue;
    const placed = placeEventOnGrid(event);
    if (placed) cols[dayIndex].push(placed);
  }
  return cols;
}

const DayColumn = React.memo(function DayColumn({
  placed,
  active,
  onEventPress,
}: {
  placed: PlacedEvent[];
  active: boolean;
  onEventPress: (event: ScheduleEvent) => void;
}) {
  return (
    <View style={styles.dayCol}>
      {HOURS.map((h) => (
        <View
          key={h}
          style={[styles.hourCell, { height: HOUR_HEIGHT }, active && styles.hourCellActive]}
        />
      ))}
      {placed.map(({ event, top, height }) => (
        <Pressable
          key={event.id}
          style={[styles.eventBlock, { top, height, left: 2, right: 2 }]}
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
}: Props) {
  const weekStart = useMemo(
    () => (daily ? startOfDayCopy(focusDate) : startOfWeekSunday(focusDate)),
    [focusDate, daily],
  );
  const weekEnd = useMemo(
    () => (daily ? startOfDayCopy(focusDate) : addDays(weekStart, 6)),
    [weekStart, focusDate, daily],
  );
  const days = useMemo(
    () => (daily ? [startOfDayCopy(focusDate)] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))),
    [weekStart, focusDate, daily],
  );
  const eventsByDay = useMemo(
    () => bucketEventsByDay(events, weekStart, days.length),
    [events, weekStart, days.length],
  );
  const tz = timezoneAbbrev(focusDate);
  const rangeLabel = daily
    ? focusDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : formatWeekRange(weekStart, weekEnd);

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

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.gridRow}>
          <View style={styles.timeCol}>
            {HOURS.map((h) => (
              <View key={h} style={[styles.timeCell, { height: HOUR_HEIGHT }]}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
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
  gridRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.sm },
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
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  eventTitle: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: 10,
  },
});
