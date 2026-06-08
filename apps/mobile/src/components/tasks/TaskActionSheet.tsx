import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { theme } from '../../theme';
import type { Task } from '../../lib/tasks';

type Props = {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onViewContact: () => void;
  onDelete: () => void;
};

export function TaskActionSheet({
  visible,
  task,
  onClose,
  onToggleComplete,
  onEdit,
  onViewContact,
  onDelete,
}: Props) {
  if (!task) return null;

  const canMutate = Boolean(task.contactId);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ActionRow
        icon={task.completed ? 'time-outline' : 'checkmark-circle-outline'}
        label={task.completed ? 'Mark as pending' : 'Mark as completed'}
        onPress={onToggleComplete}
        disabled={!canMutate}
      />
      <ActionRow icon="create-outline" label="Edit task" onPress={onEdit} disabled={!canMutate} />
      {task.contactId ? (
        <ActionRow icon="person-outline" label="View Contact info" onPress={onViewContact} />
      ) : null}
      <ActionRow
        icon="trash-outline"
        label="Delete task"
        onPress={onDelete}
        destructive
        disabled={!canMutate}
      />
      {!canMutate ? (
        <Text style={styles.hint}>This task has no linked contact, so it cannot be updated here.</Text>
      ) : null}
    </BottomSheet>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  destructive,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionRow, disabled && styles.actionRowDisabled]}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          disabled
            ? theme.colors.mutedTextOnDark
            : destructive
              ? theme.colors.danger
              : theme.colors.textOnDark
        }
      />
      <Text
        style={[
          styles.actionText,
          destructive && !disabled && styles.destructiveText,
          disabled && styles.actionTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  actionText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  destructiveText: {
    color: theme.colors.danger,
  },
  actionRowDisabled: {
    opacity: 0.45,
  },
  actionTextDisabled: {
    color: theme.colors.mutedTextOnDark,
  },
  hint: {
    paddingTop: theme.spacing.md,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
});
