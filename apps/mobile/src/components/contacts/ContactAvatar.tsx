import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { contactInitials, type Contact } from '../../lib/contacts';

type Props = {
  contact: Pick<Contact, 'firstName' | 'lastName' | 'name' | 'phone'>;
  size?: number;
};

export function ContactAvatar({ contact, size = 44 }: Props) {
  const styles = useThemedStyles(createStyles);
  const initials = contactInitials(contact);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  initials: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});
}
