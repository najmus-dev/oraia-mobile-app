import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { statusFilterLabel, type TaskFilters } from '../../lib/tasks';
import { theme } from '../../theme';

type Props = {
  count: number;
  filters: TaskFilters;
  query: string;
  loading?: boolean;
};

export function TaskListSummary({ count, filters, query, loading }: Props) {
  const q = query.trim();
  let label = loading ? 'Loading…' : `${count} ${count === 1 ? 'task' : 'tasks'}`;
  if (!loading && q) label = `${count} result${count === 1 ? '' : 's'} for “${q}”`;
  else if (!loading && filters.status !== 'all') {
    label = `${count} ${statusFilterLabel(filters.status).toLowerCase()} ${count === 1 ? 'task' : 'tasks'}`;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  text: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
});
