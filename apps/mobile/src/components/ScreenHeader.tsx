import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../lib/safeArea';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSettings?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  actionAccessibilityLabel?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  onSettings,
  actionIcon,
  onAction,
  actionAccessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding(true);

  return (
    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={theme.colors.secondary} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
        {onSettings ? (
          <Pressable onPress={onSettings} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={20} color={theme.colors.shellForeground} />
          </Pressable>
        ) : onAction && actionIcon ? (
          <Pressable
            onPress={onAction}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel ?? 'Action'}
          >
            <Ionicons name={actionIcon} size={22} color={theme.colors.shellForeground} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.shell,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize['2xl'],
      lineHeight: theme.typography.lineHeight.xl,
      letterSpacing: 0.5,
    },
    sub: {
      marginTop: theme.spacing.xs,
      color: theme.colors.shellForegroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
