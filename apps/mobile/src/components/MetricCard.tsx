import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

export function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const resolvedAccent = accent ?? theme.colors.secondary;

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${resolvedAccent}22` }]}>
        <Ionicons name={icon} size={18} color={resolvedAccent} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 108,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    value: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.xl,
      lineHeight: theme.typography.lineHeight.lg,
    },
    label: {
      marginTop: theme.spacing.xs,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}
