import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { theme } from '../../theme';

type Option<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected: T;
  onClose: () => void;
  onSelect: (value: T) => void;
};

export function NotificationFilterSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: Props<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.list}>
        {options.map((option) => {
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
              <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: theme.spacing.lg },
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
  label: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  labelActive: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});
