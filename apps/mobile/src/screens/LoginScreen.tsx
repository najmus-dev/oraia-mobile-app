import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatError } from '../lib/errors';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../components/Button';
import agencyLogo from '../../assets/oraia logo.png';
import { Image } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginResponse = {
  token: string;
  user: { id: string; email: string; role: 'agency_admin' | 'staff'; companyId?: string };
};

export function LoginScreen(_props: Props) {
  const { setSession } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const emailError = useMemo(() => {
    if (!emailTouched) return '';
    if (!normalizedEmail) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return 'Enter a valid email address.';
    return '';
  }, [emailTouched, normalizedEmail]);
  const passwordError = useMemo(() => {
    if (!passwordTouched) return '';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }, [passwordTouched, password]);
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
      const res = await api.postJson<LoginResponse>('/api/auth/login', { email: normalizedEmail, password });
      setSession(res.token, res.user);
    } catch (e) {
      Alert.alert('Login failed', formatError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
      <View style={styles.brandWrap}>
        <Image source={agencyLogo} style={styles.logo} />
        <Text style={styles.title}>ORAIA CRM</Text>
        <Text style={styles.subtitle}>Welcome back. Sign in to continue.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Work Email</Text>
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
          placeholderTextColor={theme.colors.mutedText}
          returnKeyType="next"
        />
        {!!emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <View style={styles.fieldGap} />

        <Text style={styles.fieldLabel}>Password</Text>
        <View style={[styles.passwordWrap, passwordError ? styles.inputError : null]}>
          <TextInput
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
            placeholderTextColor={theme.colors.mutedText}
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
              size={18}
              color={theme.colors.mutedText}
            />
          </Pressable>
        </View>
        {!!passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <Button
          title={loading ? 'Signing in…' : 'Sign in'}
          onPress={onLogin}
          disabled={!canSubmit}
          style={{ marginTop: theme.spacing.xl }}
        />
        <Text style={styles.helper}>
          Use your agency admin or staff credentials provisioned in ORAIA API.
        </Text>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.navy,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.navy,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 16,
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize['2xl'],
    lineHeight: theme.typography.lineHeight.xl,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  form: {
    borderRadius: 16,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  input: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.white,
    fontFamily: theme.typography.fontFamily.regular,
  },
  passwordWrap: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: {
    borderColor: '#D14343',
  },
  errorText: {
    marginTop: theme.spacing.xs,
    color: '#D14343',
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  fieldGap: {
    height: theme.spacing.lg,
  },
  helper: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
});

