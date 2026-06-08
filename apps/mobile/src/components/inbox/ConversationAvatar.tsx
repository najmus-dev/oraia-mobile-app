import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  conversationChannelKind,
  conversationNameInitials,
} from '../../lib/conversations';
import { theme } from '../../theme';

type Props = {
  name?: string;
  lastMessageType?: string;
  size?: number;
};

export function ConversationAvatar({ name, lastMessageType, size = 48 }: Props) {
  const initials = conversationNameInitials(name);
  const kind = conversationChannelKind(lastMessageType);
  const badgeIcon =
    kind === 'email' ? 'mail' : kind === 'call' ? 'call' : kind === 'sms' ? 'chatbubble' : 'ellipse';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initials}</Text>
      </View>
      {kind !== 'other' ? (
        <View style={styles.badge}>
          <Ionicons name={badgeIcon} size={10} color={theme.colors.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2230',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  initials: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
