import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import type { AuthSessionResponse } from '../lib/auth';
import { mapMeUserToAuthUser } from '../lib/auth';
import {
  normalizeAuthEmail,
  validateAuthEmail,
  validateLoginPassword,
} from '../lib/authValidation';
import { formatError } from '../lib/errors';
import { brand } from '../theme/brand';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { useAppState } from '../state/AppState';
import type { RootStackParamList } from '../navigation/types';
import { AuthFormScreen } from '../components/AuthFormScreen';
import { BrandLockup } from '../components/BrandLockup';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { setSession } = useAppState();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const normalizedEmail = normalizeAuthEmail(email);
  const emailError = useMemo(
    () => validateAuthEmail(email, emailTouched),
    [email, emailTouched],
  );
  const passwordError = useMemo(
    () => validateLoginPassword(password, passwordTouched),
    [password, passwordTouched],
  );
  const canSubmit = !loading && !emailError && !passwordError && !!normalizedEmail && !!password;

  async function onLogin() {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!normalizedEmail || !password) {
      Alert.alert('Login', 'Please enter your email and password.');
      return;
    }
    if (emailError || passwordError) return;
    setLoading(true);
    try {
      const res = await api.postJson<AuthSessionResponse>('/api/auth/login', {
        email: normalizedEmail,
        password,
      });
      setSession(res.token, mapMeUserToAuthUser(res.user));
    } catch (e) {
      Alert.alert('Login failed', formatError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      header={
        <View style={styles.brandWrap}>
          <BrandLockup size="compact" tagline={brand.tagline} />
        </View>
      }
    >
      <View style={styles.form}>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Enter your credentials to continue.</Text>

        <Text style={styles.fieldLabel}>Work email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          onBlur={() => setEmailTouched(true)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!loading}
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="you@company.com"
          placeholderTextColor={theme.colors.formCardMuted}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Password</Text>
        <View style={[styles.passwordWrap, passwordError ? styles.inputError : null]}>
          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            onBlur={() => setPasswordTouched(true)}
            secureTextEntry={!showPassword}
            textContentType="password"
            autoComplete="password"
            autoCorrect={false}
            editable={!loading}
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.formCardMuted}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canSubmit) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                onLogin();
              }
            }}
          />
          <Pressable
            hitSlop={8}
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.colors.formCardMuted}
            />
          </Pressable>
        </View>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <Button
          title={loading ? 'Signing in…' : 'Sign in'}
          onPress={onLogin}
          disabled={!canSubmit}
          style={styles.submitBtn}
        />

        <Pressable
          onPress={() => navigation.navigate('SignUp')}
          style={styles.switchLink}
          accessibilityRole="button"
        >
          <Text style={styles.switchText}>
            Don&apos;t have an account?{' '}
            <Text style={styles.switchTextBold}>Create one</Text>
          </Text>
        </Pressable>
      </View>
    </AuthFormScreen>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    brandWrap: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    form: {
      borderRadius: 20,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.formCard,
      borderWidth: 1,
      borderColor: theme.colors.formCardBorder,
      ...theme.shadows.card,
    },
    formTitle: {
      color: theme.colors.formCardText,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.xl,
    },
    formSubtitle: {
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
      color: theme.colors.formCardMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.md,
    },
    fieldLabel: {
      color: theme.colors.formCardText,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    fieldLabelSpaced: {
      marginTop: theme.spacing.lg,
    },
    input: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.formCardBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      color: theme.colors.formCardText,
      backgroundColor: theme.colors.formCard,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.md,
    },
    passwordWrap: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.formCardBorder,
      borderRadius: theme.radius.md,
      paddingLeft: theme.spacing.lg,
      paddingRight: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.formCard,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingRight: theme.spacing.sm,
      color: theme.colors.formCardText,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.md,
    },
    eyeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
      ...(Platform.OS === 'android' ? { elevation: 2 } : null),
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    errorText: {
      marginTop: theme.spacing.xs,
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
    submitBtn: {
      marginTop: theme.spacing.xl,
    },
    switchLink: {
      marginTop: theme.spacing.lg,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    switchText: {
      color: theme.colors.formCardMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.sm,
    },
    switchTextBold: {
      color: theme.colors.secondary,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
}
