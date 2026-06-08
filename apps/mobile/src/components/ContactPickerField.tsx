import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PickedContact } from '../lib/contacts';
import { theme } from '../theme';
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
        <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedTextOnDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  body: { flex: 1, minWidth: 0 },
  name: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  placeholder: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
  },
  sub: {
    marginTop: 2,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
});
