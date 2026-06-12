import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddContact: () => void;
  onScanCard: () => void;
};

export function NewContactSheet({ visible, onClose, onAddContact, onScanCard }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="New Contact">
      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={() => {
            onClose();
            onAddContact();
          }}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="add" size={22} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Add Contact</Text>
        </Pressable>

        <Pressable
          style={styles.action}
          onPress={() => {
            onClose();
            onScanCard();
          }}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="scan-outline" size={22} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Scan Business Card</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  actions: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}2E`,
  },
  actionLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
}
