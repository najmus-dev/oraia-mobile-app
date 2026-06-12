import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import type { InboxFilter } from '../../lib/conversations';

type Props = {
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  onOpenFilterSheet: () => void;
};

export function InboxFilterBar({ filter, onFilterChange, onOpenFilterSheet }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const recentActive = filter === 'recents';
  const filterActive = filter !== 'all' && filter !== 'recents';

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
      <Pressable style={styles.iconBtn} accessibilityLabel="Quick actions">
        <Ionicons name="flash-outline" size={18} color={theme.colors.foregroundMuted} />
      </Pressable>

      <Pressable
        style={[styles.filterBtn, filterActive && styles.filterBtnActive]}
        onPress={onOpenFilterSheet}
        accessibilityRole="button"
      >
        <Ionicons name="options-outline" size={16} color={theme.colors.foreground} />
        <Text style={styles.filterText}>Filter</Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.foregroundMuted} />
      </Pressable>

      <Pressable
        style={[styles.chip, recentActive && styles.chipActive]}
        onPress={() => onFilterChange(recentActive ? 'all' : 'recents')}
      >
        <Text style={[styles.chipText, recentActive && styles.chipTextActive]}>Recent</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  const linkTint = `${theme.colors.link}1F`;

  return StyleSheet.create({
    wrap: {
      flexGrow: 0,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    filterBtn: {
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
    filterBtnActive: {
      borderColor: theme.colors.link,
      backgroundColor: linkTint,
    },
    filterText: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    chip: {
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    chipActive: {
      borderColor: theme.colors.link,
      backgroundColor: linkTint,
    },
    chipText: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    chipTextActive: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
}
