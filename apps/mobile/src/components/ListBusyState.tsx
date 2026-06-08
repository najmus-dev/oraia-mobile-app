import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  /** Full-screen centered spinner (first load). */
  blocking?: boolean;
  message?: string;
  /** @deprecated use message */
  label?: string;
};

/** Inline or blocking loading indicator for list screens. */
export function ListBusyState({ blocking, message, label }: Props) {
  const text = message ?? label;
  if (blocking) {
    return (
      <View style={styles.blocking}>
        <ActivityIndicator color={theme.colors.link} size="large" />
        {text ? <Text style={styles.msg}>{text}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.inline}>
      <ActivityIndicator color={theme.colors.link} />
      {text ? <Text style={styles.msg}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
});
