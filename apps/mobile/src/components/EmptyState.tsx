import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    wrap: {
      paddingTop: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.xl,
      alignItems: 'center',
    },
    title: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.lg,
      textAlign: 'center',
    },
    sub: {
      marginTop: theme.spacing.sm,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight.md,
    },
  });
}
