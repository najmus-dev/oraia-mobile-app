import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { isImageAttachmentUrl } from '../../lib/messageFormat';
import { theme } from '../../theme';

type Props = {
  body?: string;
  meta: string;
  outbound: boolean;
  activity?: boolean;
  pending?: boolean;
  failed?: boolean;
  attachments?: string[];
  onLongPress?: () => void;
  onRetry?: () => void;
};

export const MessageBubble = React.memo(function MessageBubble({
  body,
  meta,
  outbound,
  activity,
  pending,
  failed,
  attachments,
  onLongPress,
  onRetry,
}: Props) {
  const text = body?.trim();
  const urls = attachments ?? [];

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[styles.wrap, activity ? styles.activityWrap : outbound ? styles.outWrap : styles.inWrap]}
    >
      <View
        style={[
          styles.bubble,
          activity ? styles.activityBubble : outbound ? styles.outBubble : styles.inBubble,
          pending && styles.pending,
          failed && styles.failed,
        ]}
      >
        <Text style={[styles.meta, (outbound || activity) && styles.outMeta]}>{meta}</Text>
        {urls.map((url) =>
          isImageAttachmentUrl(url) ? (
            <Pressable key={url} onPress={() => Linking.openURL(url)}>
              <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
            </Pressable>
          ) : (
            <Pressable key={url} onPress={() => Linking.openURL(url)}>
              <Text style={[styles.linkText, (outbound || activity) && styles.outText]} numberOfLines={2}>
                Attachment
              </Text>
            </Pressable>
          ),
        )}
        {text ? (
          <Text style={[styles.bubbleText, (outbound || activity) && styles.outText]}>{text}</Text>
        ) : urls.length === 0 ? (
          <Text style={[styles.bubbleText, (outbound || activity) && styles.outText]}>—</Text>
        ) : null}
        {pending ? (
          <Text style={[styles.status, outbound && styles.outMeta]}>Sending…</Text>
        ) : null}
        {failed ? (
          <View style={styles.failedRow}>
            <Text style={styles.failedText}>Failed to send</Text>
            {onRetry ? (
              <Pressable onPress={onRetry} hitSlop={8}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.sm },
  inWrap: { alignItems: 'flex-start' },
  outWrap: { alignItems: 'flex-end' },
  activityWrap: { alignItems: 'center' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  inBubble: {
    backgroundColor: '#2A2D3A',
    borderBottomLeftRadius: 4,
  },
  outBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  activityBubble: {
    maxWidth: '92%',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  pending: { opacity: 0.75 },
  failed: { borderWidth: 1, borderColor: theme.colors.danger },
  meta: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  outMeta: { color: 'rgba(255,255,255,0.72)' },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  linkText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    marginBottom: theme.spacing.xs,
    textDecorationLine: 'underline',
  },
  bubbleText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.md,
  },
  outText: { color: theme.colors.white },
  status: {
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  failedRow: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  failedText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  retryText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.xs,
    textDecorationLine: 'underline',
  },
});
