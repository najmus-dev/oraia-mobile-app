import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../lib/safeArea';
import { locationDisplayName } from '../lib/locationDisplay';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { LocationAvatar } from './LocationAvatar';

type Props = {
  locationName?: string | null;
  locationAddress?: string | null;
  locationLogoUrl?: string | null;
  onOpenLocation: () => void;
  onRefresh?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  welcomeName?: string;
  notificationCount?: number;
};

export function DashboardHeader({
  locationName,
  locationAddress,
  locationLogoUrl,
  onOpenLocation,
  onRefresh,
  onNotifications,
  onSettings,
  welcomeName,
  notificationCount,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();
  const subAccountName = locationDisplayName(locationName);
  const addressLine = locationAddress?.trim() || '';
  const count = notificationCount ?? 0;
  const showBadge = count > 0;
  const badgeLabel = count > 99 ? '99+' : String(count);

  return (
    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.headerRow}>
        <LocationAvatar name={locationName} logoUrl={locationLogoUrl} size={48} />
        <View style={styles.brandTextCol}>
          <Pressable
            style={styles.brandTitleRow}
            onPress={onOpenLocation}
            accessibilityRole="button"
            accessibilityLabel="Switch location"
          >
            <Text style={styles.brandTitle} numberOfLines={1}>
              {subAccountName}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.shellForegroundMuted} />
          </Pressable>
          {addressLine ? (
            <Text style={styles.brandAddress} numberOfLines={2}>
              {addressLine}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {onNotifications ? (
            <Pressable
              style={styles.headerIconBtn}
              hitSlop={8}
              onPress={onNotifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.shellForeground} />
              {showBadge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeLabel}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {onSettings ? (
            <Pressable
              style={styles.headerIconBtn}
              hitSlop={8}
              onPress={onSettings}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={20} color={theme.colors.shellForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {welcomeName ? (
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome, {welcomeName}</Text>
          {onRefresh ? (
            <Pressable
              style={styles.refreshBtn}
              hitSlop={8}
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
            >
              <Ionicons name="refresh" size={20} color={theme.colors.shellForeground} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.shellElevated,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    brandTextCol: { flex: 1, minWidth: 0, paddingTop: 2 },
    brandTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    brandTitle: {
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.lg,
      flexShrink: 1,
    },
    brandAddress: {
      marginTop: 4,
      color: theme.colors.shellForegroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    welcomeRow: {
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    welcomeText: {
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.fontSize.xl,
      flex: 1,
    },
    refreshBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    headerIconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: theme.colors.danger,
      borderWidth: 1.5,
      borderColor: theme.colors.shellElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.colors.white,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: 10,
      lineHeight: 12,
    },
  });
}
