import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  CONTACT_TYPES,
  PHONE_TYPES,
  type ContactFormValues,
  type ContactResponse,
  contactToFormValues,
  emptyContactFormValues,
  formatContactPhoneInput,
  formValuesToPayload,
  validateContactForm,
} from '../lib/contacts';
import { PHONE_COUNTRY_CODES } from '../lib/phoneFormat';
import { timezoneLabel } from '../lib/contactTimezones';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { TextField } from '../components/TextField';
import { FormPickerField } from '../components/FormPickerField';
import { ContactFormDndSection } from '../components/contacts/ContactFormDndSection';
import { ContactPhoneField } from '../components/contacts/ContactPhoneField';
import { FormFieldLabel } from '../components/contacts/FormFieldLabel';
import { OptionPickerSheet } from '../components/contacts/OptionPickerSheet';
import { TimezonePickerSheet } from '../components/contacts/TimezonePickerSheet';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'ContactForm'>;

const COUNTRY_CODE_OPTIONS = PHONE_COUNTRY_CODES.map((entry) => `${entry.code} ${entry.label}`);

export function ContactFormScreen({ navigation, route }: Props) {
  const scrollBottom = useFullScreenBottomInset();
  const contactId = route.params?.contactId;
  const isEdit = Boolean(contactId);
  const { token, locationId } = useAppState();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<ContactFormValues>(emptyContactFormValues());
  const [phoneTypeOpen, setPhoneTypeOpen] = useState(false);
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [contactTypeOpen, setContactTypeOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const load = useCallback(async () => {
    if (!isEdit || !contactId || !token || !locationId) return;
    setLoading(true);
    try {
      const res = await api.getJson<ContactResponse>(`/api/contacts/${contactId}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      setValues(contactToFormValues(res.contact));
    } catch (e) {
      Alert.alert('Contact', formatError(e), [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [isEdit, contactId, token, locationId, navigation]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  function patch(next: Partial<ContactFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  async function save() {
    if (!token || !locationId) return;
    const validationError = validateContactForm(values, { requireFirstName: !isEdit });
    if (validationError) {
      Alert.alert(isEdit ? 'Save contact' : 'New contact', validationError);
      return;
    }

    const payload = formValuesToPayload(values);
    setSaving(true);
    try {
      if (isEdit && contactId) {
        const res = await api.putJson<ContactResponse>(`/api/contacts/${contactId}`, payload, {
          headers: withAuthHeaders({ token, locationId }),
        });
        navigation.replace('ContactDetail', { contactId: res.contact.id });
      } else {
        const res = await api.postJson<ContactResponse>('/api/contacts', payload, {
          headers: withAuthHeaders({ token, locationId }),
        });
        navigation.replace('ContactDetail', { contactId: res.contact.id });
      }
    } catch (e) {
      Alert.alert(isEdit ? 'Save failed' : 'Create failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={isEdit ? 'Edit Contact' : 'New Contact'}
        onBack={() => navigation.goBack()}
        rightLabel={isEdit ? undefined : 'Scan'}
        onRightPress={isEdit ? undefined : () => navigation.navigate('ScanBusinessCard')}
      />

      {loading ? (
        <ActivityIndicator color={theme.colors.link} style={styles.loader} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: scrollBottom + 88 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <FormFieldLabel label="First name" required={!isEdit} />
              <TextField
                value={values.firstName}
                onChangeText={(t) => patch({ firstName: t })}
                placeholder="First name"
                autoCapitalize="words"
              />
            </View>

            <TextField
              label="Last name"
              value={values.lastName}
              onChangeText={(t) => patch({ lastName: t })}
              placeholder="Last name"
              autoCapitalize="words"
            />

            <View>
              <FormFieldLabel label="Email" primary />
              <TextField
                value={values.email}
                onChangeText={(t) => patch({ email: t })}
                placeholder="abc@xyz.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

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

            <FormPickerField
              label="Contact type"
              value={values.contactType}
              onPress={() => setContactTypeOpen(true)}
            />

            <FormPickerField
              label="Time zone"
              value={timezoneLabel(values.timezone)}
              onPress={() => setTimezoneOpen(true)}
            />

            <TextField
              label="Company"
              value={values.companyName}
              onChangeText={(t) => patch({ companyName: t })}
              placeholder="Company name"
              autoCapitalize="words"
            />

            <ContactFormDndSection values={values} onChange={patch} />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: scrollBottom }]}>
            <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
              <Ionicons name="save-outline" size={18} color={theme.colors.white} />
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Contact'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

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
      <OptionPickerSheet
        visible={contactTypeOpen}
        title="Contact type"
        options={CONTACT_TYPES}
        selected={values.contactType}
        onClose={() => setContactTypeOpen(false)}
        onSelect={(contactType) => patch({ contactType })}
      />
      <TimezonePickerSheet
        visible={timezoneOpen}
        selectedId={values.timezone}
        onClose={() => setTimezoneOpen(false)}
        onSelect={(timezone) => patch({ timezone })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  body: { padding: theme.spacing.xl, gap: theme.spacing.lg },
  loader: { marginTop: theme.spacing['2xl'] },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: theme.spacing.lg,
  },
  saveText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
