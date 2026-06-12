import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../../lib/safeArea';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { LocationAvatar } from '../LocationAvatar';

type Props = {
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  starred?: boolean;
  starredBusy?: boolean;
  onToggleStar?: () => void;
  onBack: () => void;
  onOpenContact: () => void;
};

export function ConversationThreadHeader({
  contactName,
  contactPhone,
  contactEmail,
  starred,
  starredBusy,
  onToggleStar,
  onBack,
  onOpenContact,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();
  const hasEmail = Boolean(contactEmail?.trim());
  const hasPhone = Boolean(contactPhone?.trim());

  function dial() {
    if (!contactPhone?.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Linking.openURL(`tel:${contactPhone.trim()}`);
  }

  function mail() {
    if (!contactEmail?.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Linking.openURL(`mailto:${contactEmail.trim()}`);
  }

  return (
    <View style={[styles.wrap, { paddingTop }]}>
      <View style={styles.row}>
        <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.link} />
        </Pressable>
        <Pressable style={styles.identity} onPress={onOpenContact}>
          <LocationAvatar name={contactName} size={40} />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {contactName}
            </Text>
            <Text style={styles.sub}>Tap to view Contact info</Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          {onToggleStar ? (
            <Pressable
              onPress={onToggleStar}
              style={styles.iconBtn}
              disabled={starredBusy}
              hitSlop={8}
              accessibilityLabel={starred ? 'Unstar conversation' : 'Star conversation'}
            >
              <Ionicons
                name={starred ? 'star' : 'star-outline'}
                size={22}
                color={starred ? theme.colors.warning : theme.colors.shellForeground}
              />
            </Pressable>
          ) : null}
          {hasEmail ? (
            <Pressable onPress={mail} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Email contact">
              <Ionicons name="mail-outline" size={22} color={theme.colors.shellForeground} />
            </Pressable>
          ) : null}
          {hasPhone ? (
            <Pressable onPress={dial} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Call contact">
              <Ionicons name="call-outline" size={22} color={theme.colors.shellForeground} />
            </Pressable>
          ) : null}
          <Pressable onPress={onOpenContact} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.shellForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.shell,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.xs,
    },
    identityText: { flex: 1, minWidth: 0 },
    name: {
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    sub: {
      color: theme.colors.shellForegroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
    actions: { flexDirection: 'row', alignItems: 'center' },
  });
}
