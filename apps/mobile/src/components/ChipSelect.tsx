import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

export type ChipOption = { id: string; label: string };

export function ChipSelect({
  options,
  value,
  onChange,
  includeAllLabel,
}: {
  options: ChipOption[];
  value: string;
  onChange: (id: string) => void;
  includeAllLabel?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {includeAllLabel ? (
        <Pressable
          onPress={() => onChange('')}
          style={[styles.chip, !value && styles.chipActive]}
        >
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>{includeAllLabel}</Text>
        </Pressable>
      ) : null}
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    scroll: { flexGrow: 0, flexShrink: 0 },
    row: {
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxWidth: 200,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    chipTextActive: {
      color: theme.colors.white,
    },
  });
}
