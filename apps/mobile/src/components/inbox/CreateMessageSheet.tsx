import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

export type ComposeKind = 'direct' | 'email' | 'group' | 'internal';

type Option = {
  kind: ComposeKind;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  available: boolean;
};

const OPTIONS: Option[] = [
  {
    kind: 'direct',
    title: 'New Direct Message',
    subtitle: 'Send SMS to a contact',
    icon: 'chatbubble-ellipses-outline',
    available: true,
  },
  {
    kind: 'email',
    title: 'New Email',
    subtitle: 'Send email to a contact',
    icon: 'mail-outline',
    available: true,
  },
  {
    kind: 'group',
    title: 'Group SMS',
    subtitle: 'Broadcast to multiple contacts',
    icon: 'chatbubbles-outline',
    available: false,
  },
  {
    kind: 'internal',
    title: 'Team chat',
    subtitle: 'Message team members in GHL',
    icon: 'people-outline',
    available: false,
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: ComposeKind) => void;
};

export function CreateMessageSheet({ visible, onClose, onSelect }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New message</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Choose how you want to reach a contact.</Text>
      {OPTIONS.map((opt) => (
        <Pressable
          key={opt.kind}
          style={[styles.row, !opt.available && styles.rowDisabled]}
          onPress={() => opt.available && onSelect(opt.kind)}
          disabled={!opt.available}
          accessibilityRole="button"
          accessibilityState={{ disabled: !opt.available }}
        >
          <View style={[styles.iconCircle, !opt.available && styles.iconMuted]}>
            <Ionicons
              name={opt.icon}
              size={22}
              color={opt.available ? theme.colors.link : theme.colors.foregroundMuted}
            />
          </View>
          <View style={styles.rowText}>
            <View style={styles.titleRow}>
              <Text style={[styles.rowTitle, !opt.available && styles.rowTitleMuted]}>
                {opt.title}
              </Text>
              {!opt.available ? (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonText}>Soon</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.rowSub}>{opt.subtitle}</Text>
          </View>
          {opt.available ? (
            <Ionicons name="chevron-forward" size={18} color={theme.colors.foregroundMuted} />
          ) : null}
        </Pressable>
      ))}
    </BottomSheet>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    headerTitle: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.lg,
    },
    cancel: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    hint: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.sm,
    },
    rowDisabled: { opacity: 0.72 },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}26`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconMuted: { backgroundColor: theme.colors.surfaceMuted },
    rowText: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    rowTitle: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    rowTitleMuted: { color: theme.colors.foregroundMuted },
    rowSub: {
      marginTop: 2,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
    soonBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    soonText: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}
