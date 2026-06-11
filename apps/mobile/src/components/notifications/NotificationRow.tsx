import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NotificationItem } from '../../lib/notificationFeedTypes';
import { formatNotificationTime, notificationTypeIcon } from '../../lib/notificationFeedUtils';
import { theme } from '../../theme';

type Props = {
  item: NotificationItem;
  onPress: () => void;
};

export function NotificationRow({ item, onPress }: Props) {
  const unread = item.status === 'unread';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, unread && styles.iconWrapUnread]}>
        <Ionicons
          name={notificationTypeIcon(item.type)}
          size={20}
          color={unread ? theme.colors.link : theme.colors.mutedTextOnDark}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  titleUnread: {
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  time: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  preview: {
    marginTop: 4,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.link,
    marginTop: 10,
  },
});
