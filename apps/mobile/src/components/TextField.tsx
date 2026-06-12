import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, !label && styles.inputNoLabel]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inputPlaceholder}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    label: { color: theme.colors.foregroundMuted, fontFamily: theme.typography.fontFamily.medium },
    input: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      color: theme.colors.foreground,
      backgroundColor: theme.colors.surface,
      fontFamily: theme.typography.fontFamily.regular,
    },
    inputNoLabel: {
      marginTop: 0,
    },
  });
}
