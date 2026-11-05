import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NotificationItem } from '../../lib/notificationFeedTypes';
import {
  formatNotificationTime,
  notificationActivityTime,
  notificationTypeIcon,
} from '../../lib/notificationFeedUtils';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

type Props = {
  item: NotificationItem;
  locationLabel?: string;
  onPress: () => void;
  onReply?: () => void;
};

function isCallNotification(item: NotificationItem): boolean {
  const body = item.body.toLowerCase();
  return body.includes('called you') || body.includes('voicemail');
}

export function NotificationRow({ item, locationLabel, onPress, onReply }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const unread = item.status === 'unread';
  const isCall = isCallNotification(item);
  const canReply = item.action.kind === 'conversation' && !isCall;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, unread && styles.iconWrapUnread, isCall && styles.iconWrapCall]}>
        <Ionicons
          name={isCall ? 'call-outline' : notificationTypeIcon(item.type)}
          size={20}
          color={unread || isCall ? theme.colors.link : theme.colors.foregroundMuted}
        />
      </View>
      <View style={styles.body}>
        {locationLabel ? (
          <Text style={styles.location} numberOfLines={1}>
            {locationLabel}
          </Text>
        ) : null}
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatNotificationTime(notificationActivityTime(item))}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {item.body}
        </Text>
        {canReply && onReply ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onReply();
            }}
            style={styles.replyBtn}
            hitSlop={6}
          >
            <Text style={styles.replyText}>Reply</Text>
          </Pressable>
        ) : null}
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowUnread: {
      backgroundColor: 'rgba(47, 45, 121, 0.18)',
    },
    rowPressed: {
      opacity: 0.92,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      marginTop: 2,
    },
    iconWrapUnread: {
      backgroundColor: `${theme.colors.primary}1F`,
    },
    iconWrapCall: {
      backgroundColor: `${theme.colors.link}22`,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    location: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
      marginBottom: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    },
    titleUnread: {
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    time: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
    preview: {
      marginTop: 4,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    replyBtn: {
      alignSelf: 'flex-start',
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    replyText: {
      color: theme.colors.link,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.sm,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.link,
      marginTop: 10,
    },
  });
}
