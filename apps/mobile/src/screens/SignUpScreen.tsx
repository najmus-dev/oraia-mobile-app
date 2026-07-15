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
  validateConfirmPassword,
  validateSignupPassword,
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

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { setSession } = useAppState();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const normalizedEmail = normalizeAuthEmail(email);
  const emailError = useMemo(
    () => validateAuthEmail(email, emailTouched),
    [email, emailTouched],
  );
  const passwordError = useMemo(
    () => validateSignupPassword(password, passwordTouched),
    [password, passwordTouched],
  );
  const confirmError = useMemo(
    () => validateConfirmPassword(password, confirmPassword, confirmTouched),
    [password, confirmPassword, confirmTouched],
  );
  const canSubmit =
    !loading &&
    !emailError &&
    !passwordError &&
    !confirmError &&
    !!normalizedEmail &&
    !!password &&
    !!confirmPassword;

  async function onSignUp() {
    setEmailTouched(true);
    setPasswordTouched(true);
    setConfirmTouched(true);
    if (emailError || passwordError || confirmError) return;
    setLoading(true);
    try {
      const res = await api.postJson<AuthSessionResponse>('/api/auth/signup', {
        email: normalizedEmail,
        password,
      });
      setSession(res.token, mapMeUserToAuthUser(res.user));
    } catch (e) {
      Alert.alert('Sign up failed', formatError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      header={
        <>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back to sign in"
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.shellForeground} />
          </Pressable>
          <View style={styles.brandWrap}>
            <BrandLockup size="compact" tagline={brand.tagline} />
          </View>
        </>
      }
    >
      <View style={styles.form}>
        <Text style={styles.formTitle}>Create your account</Text>
        <Text style={styles.formSubtitle}>
          Use the same work email as your HighLevel profile. An administrator will approve your
          access.
        </Text>

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
            textContentType="newPassword"
            autoComplete="password-new"
            autoCorrect={false}
            editable={!loading}
            style={styles.passwordInput}
            placeholder="At least 8 characters"
            placeholderTextColor={theme.colors.formCardMuted}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => confirmRef.current?.focus()}
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

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Confirm password</Text>
        <View style={[styles.passwordWrap, confirmError ? styles.inputError : null]}>
          <TextInput
            ref={confirmRef}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => setConfirmTouched(true)}
            secureTextEntry={!showConfirm}
            textContentType="newPassword"
            autoComplete="password-new"
            autoCorrect={false}
            editable={!loading}
            style={styles.passwordInput}
            placeholder="Re-enter your password"
            placeholderTextColor={theme.colors.formCardMuted}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canSubmit) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                onSignUp();
              }
            }}
          />
          <Pressable
            hitSlop={8}
            style={styles.eyeBtn}
            onPress={() => setShowConfirm((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.colors.formCardMuted}
            />
          </Pressable>
        </View>
        {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}

        <Button
          title={loading ? 'Creating account…' : 'Create account'}
          onPress={onSignUp}
          disabled={!canSubmit}
          style={styles.submitBtn}
        />

        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.switchLink}
          accessibilityRole="button"
        >
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={styles.switchTextBold}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </AuthFormScreen>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    backBtn: {
      alignSelf: 'flex-start',
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
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
    fieldLabelSpaced: { marginTop: theme.spacing.lg },
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
    inputError: { borderColor: theme.colors.danger },
    errorText: {
      marginTop: theme.spacing.xs,
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
    },
    submitBtn: { marginTop: theme.spacing.xl },
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
