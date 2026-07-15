import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthShell } from './AuthShell';
import { useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

type Props = {
  children: ReactNode;
  header?: ReactNode;
};

/**
 * Auth flows with keyboard-safe scrolling. Top-aligned content avoids fields
 * sitting under the keyboard on Android (especially with edge-to-edge).
 */
export function AuthFormScreen({ children, header }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const keyboardOffset = Platform.OS === 'ios' ? insets.top : 0;

  return (
    <AuthShell>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            contentInsetAdjustmentBehavior="automatic"
          >
            {header}
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthShell>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
  });
}
