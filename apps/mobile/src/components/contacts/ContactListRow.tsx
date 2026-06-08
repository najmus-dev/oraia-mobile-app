import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { ContactAvatar } from './ContactAvatar';
import {
  contactDisplayName,
  type Contact,
} from '../../lib/contacts';

type Props = {
  contact: Contact;
  onPress: () => void;
};

export function ContactListRow({ contact, onPress }: Props) {
  const name = contactDisplayName(contact);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <ContactAvatar contact={contact} size={44} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {contact.phone?.trim() ? (
          <Text style={styles.sub} numberOfLines={1}>
            {contact.phone.trim()}
          </Text>
        ) : null}
        {contact.email?.trim() ? (
          <Text style={styles.sub} numberOfLines={1}>
            {contact.email.trim()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowPressed: { opacity: 0.82 },
  body: { flex: 1, minWidth: 0 },
  name: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  sub: {
    marginTop: 2,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
});
