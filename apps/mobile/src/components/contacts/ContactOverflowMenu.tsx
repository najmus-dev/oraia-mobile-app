import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useHeaderTopPadding } from '../../lib/safeArea';
import { theme } from '../../theme';

type MenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
};

export function ContactOverflowMenu({ visible, onClose, items }: Props) {
  const paddingTop = useHeaderTopPadding();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={[styles.menu, { top: paddingTop + 52 }]}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              disabled={item.disabled}
            >
              <Text
                style={[
                  styles.itemText,
                  item.destructive && styles.itemDanger,
                  item.disabled && styles.itemDisabled,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  menu: {
    position: 'absolute',
    right: theme.spacing.lg,
    zIndex: 2,
    minWidth: 180,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  itemPressed: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  itemText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  itemDanger: {
    color: theme.colors.danger,
  },
  itemDisabled: {
    opacity: 0.45,
  },
});
