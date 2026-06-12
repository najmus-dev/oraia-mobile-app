import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
};

export function FormPickerField({ label, value, placeholder, icon, onPress, disabled }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable style={[styles.field, disabled && styles.fieldDisabled]} onPress={disabled ? undefined : onPress}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.foregroundMuted} /> : null}
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder || 'Select'}
        </Text>
        {disabled ? null : (
          <Ionicons name="chevron-down" size={18} color={theme.colors.foregroundMuted} />
        )}
      </View>
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    field: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    label: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
      marginBottom: 6,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    value: {
      flex: 1,
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    },
    placeholder: { color: theme.colors.foregroundMuted },
    fieldDisabled: { opacity: 0.72 },
  });
}
