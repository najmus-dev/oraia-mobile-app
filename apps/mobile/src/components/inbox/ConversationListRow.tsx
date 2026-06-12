import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type Conversation,
  conversationChannelKind,
  formatConversationPreview,
  formatConversationWhen,
} from '../../lib/conversations';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { ConversationAvatar } from './ConversationAvatar';

type Props = {
  item: Conversation;
  onOpenThread: (item: Conversation) => void;
  onLongPressRow?: (item: Conversation) => void;
};

export const ConversationListRow = React.memo(function ConversationListRow({
  item,
  onOpenThread,
  onLongPressRow,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const unread = (item.unreadCount ?? 0) > 0;
  const kind = conversationChannelKind(item.lastMessageType);
  const isCall = kind === 'call';
  const preview = formatConversationPreview(item);

  return (
    <Pressable
      style={styles.row}
      onPress={() => onOpenThread(item)}
      onLongPress={onLongPressRow ? () => onLongPressRow(item) : undefined}
      delayLongPress={400}
    >
      <ConversationAvatar
        name={item.contactName}
        lastMessageType={item.lastMessageType}
        size={44}
      />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {item.contactName ?? 'Unknown contact'}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.time}>{formatConversationWhen(item.lastMessageDate)}</Text>
            {unread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{Math.min(item.unreadCount ?? 0, 99)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.previewRow}>
          {isCall ? (
            <Ionicons name="call-outline" size={13} color={theme.colors.foregroundMuted} />
          ) : null}
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
        </View>

        {item.assignedToName ? (
          <Text style={styles.assigned} numberOfLines={1}>
            Assigned To {item.assignedToName}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    body: { flex: 1, minWidth: 0 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    name: {
      flex: 1,
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    nameUnread: {
      fontFamily: theme.typography.fontFamily.bold,
    },
    meta: {
      alignItems: 'flex-end',
      gap: 4,
    },
    time: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
    previewRow: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    preview: {
      flex: 1,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
    previewUnread: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
    },
    unreadBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    unreadText: {
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: 10,
    },
    assigned: {
      marginTop: 2,
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
  });
}
