import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

type FilterPill = {
  key: string;
  label: string;
  active?: boolean;
  onPress: () => void;
};

type Props = {
  pills: FilterPill[];
};

export function NotificationFilterBar({ pills }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {pills.map((pill) => (
          <Pressable
            key={pill.key}
            style={[styles.pill, pill.active && styles.pillActive]}
            onPress={pill.onPress}
            accessibilityRole="button"
            accessibilityLabel={pill.label}
          >
            <Text style={[styles.pillText, pill.active && styles.pillTextActive]}>{pill.label}</Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={pill.active ? theme.colors.link : theme.colors.foregroundMuted}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    wrap: {
      flexGrow: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.xs,
    },
    pillActive: {
      borderColor: theme.colors.link,
      backgroundColor: `${theme.colors.primary}1F`,
    },
    pillText: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    pillTextActive: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
}
