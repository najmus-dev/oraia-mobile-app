import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

type Props = {
  label: string;
  onPress: () => void;
};

export function ContactFilterPill({ label, onPress }: Props) {
  return (
    <Pressable style={styles.pill} onPress={onPress} accessibilityRole="button">
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={theme.colors.link} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(47, 45, 121, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(134, 182, 255, 0.25)',
  },
  label: {
    flexShrink: 1,
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
});
