import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { DashboardHeader } from '../components/DashboardHeader';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import {
  CRM_APPS,
  CRM_APP_SECTIONS,
  crmAppAccent,
  openCrmApp,
  type CrmAppDef,
} from '../lib/crmApps';
import { TAB_LIST_BOTTOM_PADDING } from '../lib/safeArea';
import { getTabNavigation, navigateToTabScreen } from '../lib/navigation';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import type { OraiaTheme } from '../theme';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'AppsHome'>;

export function AppsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { locationName, locationAddress, locationLogoUrl } = useAppState();
  const [query, setQuery] = useState('');
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const tabNav = getTabNavigation(navigation);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CRM_APP_SECTIONS.map((section) => ({
      ...section,
      apps: section.appIds
        .map((id) => CRM_APPS[id])
        .filter((app) => app.available)
        .filter((app) => !q || app.label.toLowerCase().includes(q)),
    })).filter((section) => section.apps.length > 0);
  }, [query]);

  function openApp(app: CrmAppDef) {
    if (!app.available) {
      Alert.alert(app.label, 'This app is coming soon on mobile.');
      return;
    }
    openCrmApp(app.id, tabNav ?? navigation);
  }

  return (
    <View style={styles.container}>
      <DashboardHeader
        locationName={locationName}
        locationAddress={locationAddress}
        locationLogoUrl={locationLogoUrl}
        onOpenLocation={() => setLocationSheetOpen(true)}
        onNotifications={() => navigateToTabScreen(navigation, 'HomeTab', 'Notifications')}
        onSettings={() => navigateToTabScreen(navigation, 'HomeTab', 'Settings')}
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Apps"
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={theme.colors.foregroundMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: TAB_LIST_BOTTOM_PADDING }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.appsGrid}>
              {section.apps.map((app) => (
                <AppTile key={app.id} app={app} onPress={() => openApp(app)} />
              ))}
            </View>
          </View>
        ))}

        {sections.length === 0 ? (
          <Text style={styles.empty}>No apps match your search.</Text>
        ) : null}
      </ScrollView>

      <LocationSelectSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onSelected={() => setLocationSheetOpen(false)}
      />
    </View>
  );
}

function AppTile({ app, onPress }: { app: CrmAppDef; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const accent = crmAppAccent(app, theme);

  return (
    <Pressable style={styles.appTile} onPress={onPress} accessibilityRole="button">
      <View style={[styles.appIconCircle, { borderColor: `${accent}55` }]}>
        <Ionicons name={app.icon} size={22} color={accent} />
      </View>
      <Text style={styles.appLabel} numberOfLines={2}>
        {app.label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchWrap: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    paddingVertical: theme.spacing.md,
  },
  body: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.lg,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
  },
  appTile: {
    width: '22%',
    minWidth: 72,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  appIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    marginTop: theme.spacing.xl,
  },
  });
}
