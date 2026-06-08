import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  type ContactFormValues,
  type ContactResponse,
  emptyContactFormValues,
  formatContactPhoneInput,
  formValuesToPayload,
  PHONE_TYPES,
  validateContactForm,
} from '../lib/contacts';
import { PHONE_COUNTRY_CODES } from '../lib/phoneFormat';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { TextField } from '../components/TextField';
import { ContactFormDndSection } from '../components/contacts/ContactFormDndSection';
import { ContactPhoneField } from '../components/contacts/ContactPhoneField';
import { FormFieldLabel } from '../components/contacts/FormFieldLabel';
import { OptionPickerSheet } from '../components/contacts/OptionPickerSheet';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'ScanBusinessCard'>;

const COUNTRY_CODE_OPTIONS = PHONE_COUNTRY_CODES.map((entry) => `${entry.code} ${entry.label}`);

export function ScanBusinessCardScreen({ navigation }: Props) {
  const scrollBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [values, setValues] = useState<ContactFormValues>(emptyContactFormValues());
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [phoneTypeOpen, setPhoneTypeOpen] = useState(false);
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);

  function patch(next: Partial<ContactFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  async function pickImage(side: 'front' | 'back') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera', 'Camera permission is required to scan a business card.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    if (side === 'front') setFrontUri(result.assets[0].uri);
    else setBackUri(result.assets[0].uri);
  }

  async function refineWithAi() {
    if (!frontUri && !backUri) {
      Alert.alert('Scan', 'Capture at least one side of the card first.');
      return;
    }
    setAiBusy(true);
    setTimeout(() => {
      setAiBusy(false);
      Alert.alert(
        'AI extraction',
        'Card images are saved locally. Fill in the form below or enter details manually — full OCR integration can be added in a later phase.',
      );
    }, 1200);
  }

  async function save() {
    if (!token || !locationId) return;
    const validationError = validateContactForm(values, { requireFirstName: true });
    if (validationError) {
      Alert.alert('Save contact', validationError);
      return;
    }
    setSaving(true);
    try {
      const res = await api.postJson<ContactResponse>(
        '/api/contacts',
        formValuesToPayload(values),
        { headers: withAuthHeaders({ token, locationId }) },
      );
      navigation.replace('ContactDetail', { contactId: res.contact.id });
    } catch (e) {
      Alert.alert('Save failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppBar title="Scan Business Card" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: scrollBottom + 88 }]}>
          <Text style={styles.sectionTitle}>Scanned Card Images</Text>

          <View style={styles.cardBox}>
            {frontUri ? (
              <Image source={{ uri: frontUri }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons name="image-outline" size={28} color={theme.colors.mutedTextOnDark} />
                <Text style={styles.placeholderText}>Front side</Text>
              </View>
            )}
            <Pressable style={styles.scanBtn} onPress={() => pickImage('front')}>
              <Ionicons name="scan-outline" size={18} color={theme.colors.link} />
              <Text style={styles.scanBtnText}>Scan Front</Text>
            </Pressable>
          </View>

          <View style={styles.cardBox}>
            {backUri ? (
              <Image source={{ uri: backUri }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons name="image-outline" size={28} color={theme.colors.mutedTextOnDark} />
                <Text style={styles.placeholderText}>Back side</Text>
              </View>
            )}
            <Pressable style={styles.scanBtn} onPress={() => pickImage('back')}>
              <Ionicons name="scan-outline" size={18} color={theme.colors.link} />
              <Text style={styles.scanBtnText}>Scan Back</Text>
            </Pressable>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>
              First name<Text style={styles.required}> *</Text>
            </Text>
          </View>
          <TextField
            value={values.firstName}
            onChangeText={(t) => patch({ firstName: t })}
            placeholder="First name"
            autoCapitalize="words"
          />
          <TextField
            label="Last name"
            value={values.lastName}
            onChangeText={(t) => patch({ lastName: t })}
            placeholder="Last name"
            autoCapitalize="words"
          />

          <FormFieldLabel label="Email" primary />
          <TextField
            value={values.email}
            onChangeText={(t) => patch({ email: t })}
            placeholder="abc@xyz.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <ContactPhoneField
            phoneType={values.phoneType}
            countryCode={values.phoneCountryCode}
            value={values.phone}
            onPressType={() => setPhoneTypeOpen(true)}
            onPressCountryCode={() => setCountryCodeOpen(true)}
            onChangeText={(text) =>
              patch({
                phone: formatContactPhoneInput(text, values.phoneCountryCode),
              })
            }
          />

          <ContactFormDndSection values={values} onChange={patch} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: scrollBottom }]}>
          <Pressable style={styles.secondaryBtn} onPress={refineWithAi} disabled={aiBusy}>
            {aiBusy ? (
              <ActivityIndicator color={theme.colors.link} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color={theme.colors.link} />
                <Text style={styles.secondaryText}>Refine with AI</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={save} disabled={saving}>
            <Ionicons name="save-outline" size={18} color={theme.colors.white} />
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save Contact'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {aiBusy ? (
        <View style={styles.aiOverlay}>
          <Ionicons name="sparkles" size={32} color={theme.colors.link} />
          <Text style={styles.aiTitle}>Creating your contact with AI</Text>
          <Text style={styles.aiSub}>Sit back while we work the magic and fill the form for you</Text>
        </View>
      ) : null}

      <OptionPickerSheet
        visible={phoneTypeOpen}
        title="Phone type"
        options={PHONE_TYPES}
        selected={values.phoneType}
        onClose={() => setPhoneTypeOpen(false)}
        onSelect={(phoneType) => patch({ phoneType })}
      />
      <OptionPickerSheet
        visible={countryCodeOpen}
        title="Country code"
        options={COUNTRY_CODE_OPTIONS}
        selected={`${values.phoneCountryCode} ${PHONE_COUNTRY_CODES.find((e) => e.code === values.phoneCountryCode)?.label ?? ''}`.trim()}
        onClose={() => setCountryCodeOpen(false)}
        onSelect={(option) => {
          const code = option.split(' ')[0] ?? values.phoneCountryCode;
          patch({
            phoneCountryCode: code,
            phone: formatContactPhoneInput(values.phone, code),
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  body: { padding: theme.spacing.xl, gap: theme.spacing.lg },
  sectionTitle: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardBox: {
    borderWidth: 1,
    borderColor: 'rgba(134, 182, 255, 0.25)',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
  },
  preview: { width: '100%', height: 160 },
  previewPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  placeholderText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  scanBtnText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: -theme.spacing.sm,
  },
  fieldLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  required: { color: theme.colors.danger },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(134, 182, 255, 0.45)',
    paddingVertical: theme.spacing.lg,
    backgroundColor: 'rgba(47, 45, 121, 0.25)',
  },
  secondaryText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 14,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  aiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 120,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  aiTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
  },
  aiSub: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
  },
});
