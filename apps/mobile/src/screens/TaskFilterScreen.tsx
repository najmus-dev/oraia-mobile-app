import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../lib/safeArea';
import {
  DEFAULT_TASK_FILTERS,
  sortLabel,
  statusFilterLabel,
  type TaskFilters,
  type TaskSortOrder,
  type TaskStatusFilter,
} from '../lib/tasks';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { finishWizardFlow } from '../lib/stackNavigation';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'TaskFilters'>;

export function TaskFilterScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();
  const [filters, setFilters] = useState<TaskFilters>(route.params?.filters ?? DEFAULT_TASK_FILTERS);

  useEffect(() => {
    const ids = route.params?.pickedAssigneeIds;
    if (ids) {
      setFilters((prev) => ({ ...prev, assigneeIds: ids }));
      navigation.setParams({ pickedAssigneeIds: undefined });
    }
    const contactIds = route.params?.pickedContactIds;
    if (contactIds) {
      setFilters((prev) => ({ ...prev, contactIds }));
      navigation.setParams({ pickedContactIds: undefined });
    }
  }, [route.params?.pickedAssigneeIds, route.params?.pickedContactIds, navigation]);

  function badgeCount(key: 'contactIds' | 'assigneeIds' | 'status'): number {
    if (key === 'contactIds') return filters.contactIds.length;
    if (key === 'assigneeIds') return filters.assigneeIds.length;
    if (key === 'status') return filters.status !== 'all' ? 1 : 0;
    return 0;
  }

  function apply() {
    finishWizardFlow(navigation, {
      name: 'TasksHome',
      params: { appliedFilters: filters },
    });
  }

  function clearAll() {
    setFilters(DEFAULT_TASK_FILTERS);
  }

  function cycleStatus() {
    const next: TaskStatusFilter =
      filters.status === 'all' ? 'pending' : filters.status === 'pending' ? 'completed' : 'all';
    setFilters((prev) => ({ ...prev, status: next }));
  }

  function cycleSort() {
    const next: TaskSortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters((prev) => ({ ...prev, sortOrder: next }));
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={styles.title}>Filter</Text>
        <View style={{ width: 24 }} />
      </View>

      <FilterRow
        label="Contacts"
        value={
          filters.contactIds.length > 0
            ? `${filters.contactIds.length} selected`
            : 'All contacts'
        }
        badge={badgeCount('contactIds')}
        onPress={() =>
          navigation.navigate('PickContact', {
            flow: 'taskFilter',
            selectedContactIds: filters.contactIds,
            filters,
          })
        }
      />
      <FilterRow
        label="Assignee"
        value={
          filters.assigneeIds.length > 0
            ? `${filters.assigneeIds.length} selected`
            : 'All assignees'
        }
        badge={badgeCount('assigneeIds')}
        onPress={() =>
          navigation.navigate('SelectAssignees', {
            mode: 'multi',
            selectedIds: filters.assigneeIds,
            returnTo: 'TaskFilters',
            filters,
          })
        }
      />
      <FilterRow
        label="Status"
        value={statusFilterLabel(filters.status)}
        badge={badgeCount('status')}
        onPress={cycleStatus}
      />
      <FilterRow label="Sort by" value={sortLabel(filters)} onPress={cycleSort} />

      <View style={styles.footer}>
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
        <Pressable style={styles.applyBtn} onPress={apply}>
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterRow({
  label,
  value,
  badge,
  onPress,
}: {
  label: string;
  value: string;
  badge?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <View style={styles.rowRight}>
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.foregroundMuted} />
      </View>
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLeft: { flex: 1, gap: 4, paddingRight: theme.spacing.md },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  rowLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.lg,
  },
  rowValue: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 12,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cancelBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  cancelText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  clearBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: `${theme.colors.primary}59`,
  },
  clearText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  applyBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: theme.colors.link,
  },
  applyText: {
    color: theme.colors.navy,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
}
