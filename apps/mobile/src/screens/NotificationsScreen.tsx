import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NotificationFilterBar } from '../components/notifications/NotificationFilterBar';
import { NotificationFilterSheet } from '../components/notifications/NotificationFilterSheet';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import {
  NOTIFICATION_STATUS_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  notificationStatusLabel,
  notificationTypeLabel,
  type NotificationStatus,
  type NotificationType,
} from '../lib/notifications';
import { locationDisplayName } from '../lib/locationDisplay';
import { useFullScreenBottomInset, useHeaderTopPadding } from '../lib/safeArea';
import { useAppState } from '../state/AppState';
import { theme } from '../theme';
import type { HomeStackParamList } from '../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

type ActiveSheet = 'location' | 'type' | 'status' | null;

export function NotificationsScreen({ navigation }: Props) {
  const paddingTop = useHeaderTopPadding();
  const bodyBottom = useFullScreenBottomInset();
  const { locationName } = useAppState();
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>('all');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const locationLabel = locationDisplayName(locationName);

  const filterPills = useMemo(
    () => [
      {
        key: 'location',
        label: locationLabel,
        active: false,
        onPress: () => setLocationSheetOpen(true),
      },
      {
        key: 'type',
        label: notificationTypeLabel(typeFilter),
        active: typeFilter !== 'all',
        onPress: () => setActiveSheet('type'),
      },
      {
        key: 'status',
        label: notificationStatusLabel(statusFilter),
        active: statusFilter !== 'all',
        onPress: () => setActiveSheet('status'),
      },
    ],
    [locationLabel, typeFilter, statusFilter],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable
            hitSlop={8}
            style={styles.markReadBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.white} />
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={10} color={theme.colors.white} />
            </View>
          </Pressable>
        </View>
      </View>

      <NotificationFilterBar pills={filterPills} />

      <View style={[styles.body, { paddingBottom: bodyBottom }]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIllustration}>
            <View style={styles.emptyCircle} />
            <Ionicons name="person-outline" size={48} color={theme.colors.mutedTextOnDark} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications Found</Text>
        </View>
      </View>

      <NotificationFilterSheet
        visible={activeSheet === 'type'}
        title="Select Notifications Type"
        options={NOTIFICATION_TYPE_OPTIONS}
        selected={typeFilter}
        onClose={() => setActiveSheet(null)}
        onSelect={setTypeFilter}
      />

      <NotificationFilterSheet
        visible={activeSheet === 'status'}
        title="Select Status"
        options={NOTIFICATION_STATUS_OPTIONS}
        selected={statusFilter}
        onClose={() => setActiveSheet(null)}
        onSelect={setStatusFilter}
      />

      <LocationSelectSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onSelected={() => setLocationSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
  },
  markReadBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.link,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIllustration: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(47, 45, 121, 0.35)',
  },
  emptyTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
  },
});
