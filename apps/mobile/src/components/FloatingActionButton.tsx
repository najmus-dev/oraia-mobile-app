import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FAB_BOTTOM, FAB_RIGHT, FAB_SIZE } from '../lib/fabLayout';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  /** Override bottom offset (defaults to tab-screen spacing). */
  bottom?: number;
  style?: ViewStyle;
};

export function FloatingActionButton({
  onPress,
  accessibilityLabel,
  bottom = FAB_BOTTOM,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      style={[styles.fab, { bottom, right: FAB_RIGHT }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="add" size={28} color={theme.colors.navy} />
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.link,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.fab,
      zIndex: 20,
    },
  });
}
