import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderTopPadding } from '../../lib/safeArea';
import { locationDisplayName } from '../../lib/locationDisplay';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { LocationAvatar } from '../LocationAvatar';

type Props = {
  locationName?: string | null;
  locationAddress?: string | null;
  locationLogoUrl?: string | null;
  onOpenLocation: () => void;
};

function inboxLocationSubtitle(
  locationName?: string | null,
  locationAddress?: string | null,
): string {
  const name = locationDisplayName(locationName);
  if (name && !/^oraia(\s*crm)?$/i.test(name.trim())) {
    return name;
  }
  const addressLine = locationAddress?.trim();
  if (!addressLine) return '';
  return addressLine.split(',')[0]?.trim() ?? addressLine;
}

export function InboxBrandHeader({
  locationName,
  locationAddress,
  locationLogoUrl,
  onOpenLocation,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();
  const subtitle = inboxLocationSubtitle(locationName, locationAddress);

  return (
    <View style={[styles.header, { paddingTop }]}>
      <Pressable style={styles.row} onPress={onOpenLocation} accessibilityRole="button">
        <LocationAvatar name={locationName ?? 'ORAIA CRM'} logoUrl={locationLogoUrl} size={40} />
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              ORAIA CRM
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.shellForegroundMuted} />
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.shell,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    textCol: { flex: 1, minWidth: 0 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    title: {
      color: theme.colors.shellForeground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.lg,
      flexShrink: 1,
    },
    subtitle: {
      marginTop: 2,
      color: theme.colors.shellForegroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
