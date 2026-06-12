import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import type { InboxTab } from '../../lib/conversations';

const TABS: { key: InboxTab; label: string }[] = [
  { key: 'team', label: 'Team Inbox' },
  { key: 'mine', label: 'My Inbox' },
];

type Props = {
  active: InboxTab;
  onChange: (tab: InboxTab) => void;
};

export function InboxTabBar({ active, onChange }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
            {selected ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      marginRight: theme.spacing['2xl'],
      position: 'relative',
    },
    indicator: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      backgroundColor: theme.colors.link,
      borderRadius: 1,
    },
    tabLabel: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    },
    tabLabelActive: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
}
