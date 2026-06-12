import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  badge?: string | number;
  onPress?: () => void;
};

export const ListRow = memo(function ListRow({ title, subtitle, badge, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.92 }]}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge != null && Number(badge) > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    content: { flex: 1 },
    title: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.md,
    },
    sub: {
      marginTop: theme.spacing.xs,
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
    badge: {
      marginLeft: theme.spacing.md,
      minWidth: 24,
      height: 24,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      color: theme.colors.white,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.xs,
    },
  });
}
