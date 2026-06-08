import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../lib/safeArea';
import { locationDisplayName } from '../lib/locationDisplay';
import { theme } from '../theme';
import { LocationAvatar } from './LocationAvatar';

type Props = {
  locationName?: string | null;
  locationAddress?: string | null;
  locationLogoUrl?: string | null;
  onOpenLocation: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  welcomeName?: string;
};

export function DashboardHeader({
  locationName,
  locationAddress,
  locationLogoUrl,
  onOpenLocation,
  onRefresh,
  onSettings,
  welcomeName,
}: Props) {
  const paddingTop = useHeaderTopPadding();
  const subAccountName = locationDisplayName(locationName);
  const addressLine = locationAddress?.trim() || '';

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
            <Ionicons name="chevron-down" size={18} color={theme.colors.mutedTextOnDark} />
          </Pressable>
          {addressLine ? (
            <Text style={styles.brandAddress} numberOfLines={2}>
              {addressLine}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {onRefresh ? (
            <Pressable
              style={styles.headerIconBtn}
              hitSlop={8}
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
            >
              <Ionicons name="refresh" size={18} color={theme.colors.white} />
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
              <Ionicons name="settings-outline" size={18} color={theme.colors.white} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {welcomeName ? (
        <Text style={styles.welcomeText}>Welcome, {welcomeName}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
    flexShrink: 1,
  },
  brandAddress: {
    marginTop: 4,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  welcomeText: {
    marginTop: theme.spacing.lg,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.xl,
  },
  headerActions: { flexDirection: 'row', gap: theme.spacing.sm },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
