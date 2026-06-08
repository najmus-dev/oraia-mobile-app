import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { type PickedContact } from '../lib/contacts';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import {
  type OpportunityResponse,
  type PipelinesResponse,
  type Pipeline,
  OPPORTUNITY_STATUS_OPTIONS,
  defaultStageIdForPipeline,
  emptyOpportunityFormValues,
  formValuesToOpportunityPayload,
  stagesForPipeline,
  validateOpportunityForm,
} from '../lib/opportunities';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { BottomSheet } from '../components/BottomSheet';
import { FormPickerField } from '../components/FormPickerField';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'OpportunityForm'>;

type PickerKind = 'pipeline' | 'stage' | 'status' | 'contact' | null;

export function OpportunityFormScreen({ navigation, route }: Props) {
  const scrollBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const initialPipelineId = route.params?.pipelineId ?? '';
  const initialStageId = route.params?.pipelineStageId ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pickedContact, setPickedContact] = useState<PickedContact | null>(
    route.params?.pickedContact ?? null,
  );
  const [picker, setPicker] = useState<PickerKind>(null);
  const [ownerDisplayName, setOwnerDisplayName] = useState(
    route.params?.pickedAssignee?.name ?? '',
  );
  const [values, setValues] = useState(() =>
    emptyOpportunityFormValues({
      pipelineId: initialPipelineId,
      pipelineStageId: initialStageId,
      contactId: route.params?.pickedContact?.id ?? '',
      name: route.params?.pickedContact?.name ?? '',
    }),
  );

  useEffect(() => {
    const incoming = route.params?.pickedContact;
    if (!incoming) return;
    setPickedContact(incoming);
    setValues((prev) => ({
      ...prev,
      contactId: incoming.id,
      name: prev.name.trim() ? prev.name : incoming.name,
    }));
    navigation.setParams({ pickedContact: undefined });
  }, [route.params?.pickedContact, navigation]);

  useEffect(() => {
    const picked = route.params?.pickedAssignee;
    if (!picked) return;
    setOwnerDisplayName(picked.name);
    setValues((prev) => ({ ...prev, assignedTo: picked.id }));
    navigation.setParams({ pickedAssignee: undefined });
  }, [route.params?.pickedAssignee, navigation]);

  const loadPipelines = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const res = await api.getJson<PipelinesResponse>('/api/opportunities/pipelines', {
        headers: withAuthHeaders({ token, locationId }),
      });
      const list = res.pipelines ?? [];
      setPipelines(list);

      setValues((prev) => {
        const pipelineId = prev.pipelineId || initialPipelineId || list[0]?.id || '';
        const pipelineStageId =
          prev.pipelineStageId ||
          initialStageId ||
          defaultStageIdForPipeline(list, pipelineId);
        return { ...prev, pipelineId, pipelineStageId };
      });
    } catch (e) {
      Alert.alert('Pipelines', formatError(e), [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [token, locationId, navigation, initialPipelineId, initialStageId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (!pickedContact && !loading) {
      navigation.replace('PickContact', {
        flow: 'opportunity',
        pipelineId: initialPipelineId || undefined,
        pipelineStageId: initialStageId || undefined,
      });
    }
  }, [pickedContact, loading, navigation, initialPipelineId, initialStageId]);

  const stages = useMemo(
    () => stagesForPipeline(pipelines, values.pipelineId),
    [pipelines, values.pipelineId],
  );

  const pipelineLabel = pipelines.find((p) => p.id === values.pipelineId)?.name ?? '';
  const stageLabel = stages.find((s) => s.id === values.pipelineStageId)?.name ?? '';
  const statusLabel =
    OPPORTUNITY_STATUS_OPTIONS.find((s) => s.id === values.status)?.label ?? 'Open';
  const ownerLabel = values.assignedTo
    ? ownerDisplayName.trim() || 'Assigned'
    : '';

  function openOwnerPicker() {
    navigation.navigate('SelectAssignees', {
      mode: 'single',
      selectedIds: values.assignedTo ? [values.assignedTo] : [],
      returnTo: 'OpportunityForm',
    });
  }

  function setField<K extends keyof typeof values>(key: K, next: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  function onPipelineChange(pipelineId: string) {
    setValues((prev) => ({
      ...prev,
      pipelineId,
      pipelineStageId: defaultStageIdForPipeline(pipelines, pipelineId),
    }));
  }

  async function save() {
    if (!token || !locationId) return;
    const validationError = validateOpportunityForm(values);
    if (validationError) {
      Alert.alert('Add Opportunity', validationError);
      return;
    }

    setSaving(true);
    try {
      const res = await api.postJson<OpportunityResponse>(
        '/api/opportunities',
        formValuesToOpportunityPayload(values),
        { headers: withAuthHeaders({ token, locationId }) },
      );
      const opportunityId = res.opportunity?.id;
      if (!opportunityId) {
        Alert.alert('Created', 'Opportunity saved, but could not open detail (missing id).');
        navigation.navigate('PipelineHome');
        return;
      }
      navigation.replace('OpportunityDetail', {
        opportunityId,
        title: values.name.trim(),
      });
    } catch (e) {
      Alert.alert('Create failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!pickedContact && !loading) return null;

  return (
    <View style={styles.container}>
      <AppBar
        title="Add Opportunity"
        onBack={() => navigation.goBack()}
        rightLabel="Save"
        onRightPress={save}
        rightDisabled={saving || loading || !values.pipelineStageId}
        rightLoading={saving}
      />

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : pipelines.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No pipelines configured</Text>
          <Text style={styles.emptySub}>Set up a pipeline in GHL, then try again.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>Opportunity Details</Text>

            <FormPickerField
              label="Contact"
              value={pickedContact?.name ?? ''}
              placeholder="Select contact"
              onPress={() =>
                navigation.navigate('PickContact', {
                  flow: 'opportunity',
                  pipelineId: values.pipelineId,
                  pipelineStageId: values.pipelineStageId,
                })
              }
            />

            <Field label="Opportunity Name">
              <TextInput
                value={values.name}
                onChangeText={(t) => setField('name', t)}
                placeholder="Enter opportunity name"
                placeholderTextColor={theme.colors.mutedTextOnDark}
                style={styles.input}
                autoCapitalize="words"
              />
            </Field>

            <FormPickerField
              label="Pipeline"
              value={pipelineLabel}
              onPress={() => setPicker('pipeline')}
            />

            <FormPickerField
              label="Stage"
              value={stageLabel}
              placeholder={stages.length ? 'Select stage' : 'No stages'}
              onPress={() => stages.length && setPicker('stage')}
            />

            <FormPickerField
              label="Status"
              value={statusLabel}
              onPress={() => setPicker('status')}
            />

            <FormPickerField
              label="Owner"
              value={ownerLabel}
              placeholder="Unassigned"
              onPress={openOwnerPicker}
            />

            <FormPickerField
              label="Followers"
              value=""
              placeholder="Add Followers"
              onPress={() =>
                Alert.alert('Followers', 'Followers are managed in GHL web for now.')
              }
            />

            <Field label="Value">
              <View style={styles.moneyRow}>
                <Text style={styles.moneyPrefix}>$</Text>
                <TextInput
                  value={values.monetaryValue}
                  onChangeText={(t) => setField('monetaryValue', t)}
                  placeholder="Enter value"
                  placeholderTextColor={theme.colors.mutedTextOnDark}
                  style={[styles.input, styles.moneyInput]}
                  keyboardType="numeric"
                />
              </View>
            </Field>

            <Field label="Source">
              <TextInput
                value={values.source}
                onChangeText={(t) => setField('source', t)}
                placeholder="Add source"
                placeholderTextColor={theme.colors.mutedTextOnDark}
                style={styles.input}
              />
            </Field>

            <Field label="Business Name">
              <TextInput
                value={values.businessName}
                onChangeText={(t) => setField('businessName', t)}
                placeholder="Business name"
                placeholderTextColor={theme.colors.mutedTextOnDark}
                style={styles.input}
                autoCapitalize="words"
              />
            </Field>

            <FormPickerField
              label="Tags"
              value=""
              placeholder="Add tags"
              onPress={() => Alert.alert('Tags', 'Tags are managed in GHL web for now.')}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <BottomSheet visible={picker === 'pipeline'} onClose={() => setPicker(null)} title="Pipeline">
        {pipelines.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.sheetRow, p.id === values.pipelineId && styles.sheetRowActive]}
            onPress={() => {
              onPipelineChange(p.id);
              setPicker(null);
            }}
          >
            <Text style={styles.sheetRowText}>{p.name}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={picker === 'stage'} onClose={() => setPicker(null)} title="Stage">
        {stages.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.sheetRow, s.id === values.pipelineStageId && styles.sheetRowActive]}
            onPress={() => {
              setField('pipelineStageId', s.id);
              setPicker(null);
            }}
          >
            <Text style={styles.sheetRowText}>{s.name}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={picker === 'status'} onClose={() => setPicker(null)} title="Status">
        {OPPORTUNITY_STATUS_OPTIONS.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.sheetRow, s.id === values.status && styles.sheetRowActive]}
            onPress={() => {
              setField('status', s.id);
              setPicker(null);
            }}
          >
            <Text style={styles.sheetRowText}>{s.label}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  loadingText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
  },
  body: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
    marginBottom: theme.spacing.xs,
  },
  field: { gap: 6 },
  fieldLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textOnDark,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
  },
  moneyRow: { flexDirection: 'row', alignItems: 'center' },
  moneyPrefix: {
    position: 'absolute',
    left: theme.spacing.lg,
    zIndex: 1,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  moneyInput: { flex: 1, paddingLeft: theme.spacing.xl + 8 },
  emptyTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
  },
  sheetRow: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sheetRowActive: { backgroundColor: 'rgba(96, 165, 250, 0.08)' },
  sheetRowText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
});
