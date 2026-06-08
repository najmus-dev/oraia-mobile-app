import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ScreenHeader } from '../components/ScreenHeader';
import type { HomeStackParamList } from '../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const bodyBottom = useFullScreenBottomInset();
  const { user, locationId, apiBaseUrl, setApiBaseUrl, setLocationId, clearSession } = useAppState();
  const [draftBaseUrl, setDraftBaseUrl] = useState(apiBaseUrl);

  function save() {
    if (!draftBaseUrl.trim().startsWith('http')) {
      Alert.alert('API Host', 'Base URL must start with http:// or https://');
      return;
    }
    setApiBaseUrl(draftBaseUrl);
    Alert.alert('Saved', 'API host updated.');
  }

  function switchLocation() {
    Alert.alert('Switch location', 'Choose a different sub-account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch', onPress: () => setLocationId(null) },
    ]);
  }

  function signOut() {
    Alert.alert('Sign out', 'End your session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: clearSession },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Settings"
        subtitle={user?.email ?? '—'}
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.body, { paddingBottom: bodyBottom }]}>
        {__DEV__ ? (
          <>
            <TextField
              label="API Base URL"
              value={draftBaseUrl}
              onChangeText={setDraftBaseUrl}
              placeholder="http://192.168.x.x:3000"
              autoCapitalize="none"
            />
            <Button title="Save API host" onPress={save} style={{ marginTop: theme.spacing.lg }} />
            <Text style={styles.hint}>
              Phone on Wi‑Fi: use your PC&apos;s LAN IP, e.g. http://192.168.18.22:3000 (same network as
              Metro).
              {'\n'}Current: {api.getBaseUrl()}
            </Text>
            <View style={styles.divider} />
          </>
        ) : null}

        <Button title="Switch location" variant="ghost" onPress={switchLocation} />
        <Text style={styles.locationLabel}>Current location</Text>
        <Text style={styles.locationValue}>{locationId ?? 'None'}</Text>

        <View style={styles.divider} />

        <Button title="Sign out" variant="dark" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { padding: theme.spacing.xl },
  divider: { height: theme.spacing.xl },
  locationLabel: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  hint: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.lineHeight.sm,
  },
});
