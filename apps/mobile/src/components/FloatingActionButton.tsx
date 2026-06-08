import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FAB_BOTTOM, FAB_RIGHT, FAB_SIZE } from '../lib/fabLayout';
import { theme } from '../theme';

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

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 16,
    backgroundColor: theme.colors.link,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
  },
});
