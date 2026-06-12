import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSheetBottomPadding } from '../lib/safeArea';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatError } from '../lib/errors';
import {
  type LocationItem,
  type LocationsResponse,
  locationItemAddress,
  locationItemName,
  matchesLocationQuery,
} from '../lib/locationTypes';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import type { OraiaTheme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationAvatar } from './LocationAvatar';
import { AuthShell } from './AuthShell';
import { BootstrapLoader } from './BootstrapLoader';
import { ListBusyState } from './ListBusyState';

type Section = {
  key: string;
  title: string;
  data: LocationItem[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** First login: must pick a location; backdrop tap won't dismiss. */
  required?: boolean;
  onSelected?: () => void;
  /** Full-screen onboarding layout for first location pick. */
  presentation?: 'modal' | 'fullscreen';
};

export function LocationSelectSheet({
  visible,
  onClose,
  required,
  onSelected,
  presentation = 'modal',
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles((t) => createStyles(t, presentation));
  const onShellCanvas = presentation === 'fullscreen';
  const pinMutedColor = onShellCanvas
    ? theme.colors.shellForegroundMuted
    : theme.colors.foregroundMuted;
  const closeIconColor = onShellCanvas ? theme.colors.shellForeground : theme.colors.foreground;
  const sheetBottom = useSheetBottomPadding();
  const {
    token,
    locationId,
    setLocation,
    recentLocationIds,
    pinnedLocationIds,
    togglePinLocation,
  } = useAppState();

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getJson<LocationsResponse>('/api/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLocations(res.locations ?? []);
    } catch (e) {
      Alert.alert('Could not load locations', formatError(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      load();
    }
  }, [visible, load]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return locations;
    return locations.filter((item) => matchesLocationQuery(item, q));
  }, [locations, query]);

  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  const sections = useMemo((): Section[] => {
    if (query.trim()) {
      return filtered.length ? [{ key: 'results', title: 'Results', data: filtered }] : [];
    }

    const current = locationId ? byId.get(locationId) : undefined;
    const used = new Set<string>();
    const out: Section[] = [];

    if (current) {
      used.add(current.id);
      out.push({ key: 'current', title: '', data: [current] });
    }

    const recent = recentLocationIds
      .map((id) => byId.get(id))
      .filter((x): x is LocationItem => !!x && !used.has(x.id));
    recent.forEach((r) => used.add(r.id));
    if (recent.length) {
      out.push({ key: 'recent', title: 'Recent', data: recent });
    }

    const pinned = pinnedLocationIds
      .map((id) => byId.get(id))
      .filter((x): x is LocationItem => !!x && !used.has(x.id));
    pinned.forEach((p) => used.add(p.id));

    const allData = filtered
      .filter((l) => !used.has(l.id))
      .sort((a, b) => {
        const aPin = pinnedLocationIds.includes(a.id) ? 0 : 1;
        const bPin = pinnedLocationIds.includes(b.id) ? 0 : 1;
        if (aPin !== bPin) return aPin - bPin;
        return locationItemName(a).localeCompare(locationItemName(b));
      });
    if (allData.length) {
      out.push({ key: 'all', title: 'All', data: allData });
    }

    return out;
  }, [query, filtered, locationId, byId, recentLocationIds, pinnedLocationIds]);

  function select(item: LocationItem) {
    setLocation({
      id: item.id,
      name: locationItemName(item),
      address: locationItemAddress(item),
      logoUrl: item.logoUrl,
    });
    onSelected?.();
    if (!required) onClose();
  }

  function handleBackdropPress() {
    if (!required) onClose();
  }

  function renderRow(item: LocationItem, isCurrent: boolean) {
    const pinned = pinnedLocationIds.includes(item.id);
    const address = locationItemAddress(item);

    return (
      <View style={[styles.row, isCurrent && styles.rowCurrent]}>
        <Pressable style={styles.rowMain} onPress={() => select(item)}>
          <LocationAvatar name={locationItemName(item)} logoUrl={item.logoUrl} size={44} />
          <View style={styles.rowBody}>
            <View style={styles.nameRow}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {locationItemName(item)}
              </Text>
              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              ) : null}
            </View>
            {address ? (
              <Text style={styles.rowAddress} numberOfLines={2}>
                {address}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
          style={styles.pinBtn}
          onPress={() => togglePinLocation(item.id)}
          accessibilityRole="button"
          accessibilityLabel={pinned ? 'Unpin location' : 'Pin location'}
        >
          <Ionicons
            name={pinned ? 'pin' : 'pin-outline'}
            size={18}
            color={pinned ? theme.colors.link : pinMutedColor}
          />
        </Pressable>
      </View>
    );
  }

  const list = loading && locations.length === 0 ? (
    presentation === 'fullscreen' ? (
      <View style={styles.fullscreenLoader}>
        <BootstrapLoader message="Loading locations…" />
      </View>
    ) : (
      <ListBusyState blocking message="Loading locations…" />
    )
  ) : (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator
      style={presentation === 'fullscreen' ? styles.fullscreenList : undefined}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      renderSectionHeader={({ section }) =>
        section.title ? (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionLine} />
          </View>
        ) : null
      }
      renderItem={({ item, section }) =>
        renderRow(item, section.key === 'current' || item.id === locationId)
      }
      ListEmptyComponent={
        !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No locations found</Text>
            <Text style={styles.emptySub}>
              Install the marketplace app on sub-accounts in GHL, then pull to refresh.
            </Text>
            <Pressable onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Refresh</Text>
            </Pressable>
          </View>
        ) : null
      }
      refreshing={loading}
      onRefresh={load}
    />
  );

  const search = (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={18} color={pinMutedColor} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for a sub-account"
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  const modalPanel = (
    <View style={[styles.sheet, { paddingBottom: sheetBottom }]}>
      <View style={styles.handle} />
      <View style={styles.sheetHeader}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color={closeIconColor} />
        </Pressable>
        <Text style={styles.sheetTitle}>Select Location</Text>
        <View style={styles.closeBtn} />
      </View>
      {search}
      {list}
    </View>
  );

  const fullscreenPanel = (
    <View style={[styles.fullscreenPanel, { paddingBottom: sheetBottom }]}>
      <View style={styles.fullscreenTopBar}>
        <View style={styles.closeBtn} />
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.signOutBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.fullscreenHeading}>
        <Text style={styles.fullscreenTitle}>Choose a location</Text>
        <Text style={styles.fullscreenSubtitle}>
          Select your workspace
        </Text>
      </View>

      {search}
      {list}
    </View>
  );

  if (!visible) return null;

  if (presentation === 'fullscreen') {
    return (
      <AuthShell>
        <SafeAreaView style={styles.fullscreenRoot} edges={['top']}>
          {fullscreenPanel}
        </SafeAreaView>
      </AuthShell>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleBackdropPress}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
        {modalPanel}
      </View>
    </Modal>
  );
}

function createStyles(theme: OraiaTheme, presentation: 'modal' | 'fullscreen') {
  const onShellCanvas = presentation === 'fullscreen';
  const titleColor = onShellCanvas ? theme.colors.shellForeground : theme.colors.foreground;
  const mutedColor = onShellCanvas
    ? theme.colors.shellForegroundMuted
    : theme.colors.foregroundMuted;

  return StyleSheet.create({
  fullscreenRoot: {
    flex: 1,
    backgroundColor: theme.colors.shell,
  },
  fullscreenPanel: {
    flex: 1,
    backgroundColor: theme.colors.shell,
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  signOutBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  signOutText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  fullscreenHeading: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  fullscreenTitle: {
    color: theme.colors.shellForeground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize['2xl'],
    lineHeight: theme.typography.lineHeight.xl,
  },
  fullscreenSubtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.shellForegroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.md,
  },
  fullscreenLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing['2xl'],
  },
  fullscreenList: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${theme.colors.black}8C`,
  },
  sheet: {
    maxHeight: '88%',
    minHeight: '55%',
    backgroundColor: theme.colors.sheet,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    color: titleColor,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: onShellCanvas ? theme.colors.border : theme.colors.borderLight,
    backgroundColor: onShellCanvas ? theme.colors.surface : theme.colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    color: titleColor,
    fontFamily: theme.typography.fontFamily.regular,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  sectionTitle: {
    color: mutedColor,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowCurrent: {
    backgroundColor: `${theme.colors.primary}12`,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xs,
    borderBottomWidth: 0,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    minWidth: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  rowTitle: {
    color: titleColor,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
    flexShrink: 1,
  },
  currentBadge: {
    backgroundColor: `${theme.colors.primary}1F`,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}40`,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.xs,
  },
  rowAddress: {
    marginTop: 4,
    color: mutedColor,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  pinBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingTop: theme.spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    color: titleColor,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    color: mutedColor,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.md,
  },
  retryBtn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  });
}
