import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

type Props = {
  phone?: string;
  email?: string;
  onViewContact: () => void;
};

export function ThreadContactBar({ phone, email, onViewContact }: Props) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());

  return (
    <View style={styles.wrap}>
      {hasPhone ? (
        <Pressable
          style={styles.chip}
          onPress={() => Linking.openURL(`tel:${phone!.trim()}`)}
        >
          <Ionicons name="call-outline" size={14} color={theme.colors.link} />
          <Text style={styles.chipText} numberOfLines={1}>
            {phone}
          </Text>
        </Pressable>
      ) : null}
      {hasEmail ? (
        <Pressable
          style={styles.chip}
          onPress={() => Linking.openURL(`mailto:${email!.trim()}`)}
        >
          <Ionicons name="mail-outline" size={14} color={theme.colors.link} />
          <Text style={styles.chipText} numberOfLines={1}>
            {email}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.profileLink, !hasPhone && !hasEmail && styles.profileLinkOnly]}
        onPress={onViewContact}
      >
        <Text style={styles.profileText}>Contact profile</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.link} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.shell,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '46%',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    flexShrink: 1,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
  },
  profileLinkOnly: { marginLeft: 0 },
  profileText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
});
