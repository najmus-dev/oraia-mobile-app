import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { theme } from '../../theme';

type Props = {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function OptionPickerSheet({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.list}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{option}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
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
