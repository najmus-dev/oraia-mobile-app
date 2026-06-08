import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
};

export function FormPickerField({ label, value, placeholder, icon, onPress, disabled }: Props) {
  return (
    <Pressable style={[styles.field, disabled && styles.fieldDisabled]} onPress={disabled ? undefined : onPress}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.mutedTextOnDark} /> : null}
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder || 'Select'}
        </Text>
        {disabled ? null : (
          <Ionicons name="chevron-down" size={18} color={theme.colors.mutedTextOnDark} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  label: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  value: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  placeholder: { color: theme.colors.mutedTextOnDark },
  fieldDisabled: { opacity: 0.72 },
});
