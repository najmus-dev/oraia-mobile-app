import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import type { InboxFilter } from '../../lib/conversations';

const OPTIONS: { key: InboxFilter; label: string; description?: string }[] = [
  { key: 'all', label: 'All conversations', description: 'Show every conversation' },
  { key: 'recents', label: 'Recent', description: 'Recently updated threads' },
  { key: 'unread', label: 'Unread', description: 'Threads with unread messages' },
  { key: 'starred', label: 'Starred', description: 'Starred conversations only' },
];

type Props = {
  visible: boolean;
  selected: InboxFilter;
  onClose: () => void;
  onSelect: (filter: InboxFilter) => void;
};

export function InboxFilterSheet({ visible, selected, onClose, onSelect }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filters">
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const active = option.key === selected;
          return (
            <Pressable
              key={option.key}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => {
                onSelect(option.key);
                onClose();
              }}
            >
              <View style={styles.rowText}>
                <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
                {option.description ? (
                  <Text style={styles.description}>{option.description}</Text>
                ) : null}
              </View>
              {active ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    list: {
      paddingBottom: theme.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 10,
      marginBottom: theme.spacing.xs,
    },
    rowActive: {
      backgroundColor: 'rgba(47, 45, 121, 0.35)',
    },
    rowText: { flex: 1, marginRight: theme.spacing.md },
    label: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    },
    labelActive: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    description: {
      marginTop: 2,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
  });
}
