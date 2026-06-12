import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, isSameDay, toDateKey } from '../lib/dates';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  month: Date;
  selected: Date;
  onSelect: (date: Date) => void;
  onChangeMonth: (next: Date) => void;
  markedDates?: Set<string>;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthCalendar({ month, selected, onSelect, onChangeMonth, markedDates }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const cells = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const grid: (Date | null)[] = [];
    for (let i = 0; i < start.getDay(); i += 1) grid.push(null);
    for (let day = 1; day <= end.getDate(); day += 1) {
      grid.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    return grid;
  }, [month]);

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable onPress={() => onChangeMonth(addMonths(month, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.link} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => onChangeMonth(addMonths(month, 1))} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.link} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, idx) => {
          if (!date) return <View key={`empty-${idx}`} style={styles.cell} />;
          const active = isSameDay(date, selected);
          const hasEvent = markedDates?.has(toDateKey(date));
          return (
            <Pressable key={date.toISOString()} style={styles.cell} onPress={() => onSelect(date)}>
              <View style={[styles.dayCircle, active && styles.dayCircleActive]}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{date.getDate()}</Text>
              </View>
              {hasEvent ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  monthLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: theme.colors.link },
  dayText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  dayTextActive: { color: theme.colors.navy, fontFamily: theme.typography.fontFamily.bold },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.secondary,
    marginTop: 2,
  },
});
}
