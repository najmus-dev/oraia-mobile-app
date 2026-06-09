import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useFullScreenBottomInset, useHeaderTopPadding } from '../lib/safeArea';
import { userDisplayName, userInitials } from '../lib/userDisplay';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { TextField } from '../components/TextField';
import { BottomSheet } from '../components/BottomSheet';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import {
  SettingsAppearancePicker,
  SettingsGroup,
  SettingsLogoutButton,
  SettingsProfileCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSection,
  type AppearanceMode,
} from '../components/settings/SettingsUi';
import type { HomeStackParamList } from '../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

const APPEARANCE_KEY = 'oraia.appearance';
const LANGUAGE_OPTIONS = [{ key: 'en', label: 'English' }] as const;

export function SettingsScreen({ navigation }: Props) {
  const paddingTop = useHeaderTopPadding();
  const bodyBottom = useFullScreenBottomInset();
  const { user, locationId, locationName, apiBaseUrl, setApiBaseUrl, clearSession } = useAppState();
  const [appearance, setAppearance] = useState<AppearanceMode>('dark');
  const [language, setLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]['key']>('en');
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [draftBaseUrl, setDraftBaseUrl] = useState(apiBaseUrl);

  const displayName = userDisplayName(user?.email);
  const initials = userInitials(user?.email);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.key === language)?.label ?? 'English';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(APPEARANCE_KEY);
        if (!alive || !stored) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setAppearance(stored);
        }
      } catch {
        /* optional preference */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onAppearanceChange(mode: AppearanceMode) {
    setAppearance(mode);
    try {
      await SecureStore.setItemAsync(APPEARANCE_KEY, mode);
    } catch {
      /* best-effort */
    }
    if (mode === 'light') {
      Alert.alert('Appearance', 'Light mode is coming soon. The app currently uses dark theme.');
    } else if (mode === 'system') {
      Alert.alert('Appearance', 'System appearance will follow your device setting in a future update.');
    }
  }

  function saveApiHost() {
    if (!draftBaseUrl.trim().startsWith('http')) {
      Alert.alert('API Host', 'Base URL must start with http:// or https://');
      return;
    }
    setApiBaseUrl(draftBaseUrl);
    Alert.alert('Saved', 'API host updated.');
  }

  function signOut() {
    Alert.alert('Logout', 'End your session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: clearSession },
    ]);
  }

  return (
    <View style={styles.container}>
      <SettingsScreenHeader
        title="Settings"
        onBack={() => navigation.goBack()}
        paddingTop={paddingTop}
      />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bodyBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="General">
          <SettingsGroup>
            <SettingsProfileCard
              initials={initials}
              name={displayName}
              email={user?.email ?? '—'}
              last
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsGroup>
            <SettingsAppearancePicker value={appearance} onChange={onAppearanceChange} />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="Language">
          <SettingsGroup>
            <SettingsRow
              icon="globe-outline"
              label={languageLabel}
              onPress={() => setLanguageSheetOpen(true)}
              chevronDirection="down"
              last
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="Location">
          <SettingsGroup>
            <SettingsRow
              icon="business-outline"
              label="Switch Location"
              value={locationName?.trim() || locationId || 'None'}
              onPress={() => setLocationSheetOpen(true)}
              last
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="Calls">
          <SettingsGroup>
            <SettingsRow
              icon="call-outline"
              label="Inbound Calls"
              onPress={() => Alert.alert('Inbound Calls', 'Inbound call settings are coming soon.')}
              last
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsGroup>
            <SettingsRow
              icon="headset-outline"
              label="Call Support"
              onPress={() => Alert.alert('Support', 'Support phone routing is coming soon.')}
              last
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="More">
          <SettingsGroup>
            <SettingsRow icon="information-circle-outline" label="App Version" value={`v${appVersion}`} />
            <SettingsRow
              icon="ribbon-outline"
              label="View Licenses"
              onPress={() =>
                Alert.alert(
                  'Licenses',
                  'ORAIA CRM mobile app.\n\nBuilt with Expo, React Native, and React Navigation.',
                )
              }
              last
            />
          </SettingsGroup>
        </SettingsSection>

        {__DEV__ ? (
          <SettingsSection title="Developer">
            <SettingsGroup>
              <View style={styles.devBody}>
                <TextField
                  label="API Base URL"
                  value={draftBaseUrl}
                  onChangeText={setDraftBaseUrl}
                  placeholder="http://192.168.x.x:3000"
                  autoCapitalize="none"
                />
                <Text style={styles.devHint}>Current: {api.getBaseUrl()}</Text>
              </View>
              <SettingsRow icon="save-outline" label="Save API host" onPress={saveApiHost} last />
            </SettingsGroup>
          </SettingsSection>
        ) : null}

        <SettingsLogoutButton onPress={signOut} />
      </ScrollView>

      <BottomSheet
        visible={languageSheetOpen}
        onClose={() => setLanguageSheetOpen(false)}
        title="Language"
      >
        <View style={styles.sheetList}>
          {LANGUAGE_OPTIONS.map((option) => {
            const active = language === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.sheetRow, active && styles.sheetRowActive]}
                onPress={() => {
                  setLanguage(option.key);
                  setLanguageSheetOpen(false);
                }}
              >
                <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>
                  {option.label}
                </Text>
                {active ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

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
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  devBody: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  devHint: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  sheetList: {
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
  },
  sheetRowActive: {
    backgroundColor: 'rgba(47, 45, 121, 0.35)',
  },
  sheetRowText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  sheetRowTextActive: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});
