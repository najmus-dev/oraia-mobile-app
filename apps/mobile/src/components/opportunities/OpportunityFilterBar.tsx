import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

type Props = {
  pipelineName: string;
  filterCount: number;
  sortLabel: string;
  onPipelinePress: () => void;
  onFiltersPress: () => void;
  onSortPress: () => void;
};

export function OpportunityFilterBar({
  pipelineName,
  filterCount,
  sortLabel,
  onPipelinePress,
  onFiltersPress,
  onSortPress,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const filtersActive = filterCount > 0;

  return (
    <View style={styles.bar}>
      <Pressable
        style={[styles.chip, styles.pipelineChip]}
        onPress={onPipelinePress}
        accessibilityRole="button"
        accessibilityLabel={`Pipeline: ${pipelineName}`}
      >
        <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
          {pipelineName}
        </Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.foregroundMuted} />
      </Pressable>

      <Pressable
        style={[styles.chip, styles.compactChip, filtersActive && styles.chipActive]}
        onPress={onFiltersPress}
        accessibilityRole="button"
        accessibilityLabel={filtersActive ? `Filters, ${filterCount} active` : 'Filters'}
      >
        <Text style={[styles.chipText, filtersActive && styles.chipTextActive]}>Filters</Text>
        {filtersActive ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{filterCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        style={[styles.chip, styles.compactChip]}
        onPress={onSortPress}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${sortLabel}`}
      >
        <Text style={styles.chipText} numberOfLines={1}>
          {sortLabel}
        </Text>
        <Ionicons name="swap-vertical" size={14} color={theme.colors.foregroundMuted} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pipelineChip: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
  },
  compactChip: {
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: `${theme.colors.primary}52`,
    borderColor: `${theme.colors.primary}73`,
  },
  chipText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    flexShrink: 1,
  },
  chipTextActive: {
    color: theme.colors.foreground,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
  },
});
}
