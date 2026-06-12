import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

export type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  actions: QuickAction[];
};

export function ContactQuickActions({ actions }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          style={[styles.action, action.disabled && styles.actionDisabled]}
          onPress={action.onPress}
          disabled={action.disabled}
        >
          <View style={styles.iconBox}>
            <Ionicons
              name={action.icon}
              size={22}
              color={action.disabled ? theme.colors.foregroundMuted : theme.colors.link}
            />
          </View>
          <Text style={[styles.label, action.disabled && styles.labelDisabled]}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  row: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  action: {
    width: 76,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionDisabled: { opacity: 0.45 },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
  labelDisabled: {
    color: theme.colors.foregroundMuted,
  },
});
}
