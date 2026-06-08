import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { TaskSortOrder, TaskStatusFilter } from '../../lib/tasks';

type Props = {
  status: TaskStatusFilter;
  sortOrder: TaskSortOrder;
  onStatusChange: (status: TaskStatusFilter) => void;
  onSortChange: (sortOrder: TaskSortOrder) => void;
};

const STATUS_CHIPS: { id: TaskStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

export function TaskFilterBar({
  status,
  sortOrder,
  onStatusChange,
  onSortChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusRow}
        keyboardShouldPersistTaps="handled"
      >
        {STATUS_CHIPS.map((chip) => {
          const active = status === chip.id;
          return (
            <Pressable
              key={chip.id}
              style={[styles.statusChip, active && styles.statusChipActive]}
              onPress={() => onStatusChange(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.statusText, active && styles.statusTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort</Text>
        <Pressable
          style={[styles.sortChip, sortOrder === 'asc' && styles.sortChipActive]}
          onPress={() => onSortChange('asc')}
          accessibilityRole="button"
          accessibilityState={{ selected: sortOrder === 'asc' }}
        >
          <Ionicons
            name="arrow-up"
            size={14}
            color={sortOrder === 'asc' ? theme.colors.link : theme.colors.mutedTextOnDark}
          />
          <Text style={[styles.sortText, sortOrder === 'asc' && styles.sortTextActive]}>Due date</Text>
        </Pressable>
        <Pressable
          style={[styles.sortChip, sortOrder === 'desc' && styles.sortChipActive]}
          onPress={() => onSortChange('desc')}
          accessibilityRole="button"
          accessibilityState={{ selected: sortOrder === 'desc' }}
        >
          <Ionicons
            name="arrow-down"
            size={14}
            color={sortOrder === 'desc' ? theme.colors.link : theme.colors.mutedTextOnDark}
          />
          <Text style={[styles.sortText, sortOrder === 'desc' && styles.sortTextActive]}>Due date</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.shell,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  statusChip: {
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  statusChipActive: {
    backgroundColor: theme.colors.link,
    borderColor: theme.colors.link,
  },
  statusText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  statusTextActive: {
    color: theme.colors.navy,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  sortLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginRight: 2,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  sortChipActive: {
    borderColor: 'rgba(134, 182, 255, 0.45)',
    backgroundColor: 'rgba(91, 127, 212, 0.18)',
  },
  sortText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  sortTextActive: {
    color: theme.colors.textOnDark,
  },
});
