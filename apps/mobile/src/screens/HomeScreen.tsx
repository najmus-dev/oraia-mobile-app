import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TAB_LIST_BOTTOM_PADDING, useHeaderTopPadding } from '../lib/safeArea';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  EMPTY_DASHBOARD_SUMMARY,
  clientDashboardDayKey,
  fetchDashboardSummary,
  readDashboardCache,
  type DashboardEvent,
} from '../lib/dashboardSummary';
import { fetchNotificationUnreadCount } from '../lib/notificationFeed';
import { formatEventRange } from '../lib/dates';
import { formatError } from '../lib/errors';
import { getTabNavigation, navigateToAppointmentDetail, navigateToTabScreen } from '../lib/navigation';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import type { OraiaTheme } from '../theme';
import { ListRow } from '../components/ListRow';
import { ErrorBanner } from '../components/ErrorBanner';
import { DashboardHeader } from '../components/DashboardHeader';
import {
  CRM_APPS,
  crmAppAccent,
  openCrmApp,
} from '../lib/crmApps';
import { DEFAULT_TASK_FILTERS } from '../lib/tasks';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import type { HomeStackParamList } from '../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    user,
    token,
    locationId,
    locationName,
    locationAddress,
    locationLogoUrl,
    setLocation,
    pinnedAppIds,
    setPinnedAppIds,
  } = useAppState();
  const dayKey = useMemo(() => clientDashboardDayKey(), []);
  const initialSummary = useMemo(
    () => (locationId ? readDashboardCache(locationId, dayKey) : null),
    [locationId, dayKey],
  );
  const [loading, setLoading] = useState(!initialSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [todayEvents, setTodayEvents] = useState<DashboardEvent[]>(
    initialSummary?.todayEvents ?? EMPTY_DASHBOARD_SUMMARY.todayEvents,
  );
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(
    initialSummary?.todayAppointmentCount ?? 0,
  );
  const [unreadCount, setUnreadCount] = useState(initialSummary?.unreadCount ?? 0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(initialSummary?.pipelineValue ?? 0);
  const [pendingTasks, setPendingTasks] = useState(initialSummary?.pendingTasks ?? 0);
  const hasLoadedOnceRef = useRef(Boolean(initialSummary));
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [editPinnedOpen, setEditPinnedOpen] = useState(false);
  const [pinnedSearch, setPinnedSearch] = useState('');
  const modalHeaderTop = useHeaderTopPadding(true);

  const applySummary = useCallback((summary: typeof EMPTY_DASHBOARD_SUMMARY) => {
    setTodayEvents(summary.todayEvents);
    setTodayAppointmentCount(summary.todayAppointmentCount);
    setUnreadCount(summary.unreadCount);
    setPipelineValue(summary.pipelineValue);
    setPendingTasks(summary.pendingTasks);
  }, []);

  const loadNotificationBadge = useCallback(async () => {
    if (!token || !locationId) return;
    try {
      const count = await fetchNotificationUnreadCount({ token, locationId });
      setNotificationCount(count);
    } catch {
      /* badge is best-effort */
    }
  }, [token, locationId]);

  const load = useCallback(
    async (opts?: { pull?: boolean; force?: boolean; silent?: boolean }) => {
      if (!token || !locationId) return;
      const cached = readDashboardCache(locationId, dayKey);
      if (opts?.pull) setRefreshing(true);
      else if (!opts?.silent && !cached) setLoading(true);
      setLoadError(null);
      try {
        const summary = await fetchDashboardSummary(
          { token, locationId },
          { force: opts?.force || opts?.pull },
        );
        applySummary(summary);
        hasLoadedOnceRef.current = true;
      } catch (e) {
        if (!cached && !hasLoadedOnceRef.current) {
          applySummary(EMPTY_DASHBOARD_SUMMARY);
        }
        setLoadError(formatError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, locationId, dayKey, applySummary],
  );

  useEffect(() => {
    hasLoadedOnceRef.current = Boolean(readDashboardCache(locationId, dayKey));
    const cached = readDashboardCache(locationId, dayKey);
    if (cached) applySummary(cached);
    setLoading(!cached);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load({ silent: Boolean(cached) });
  }, [locationId, dayKey, load, applySummary]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !locationId) return;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      loadNotificationBadge();
      if (!hasLoadedOnceRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      load({ silent: true });
    }, [token, locationId, load, loadNotificationBadge]),
  );

  useEffect(() => {
    const needsEnrich =
      !locationName?.trim() || !locationAddress?.trim() || !locationLogoUrl?.trim();
    if (!token || !locationId || !needsEnrich) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.getJson<{
          locations: {
            id: string;
            name: string;
            displayName?: string;
            mainAddress?: string;
            fullAddress?: string;
            address?: string;
            logoUrl?: string;
          }[];
        }>('/api/locations', {
          headers: withAuthHeaders({ token, locationId }),
        });
        if (!alive) return;
        const matched = (res.locations ?? []).find((x) => x.id === locationId);
        if (!matched) return;
        setLocation({
          id: matched.id,
          name: matched.displayName?.trim() || matched.name?.trim(),
          address:
            matched.fullAddress?.trim() ||
            matched.mainAddress?.trim() ||
            matched.address?.trim() ||
            undefined,
          logoUrl: matched.logoUrl,
        });
      } catch {
        // best-effort lookup
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, locationId, locationName, locationAddress, locationLogoUrl, setLocation]);

  const firstName = user?.email?.split('@')[0] ?? 'there';
  const tabNav = getTabNavigation(navigation);
  const scrollBottomPad = TAB_LIST_BOTTOM_PADDING;

  const pinnedApps = useMemo(
    () =>
      pinnedAppIds
        .map((id) => CRM_APPS[id as keyof typeof CRM_APPS])
        .filter(Boolean),
    [pinnedAppIds],
  );

  const allApps = useMemo(() => Object.values(CRM_APPS).filter((a) => a.available), []);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: 'add-contact',
        label: 'Add Contact',
        icon: 'person-add-outline',
        onPress: () => navigateToTabScreen(navigation, 'AppsTab', 'ContactForm'),
      },
      {
        id: 'new-message',
        label: 'New Message',
        icon: 'chatbubble-ellipses-outline',
        onPress: () =>
          navigateToTabScreen(navigation, 'InboxTab', 'InboxList', { openCompose: true }),
      },
      {
        id: 'new-opportunity',
        label: 'New Opportunity',
        icon: 'git-network-outline',
        onPress: () =>
          navigateToTabScreen(navigation, 'AppsTab', 'PickContact', {
            flow: 'opportunity',
            pipelineId: undefined,
          }),
      },
      {
        id: 'schedule',
        label: 'Schedule',
        icon: 'calendar-outline',
        onPress: () => navigateToTabScreen(navigation, 'CalendarTab', 'CalendarList'),
      },
    ],
    [navigation],
  );

  function togglePinned(appId: string) {
    if (pinnedAppIds.includes(appId)) {
      setPinnedAppIds(pinnedAppIds.filter((x) => x !== appId));
      return;
    }
    if (pinnedAppIds.length >= 4) {
      Alert.alert('Pinned Apps', 'You can select up to 4 apps.');
      return;
    }
    setPinnedAppIds([...pinnedAppIds, appId]);
  }

  function movePinned(appId: string, dir: -1 | 1) {
    const idx = pinnedAppIds.indexOf(appId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= pinnedAppIds.length) return;
    const next = pinnedAppIds.slice();
    const tmp = next[idx];
    next[idx] = next[nextIdx];
    next[nextIdx] = tmp;
    setPinnedAppIds(next);
  }

  const visiblePinnedChoices = useMemo(() => {
    const q = pinnedSearch.trim().toLowerCase();
    if (!q) return allApps;
    return allApps.filter((a) => a.label.toLowerCase().includes(q));
  }, [allApps, pinnedSearch]);

  const pipelineDisplay = loading
    ? '—'
    : `$${pipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={styles.container}>
      <DashboardHeader
        locationName={locationName}
        locationAddress={locationAddress}
        locationLogoUrl={locationLogoUrl}
        onOpenLocation={() => setLocationSheetOpen(true)}
        onRefresh={() => load({ pull: true })}
        onNotifications={() => navigation.navigate('Notifications')}
        onSettings={() => navigation.navigate('Settings')}
        welcomeName={firstName}
        notificationCount={notificationCount}
      />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ pull: true })} />
        }
      >
        {loadError ? (
          <ErrorBanner message={loadError} onRetry={load} onDismiss={() => setLoadError(null)} />
        ) : null}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              styles={styles}
              title="Pending tasks"
              period="Open now"
              value={loading ? '—' : pendingTasks}
              icon="checkbox-outline"
              accent={theme.colors.info}
              onPress={() =>
                navigateToTabScreen(navigation, 'AppsTab', 'TasksHome', {
                  appliedFilters: { ...DEFAULT_TASK_FILTERS, status: 'pending' },
                })
              }
            />
            <StatCard
              styles={styles}
              title="Pipeline Value"
              period="Open deals"
              value={pipelineDisplay}
              icon="cash-outline"
              accent={theme.colors.success}
              onPress={() => navigateToTabScreen(navigation, 'AppsTab', 'PipelineHome')}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              styles={styles}
              title="Unread Messages"
              period="All conversations"
              value={loading ? '—' : unreadCount}
              icon="chatbubble-ellipses-outline"
              accent={theme.colors.info}
              onPress={() => navigateToTabScreen(navigation, 'InboxTab', 'InboxList')}
            />
            <StatCard
              styles={styles}
              title="Appointments"
              period="Today"
              value={loading ? '—' : todayAppointmentCount}
              icon="calendar-outline"
              accent={theme.colors.warning}
              onPress={() => navigateToTabScreen(navigation, 'CalendarTab', 'CalendarList')}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Pinned Apps</Text>
            <Pressable onPress={() => setEditPinnedOpen(true)} hitSlop={8} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={theme.colors.secondary} />
            </Pressable>
          </View>
          <View style={styles.appsRow}>
            {[0, 1, 2, 3].map((slotIdx) => {
              const app = pinnedApps[slotIdx];
              if (!app) return <View key={`slot-${slotIdx}`} style={styles.pinnedSlotPlaceholder} />;
              const accent = crmAppAccent(app, theme);
              return (
                <Pressable
                  key={app.id}
                  style={styles.pinnedItem}
                  onPress={() => openCrmApp(app.id, tabNav ?? navigation)}
                >
                  <View style={[styles.pinnedCircle, { borderColor: `${accent}44` }]}>
                    <Ionicons name={app.icon} size={20} color={accent} />
                  </View>
                  <Text
                    style={styles.pinnedText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {app.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickRow}>
            {quickActions.map((action) => (
              <Pressable key={action.id} style={styles.quickItem} onPress={action.onPress}>
                <View style={styles.quickCircle}>
                  <Ionicons name={action.icon} size={20} color={theme.colors.link} />
                </View>
                <Text
                  style={styles.quickLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Today&apos;s schedule</Text>
            {todayAppointmentCount > todayEvents.length ? (
              <Pressable onPress={() => navigateToTabScreen(navigation, 'CalendarTab', 'CalendarList')}>
                <Text style={styles.viewAllLink}>View all ({todayAppointmentCount})</Text>
              </Pressable>
            ) : null}
          </View>
          {loading ? (
            <ActivityIndicator color={theme.colors.secondary} style={{ marginVertical: theme.spacing.lg }} />
          ) : todayEvents.length === 0 ? (
            <Text style={styles.noteText}>No appointments today.</Text>
          ) : (
            todayEvents.map((event) => (
              <View key={event.id} style={styles.eventWrap}>
                <ListRow
                  title={event.title ?? 'Appointment'}
                  subtitle={formatEventRange(event.startTime, event.endTime)}
                  onPress={() => navigateToAppointmentDetail(navigation, event.id, event.title)}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <LocationSelectSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onSelected={() => setLocationSheetOpen(false)}
      />

      <Modal visible={editPinnedOpen} animationType="slide" onRequestClose={() => setEditPinnedOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modalHeader, { paddingTop: modalHeaderTop }]}>
            <Pressable hitSlop={10} style={styles.modalHeaderBtn} onPress={() => setEditPinnedOpen(false)}>
              <Ionicons name="close" size={22} color={theme.colors.white} />
            </Pressable>
            <Text style={styles.modalTitle}>Pinned Apps</Text>
            <View style={styles.modalHeaderBtn} />
          </View>

          <View style={styles.modalBody}>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.foregroundMuted} />
              <Text style={styles.infoText}>You can select up to 4 apps</Text>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={theme.colors.foregroundMuted} />
              <TextInput
                value={pinnedSearch}
                onChangeText={setPinnedSearch}
                placeholder="Search Apps"
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.modalSectionRow}>
              <Text style={styles.modalSectionTitle}>Selected</Text>
            </View>

            <View style={styles.modalList}>
              {pinnedApps.length === 0 ? (
                <Text style={styles.modalEmpty}>No apps selected.</Text>
              ) : (
                pinnedApps.map((app) => (
                  <View key={app.id} style={styles.modalItemRow}>
                    <View style={styles.dragBox}>
                      <Ionicons name="reorder-two" size={18} color={theme.colors.secondary} />
                    </View>
                    <Pressable style={styles.modalItem} onPress={() => togglePinned(app.id)}>
                      <View style={styles.modalItemLeft}>
                        <View style={styles.modalItemIcon}>
                          <Ionicons name={app.icon} size={16} color={theme.colors.foregroundMuted} />
                        </View>
                        <Text style={styles.modalItemLabel}>{app.label}</Text>
                      </View>
                      <View style={styles.modalItemRight}>
                        <View style={styles.reorderBtns}>
                          <Pressable hitSlop={8} onPress={() => movePinned(app.id, -1)} style={styles.reorderBtn}>
                            <Ionicons name="chevron-up" size={16} color={theme.colors.foregroundMuted} />
                          </Pressable>
                          <Pressable hitSlop={8} onPress={() => movePinned(app.id, 1)} style={styles.reorderBtn}>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.foregroundMuted} />
                          </Pressable>
                        </View>
                        <View style={styles.checkPill}>
                          <Ionicons name="checkmark" size={16} color={theme.colors.navy} />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Unselected</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.modalList}>
              {visiblePinnedChoices
                .filter((a) => !pinnedAppIds.includes(a.id))
                .map((app) => (
                  <View key={app.id} style={styles.modalItemRow}>
                    <View style={[styles.dragBox, { opacity: 0.35 }]}>
                      <Ionicons name="reorder-two" size={18} color={theme.colors.secondary} />
                    </View>
                    <Pressable style={styles.modalItem} onPress={() => togglePinned(app.id)}>
                      <View style={styles.modalItemLeft}>
                        <View style={styles.modalItemIcon}>
                          <Ionicons name={app.icon} size={16} color={theme.colors.foregroundMuted} />
                        </View>
                        <Text style={styles.modalItemLabel}>{app.label}</Text>
                      </View>
                      <View style={styles.checkBox} />
                    </Pressable>
                  </View>
                ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({
  title,
  period,
  value,
  icon,
  accent,
  onPress,
  styles,
}: {
  title: string;
  period: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={styles.statCard} onPress={onPress} disabled={!onPress}>
      <View style={styles.statTopRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.statTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.statPeriod}>{period}</Text>
        </View>
        <View style={[styles.statIconCircle, { backgroundColor: `${accent}22` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: theme.spacing.lg },
  statsGrid: { gap: theme.spacing.sm },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  statPeriod: {
    marginTop: 2,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  statValue: {
    marginTop: theme.spacing.md,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
    lineHeight: theme.typography.lineHeight.xl,
  },
  panel: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  panelHead: {
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
  },
  viewAllLink: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  appsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pinnedItem: { alignItems: 'center', gap: theme.spacing.sm, width: '23%' },
  pinnedSlotPlaceholder: { width: '23%' },
  pinnedCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedText: {
    width: '100%',
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickItem: {
    width: '31%',
    minWidth: 96,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  quickCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
  eventWrap: { marginTop: theme.spacing.xs },
  noteText: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.md,
  },
  modalWrap: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
  },
  modalBody: { padding: theme.spacing.xl },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  infoText: { color: theme.colors.foregroundMuted, fontFamily: theme.typography.fontFamily.medium },
  searchWrap: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
  },
  modalSectionRow: { marginTop: theme.spacing.lg },
  modalSectionTitle: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  modalList: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
  modalEmpty: { color: theme.colors.foregroundMuted, fontFamily: theme.typography.fontFamily.regular },
  modalItemRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  dragBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
  },
  modalItemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reorderBtns: { flexDirection: 'row', alignItems: 'center' },
  reorderBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  checkPill: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  dividerRow: {
    marginTop: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  });
}
