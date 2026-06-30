import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthShell } from '../components/AuthShell';
import { BrandLockup } from '../components/BrandLockup';
import { Button } from '../components/Button';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import { isAccountActive } from '../store/auth';
import type { OraiaTheme } from '../theme';
import { brand } from '../theme/brand';

const REFRESH_INTERVAL_MS = 20_000;

export function PendingApprovalScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, refreshSession, clearSession } = useAppState();
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      await refreshSession();
    } finally {
      setChecking(false);
    }
  }, [refreshSession]);

  useFocusEffect(
    useCallback(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      checkStatus();
      const timer = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        checkStatus();
      }, REFRESH_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [checkStatus]),
  );

  useEffect(() => {
    if (isAccountActive(user)) {
      // Navigator key will switch to location picker on next render.
    }
  }, [user]);

  return (
    <AuthShell>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.brandWrap}>
            <BrandLockup size="compact" tagline={brand.tagline} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconRing}>
              <Ionicons name="hourglass-outline" size={36} color={theme.colors.secondary} />
            </View>

            <Text style={styles.title}>Awaiting approval</Text>
            <Text style={styles.subtitle}>
              Your account was created successfully. A team administrator will review your request
              and grant access to your workspace.
            </Text>

            {user?.email ? (
              <View style={styles.emailChip}>
                <Ionicons name="mail-outline" size={16} color={theme.colors.formCardMuted} />
                <Text style={styles.emailText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            ) : null}

            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.link} />
              <Text style={styles.tipText}>
                Use the same email as your HighLevel login so inbox and notifications work correctly
                after approval.
              </Text>
            </View>

            <Button
              title={checking ? 'Checking status…' : 'Check approval status'}
              onPress={checkStatus}
              disabled={checking}
              style={styles.primaryBtn}
            />

            {checking ? (
              <ActivityIndicator
                color={theme.colors.secondary}
                style={styles.spinner}
                accessibilityLabel="Checking approval status"
              />
            ) : null}

            <Pressable
              onPress={clearSession}
              style={styles.signOutBtn}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </AuthShell>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xl,
    },
    brandWrap: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    card: {
      borderRadius: 20,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.formCard,
      borderWidth: 1,
      borderColor: theme.colors.formCardBorder,
      alignItems: 'center',
      ...theme.shadows.card,
    },
    iconRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.isDark ? 'rgba(166, 150, 200, 0.12)' : 'rgba(212, 183, 216, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      color: theme.colors.formCardText,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.xl,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: theme.spacing.sm,
      color: theme.colors.formCardMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.md,
      textAlign: 'center',
    },
    emailChip: {
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      maxWidth: '100%',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47, 45, 121, 0.06)',
    },
    emailText: {
      flexShrink: 1,
      color: theme.colors.formCardText,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    tipBox: {
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.isDark ? 'rgba(47, 45, 121, 0.25)' : 'rgba(47, 45, 121, 0.08)',
    },
    tipText: {
      flex: 1,
      color: theme.colors.formCardMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.sm,
    },
    primaryBtn: {
      marginTop: theme.spacing.xl,
      alignSelf: 'stretch',
    },
    spinner: {
      marginTop: theme.spacing.md,
    },
    signOutBtn: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    signOutText: {
      color: theme.colors.formCardMuted,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
