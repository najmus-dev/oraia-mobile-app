import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PickedContact } from '../lib/contacts';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { LocationAvatar } from './LocationAvatar';

type Props = {
  label?: string;
  contact: PickedContact | null;
  placeholder?: string;
  onPress: () => void;
};

export function ContactPickerField({
  label = 'Contact',
  contact,
  placeholder = 'Search and select a contact',
  onPress,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <LocationAvatar name={contact?.name ?? '?'} size={44} />
        <View style={styles.body}>
          <Text style={[styles.name, !contact && styles.placeholder]} numberOfLines={1}>
            {contact?.name ?? placeholder}
          </Text>
          {contact?.phone ? (
            <Text style={styles.sub} numberOfLines={1}>
              {contact.phone}
            </Text>
          ) : null}
          {contact?.email ? (
            <Text style={styles.sub} numberOfLines={1}>
              {contact.email}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundMuted} />
      </View>
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    body: { flex: 1, minWidth: 0 },
    name: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    placeholder: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
    },
    sub: {
      marginTop: 2,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
