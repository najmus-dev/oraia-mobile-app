import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthShell } from '../components/AuthShell';
import { BrandLockup } from '../components/BrandLockup';
import { Button } from '../components/Button';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import type { OraiaTheme } from '../theme';
import { brand } from '../theme/brand';

const REFRESH_INTERVAL_MS = 20_000;

export function PendingApprovalScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { user, refreshSession, clearSession } = useAppState();
  const [checking, setChecking] = useState(false);
  const mountedRef = useRef(true);

  const checkStatus = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      if (opts?.showLoading) setChecking(true);
      try {
        await refreshSession();
      } finally {
        if (opts?.showLoading && mountedRef.current) setChecking(false);
      }
    },
    [refreshSession],
  );

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      // Silent refresh — no button/spinner flicker on mount or background poll.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      checkStatus();
      const timer = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        checkStatus();
      }, REFRESH_INTERVAL_MS);
      return () => {
        mountedRef.current = false;
        clearInterval(timer);
      };
    }, [checkStatus]),
  );

  return (
    <AuthShell>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
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
                <Text style={styles.emailText} numberOfLines={2}>
                  {user.email}
                </Text>
              </View>
            ) : null}

            <View style={styles.tipBox}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={theme.colors.link}
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>
                Use the same email as your HighLevel login so inbox and notifications work correctly
                after approval.
              </Text>
            </View>

            <Button
              title={checking ? 'Checking status…' : 'Check approval status'}
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                checkStatus({ showLoading: true });
              }}
              disabled={checking}
              style={styles.primaryBtn}
            />

            <Pressable
              onPress={clearSession}
              style={styles.signOutBtn}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthShell>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
    brandWrap: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    card: {
      alignSelf: 'stretch',
      width: '100%',
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
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47, 45, 121, 0.06)',
    },
    emailText: {
      flex: 1,
      color: theme.colors.formCardText,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    tipBox: {
      marginTop: theme.spacing.lg,
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.isDark ? 'rgba(47, 45, 121, 0.25)' : 'rgba(47, 45, 121, 0.08)',
    },
    tipIcon: {
      marginTop: 1,
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
