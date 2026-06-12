import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../lib/safeArea';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightDisabled?: boolean;
  rightLoading?: boolean;
  onRefresh?: () => void;
  onSettings?: () => void;
};

export function AppBar({
  title,
  onBack,
  rightLabel,
  rightIcon,
  onRightPress,
  rightDisabled,
  rightLoading,
  onRefresh,
  onSettings,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();

  return (
    <View style={[styles.bar, { paddingTop }]}>
      <Pressable onPress={onBack} style={[styles.side, styles.sideLeft]} hitSlop={8} disabled={!onBack}>
        {onBack ? <Ionicons name="chevron-back" size={24} color={theme.colors.shellForeground} /> : null}
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideRight]}>
        {onRefresh ? (
          <Pressable onPress={onRefresh} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color={theme.colors.shellForeground} />
          </Pressable>
        ) : null}
        {onSettings ? (
          <Pressable onPress={onSettings} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.shellForeground} />
          </Pressable>
        ) : null}
        {rightIcon ? (
          <Pressable onPress={onRightPress} disabled={rightDisabled || rightLoading} hitSlop={8} style={styles.iconBtn}>
            {rightLoading ? (
              <ActivityIndicator size="small" color={theme.colors.shellForeground} />
            ) : (
              <Ionicons name={rightIcon} size={22} color={theme.colors.shellForeground} />
            )}
          </Pressable>
        ) : null}
        {rightLabel ? (
          <Pressable onPress={onRightPress} disabled={rightDisabled || rightLoading} hitSlop={8}>
            {rightLoading ? (
              <ActivityIndicator size="small" color={theme.colors.shellForeground} />
            ) : (
              <Text style={[styles.rightLabel, rightDisabled && styles.rightDisabled]}>{rightLabel}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.shell,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    side: { width: 72, flexDirection: 'row', alignItems: 'center' },
    sideLeft: { justifyContent: 'flex-start' },
    sideRight: { justifyContent: 'flex-end' },
    iconBtn: { marginLeft: theme.spacing.sm },
    title: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.lg,
    },
    rightLabel: {
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    rightDisabled: {
      color: theme.colors.shellForegroundMuted,
      opacity: 0.85,
    },
  });
}
