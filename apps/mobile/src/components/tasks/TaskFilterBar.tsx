import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onStatusChange(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortChips}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={[styles.chip, sortOrder === 'asc' && styles.chipActive]}
            onPress={() => onSortChange('asc')}
            accessibilityRole="button"
            accessibilityState={{ selected: sortOrder === 'asc' }}
          >
            <Ionicons
              name="arrow-up"
              size={14}
              color={sortOrder === 'asc' ? theme.colors.link : theme.colors.foregroundMuted}
            />
            <Text style={[styles.chipText, sortOrder === 'asc' && styles.chipTextActive]}>
              Due date
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, sortOrder === 'desc' && styles.chipActive]}
            onPress={() => onSortChange('desc')}
            accessibilityRole="button"
            accessibilityState={{ selected: sortOrder === 'desc' }}
          >
            <Ionicons
              name="arrow-down"
              size={14}
              color={sortOrder === 'desc' ? theme.colors.link : theme.colors.foregroundMuted}
            />
            <Text style={[styles.chipText, sortOrder === 'desc' && styles.chipTextActive]}>
              Due date
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  const activeTint = `${theme.colors.link}1F`;

  return StyleSheet.create({
    wrap: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sortLabel: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
      flexShrink: 0,
    },
    sortChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    chipActive: {
      borderColor: theme.colors.link,
      backgroundColor: activeTint,
    },
    chipText: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    chipTextActive: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
}
