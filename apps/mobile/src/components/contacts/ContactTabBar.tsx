import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export type ContactTab = 'details' | 'tasks' | 'notes';

type TabDef = {
  id: ContactTab;
  label: string;
  badge?: number;
};

type Props = {
  active: ContactTab;
  onChange: (tab: ContactTab) => void;
  taskCount?: number;
};

export function ContactTabBar({ active, onChange, taskCount = 0 }: Props) {
  const tabs: TabDef[] = [
    { id: 'details', label: 'Details' },
    { id: 'tasks', label: 'Tasks', badge: taskCount > 0 ? taskCount : undefined },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            <View style={styles.tabInner}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
              {tab.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              ) : null}
            </View>
            {selected ? <View style={styles.indicator} /> : <View style={styles.indicatorSpacer} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    marginRight: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  tabLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  tabLabelActive: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  badgeText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: 10,
  },
  indicator: {
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.link,
  },
  indicatorSpacer: {
    height: 2,
  },
});
