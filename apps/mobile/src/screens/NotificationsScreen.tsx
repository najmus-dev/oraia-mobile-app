import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NotificationFilterBar } from '../components/notifications/NotificationFilterBar';
import { NotificationFilterSheet } from '../components/notifications/NotificationFilterSheet';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import {
  NOTIFICATION_STATUS_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  notificationStatusLabel,
  notificationTypeLabel,
  type NotificationStatus,
  type NotificationType,
} from '../lib/notifications';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/notificationFeed';
import { dedupeNotificationItems } from '../lib/notificationFeedUtils';
import type { NotificationItem } from '../lib/notificationFeedTypes';
import { formatError } from '../lib/errors';
import { locationDisplayName } from '../lib/locationDisplay';
import { navigateFromNotification } from '../lib/navigation';
import { useFullScreenBottomInset, useHeaderTopPadding } from '../lib/safeArea';
import { useAppState } from '../state/AppState';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import type { HomeStackParamList } from '../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

type ActiveSheet = 'location' | 'type' | 'status' | null;

export function NotificationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();
  const bodyBottom = useFullScreenBottomInset();
  const { token, locationId, locationName } = useAppState();
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>('all');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

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

  const load = useCallback(
    async (opts?: { refresh?: boolean; cursor?: string }) => {
      if (!token || !locationId) return;
      const isMore = Boolean(opts?.cursor);
      if (opts?.refresh) setRefreshing(true);
      else if (isMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await fetchNotifications(
          { token, locationId },
          {
            type: typeFilter,
            status: statusFilter,
            cursor: opts?.cursor,
            sync: !isMore,
          },
        );
        setUnreadCount(res.unreadCount);
        setNextCursor(res.nextCursor);
        setItems((prev) => {
          const nextItems = isMore ? [...prev, ...res.notifications] : res.notifications;
          return dedupeNotificationItems(nextItems);
        });
      } catch (e) {
        Alert.alert('Notifications', formatError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [token, locationId, typeFilter, statusFilter],
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  async function onMarkAllRead() {
    if (!token || !locationId || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead({ token, locationId });
      setItems((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
      setUnreadCount(0);
    } catch (e) {
      Alert.alert('Notifications', formatError(e));
    } finally {
      setMarkingAll(false);
    }
  }

  async function onPressItem(item: NotificationItem) {
    if (!token || !locationId) return;
    if (item.status === 'unread') {
      try {
        await markNotificationRead({ token, locationId }, item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, status: 'read' as const } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* still navigate */
      }
    }
    const opened = navigateFromNotification(navigation, item.action);
    if (!opened) {
      Alert.alert('Notifications', 'This notification has no linked screen yet.');
    }
  }

  const listEmpty = !loading ? (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyCircle} />
        <Ionicons name="notifications-outline" size={48} color={theme.colors.foregroundMuted} />
      </View>
      <Text style={styles.emptyTitle}>No Notifications Found</Text>
      <Text style={styles.emptySub}>
        New messages, tasks, and appointments will appear here.
      </Text>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.shellForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable
            hitSlop={8}
            style={styles.iconBtn}
            onPress={() => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              onMarkAllRead();
            }}
            disabled={markingAll || unreadCount === 0}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={theme.colors.link} />
            ) : (
              <>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={unreadCount > 0 ? theme.colors.shellForeground : theme.colors.shellForegroundMuted}
                />
                {unreadCount > 0 ? (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={10} color={theme.colors.white} />
                  </View>
                ) : null}
              </>
            )}
          </Pressable>
        </View>
      </View>

      <NotificationFilterBar pills={filterPills} />

      {loading && items.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={() => onPressItem(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.listContentEmpty,
            { paddingBottom: bodyBottom },
          ]}
          ListEmptyComponent={listEmpty}
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
          onEndReached={() => {
            if (nextCursor && !loadingMore) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              load({ cursor: nextCursor });
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={theme.colors.secondary} style={styles.footerLoader} />
            ) : null
          }
        />
      )}

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
        onSelected={() => {
          setLocationSheetOpen(false);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          load();
        }}
      />
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.shell,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.shellForeground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
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
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
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
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.md,
  },
});
}
