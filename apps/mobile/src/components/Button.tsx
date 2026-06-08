import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'dark' && styles.dark,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        (pressed || disabled) && { opacity: disabled ? 0.55 : 0.92 },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'ghost' ? { color: theme.colors.secondary } : { color: theme.colors.white },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  primary: { backgroundColor: theme.colors.primary },
  dark: { backgroundColor: theme.colors.navy },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.secondary },
  danger: { backgroundColor: theme.colors.danger },
  text: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});

