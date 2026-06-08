import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export function DetailRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  if (!value?.trim()) return null;

  const content = (
    <View style={[styles.row, onPress && styles.rowPressable]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, onPress && styles.valueLink]}>{value}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  rowPressable: {
    borderColor: theme.colors.link,
  },
  label: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.md,
  },
  valueLink: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});
