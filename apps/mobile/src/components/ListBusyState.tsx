import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  /** Full-screen centered spinner (first load). */
  blocking?: boolean;
  message?: string;
  /** @deprecated use message */
  label?: string;
};

/** Inline or blocking loading indicator for list screens. */
export function ListBusyState({ blocking, message, label }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const text = message ?? label;

  if (blocking) {
    return (
      <View style={styles.blocking}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        {text ? <Text style={styles.msg}>{text}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.inline}>
      <ActivityIndicator color={theme.colors.primary} />
      {text ? <Text style={styles.msg}>{text}</Text> : null}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    blocking: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing['2xl'],
      gap: theme.spacing.md,
    },
    inline: {
      paddingVertical: theme.spacing.xl,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    msg: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
