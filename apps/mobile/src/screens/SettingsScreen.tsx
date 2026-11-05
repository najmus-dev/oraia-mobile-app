import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatError } from '../lib/errors';
import {
  openAppNotificationSettings,
  registerForPushNotificationsAsync,
  remotePushUnavailableMessage,
  sendTestPushToApi,
  syncPushTokenWithApi,
} from '../lib/pushNotifications';
import { useFullScreenBottomInset, useHeaderTopPadding } from '../lib/safeArea';
import { userDisplayName, userInitials } from '../lib/userDisplay';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import { useThemeState } from '../state/ThemeState';
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
import type { OraiaTheme } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

const LANGUAGE_OPTIONS = [{ key: 'en', label: 'English' }] as const;

export function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { preference: appearance, setPreference: setAppearance } = useThemeState();
  const paddingTop = useHeaderTopPadding();
  const bodyBottom = useFullScreenBottomInset();
  const { user, token, locationId, locationName, apiBaseUrl, setApiBaseUrl, clearSession } =
    useAppState();
  const [language, setLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]['key']>('en');
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [draftBaseUrl, setDraftBaseUrl] = useState(apiBaseUrl);
  const [testingPush, setTestingPush] = useState(false);

  const displayName = userDisplayName(user?.email);
  const initials = userInitials(user?.email);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.key === language)?.label ?? 'English';

  function onAppearanceChange(mode: AppearanceMode) {
    setAppearance(mode);
  }

  function saveApiHost() {
    if (!draftBaseUrl.trim().startsWith('http')) {
      Alert.alert('API Host', 'Base URL must start with http:// or https://');
      return;
    }
    setApiBaseUrl(draftBaseUrl);
    Alert.alert('Saved', 'API host updated.');
  }

  async function sendTestNotification() {
    if (!token || !locationId) {
      Alert.alert('Notifications', 'Sign in and pick a location first.');
      return;
    }
    setTestingPush(true);
    try {
      const unavailable = remotePushUnavailableMessage();
      if (unavailable) {
        Alert.alert('Notifications', unavailable);
        return;
      }
      const pushToken = await registerForPushNotificationsAsync();
      await syncPushTokenWithApi(pushToken, token, locationId);
      await sendTestPushToApi(token, locationId);
      Alert.alert('Notifications', 'Test alert sent. You should see it on this phone in a few seconds.');
    } catch (err) {
      const message = formatError(err);
      Alert.alert(
        'Notifications',
        message,
        message.includes('turned off')
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open settings', onPress: () => void openAppNotificationSettings() },
            ]
          : [{ text: 'OK' }],
      );
    } finally {
      setTestingPush(false);
    }
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

        <SettingsSection title="Notifications">
          <SettingsGroup>
            <SettingsRow
              icon="notifications-outline"
              label={testingPush ? 'Sending test…' : 'Send test notification'}
              onPress={() => {
                if (!testingPush) {
                  void sendTestNotification();
                }
              }}
            />
            <SettingsRow
              icon="call-outline"
              label="SMS & call alerts"
              onPress={() =>
                Alert.alert(
                  'SMS & call alerts',
                  'Inbound SMS, missed calls, voicemail, and email notify this phone like HighLevel. Outbound Call opens your phone dialer — live ringing and calling from the GHL number still use the HighLevel LC Phone app.',
                )
              }
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

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
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
    color: theme.colors.foregroundMuted,
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
    backgroundColor: `${theme.colors.primary}59`,
  },
  sheetRowText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  sheetRowTextActive: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  });
}
