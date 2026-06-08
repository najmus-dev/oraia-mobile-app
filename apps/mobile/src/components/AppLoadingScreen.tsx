import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import agencyLogo from '../../assets/oraia logo.png';

export function AppLoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <Image source={agencyLogo} style={styles.logo} />
      <Text style={styles.title}>ORAIA CRM</Text>
      <ActivityIndicator color={theme.colors.secondary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.shell,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
    letterSpacing: 0.6,
  },
  spinner: { marginTop: theme.spacing.xl },
  message: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
});
