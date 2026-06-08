import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatTaskDueDate,
  isTaskOverdue,
  stripTaskBodyHtml,
  taskStatusLabel,
  type Task,
} from '../../lib/tasks';
import { theme } from '../../theme';

type Props = {
  task: Task;
  onPress: () => void;
};

export function TaskRow({ task, onPress }: Props) {
  const dueLabel = formatTaskDueDate(task.dueDate);
  const assignee = task.assigneeName?.trim() || 'Unassigned';
  const bodyPreview = stripTaskBodyHtml(task.body);
  const overdue = isTaskOverdue(task);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        task.completed && styles.cardCompleted,
        overdue && !task.completed && styles.cardOverdue,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <View style={styles.metaBlock}>
          {task.contactName ? (
            <Text style={[styles.contactName, task.completed && styles.mutedText]} numberOfLines={1}>
              {task.contactName}
            </Text>
          ) : null}
          {dueLabel ? (
            <Text style={[styles.metaDate, overdue && !task.completed && styles.overdueDate]} numberOfLines={1}>
              {dueLabel}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.statusPill,
            task.completed && styles.statusPillCompleted,
            overdue && !task.completed && styles.statusPillOverdue,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              task.completed && styles.statusPillTextCompleted,
              overdue && !task.completed && styles.statusPillTextOverdue,
            ]}
          >
            {overdue && !task.completed ? 'Overdue' : taskStatusLabel(task.completed)}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, task.completed && styles.titleCompleted]} numberOfLines={2}>
        {task.title || 'Untitled task'}
      </Text>

      {bodyPreview ? (
        <Text style={[styles.body, task.completed && styles.mutedText]} numberOfLines={3}>
          {bodyPreview}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.assigneeChip}>
          <Ionicons name="person-outline" size={14} color={theme.colors.mutedTextOnDark} />
          <Text style={styles.assigneeText} numberOfLines={1}>
            {assignee}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedTextOnDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  cardCompleted: {
    opacity: 0.82,
  },
  cardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  cardPressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metaBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contactName: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  metaDate: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  overdueDate: {
    color: '#FCA5A5',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusPillCompleted: {
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  statusPillOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusPillText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 11,
  },
  statusPillTextCompleted: {
    color: '#86EFAC',
  },
  statusPillTextOverdue: {
    color: '#FCA5A5',
  },
  title: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
    lineHeight: theme.typography.lineHeight.lg,
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.mutedTextOnDark,
  },
  body: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    marginBottom: theme.spacing.md,
  },
  mutedText: {
    color: theme.colors.mutedTextOnDark,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  assigneeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  assigneeText: {
    flex: 1,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
});
