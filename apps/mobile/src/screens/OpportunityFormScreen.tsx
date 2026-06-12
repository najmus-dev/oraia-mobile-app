import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { type ContactResponse, type PickedContact, contactToPicked } from '../lib/contacts';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import {
  type Opportunity,
  type OpportunityResponse,
  type PipelinesResponse,
  type Pipeline,
  OPPORTUNITY_STATUS_OPTIONS,
  defaultStageIdForPipeline,
  formatFollowerLabel,
  formValuesToOpportunityPayload,
  opportunityToFormValues,
  stagesForPipeline,
  validateOpportunityForm,
} from '../lib/opportunities';
import {
  applyPickedAssignee,
  applyPickedContact,
  applyPickedFollowers,
  clearOpportunityFormDraft,
  hasOpportunityContact,
  type OpportunityFormDraft,
  opportunityFormOwnerKey,
  readOpportunityFormDraft,
  resolveOpportunityFormDraft,
  writeOpportunityFormDraft,
} from '../lib/opportunityFormDraft';
import { ContactTagsField } from '../components/contacts/ContactTagsField';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { finishWizardFlow } from '../lib/stackNavigation';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { BottomSheet } from '../components/BottomSheet';
import { FormPickerField } from '../components/FormPickerField';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'OpportunityForm'>;

type PickerKind = 'pipeline' | 'stage' | 'status' | 'contact' | null;

export function OpportunityFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const scrollBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const opportunityId = route.params?.opportunityId;
  const isEdit = Boolean(opportunityId);
  const ownerKey = opportunityFormOwnerKey({ opportunityId });
  const initialPipelineId = route.params?.pipelineId ?? '';
  const initialStageId = route.params?.pipelineStageId ?? '';
  const contactGatePassed = useRef(false);
  const pipelinesLoaded = useRef(false);
  const savedFollowerIds = useRef<string[]>([]);
  const savedContactTags = useRef<string[]>([]);
  const savedBusinessName = useRef('');

  const initialDraft = useMemo(
    () =>
      resolveOpportunityFormDraft({
        ownerKey,
        pipelineId: initialPipelineId,
        pipelineStageId: initialStageId,
        pickedContact: route.params?.pickedContact ?? null,
        pickedAssignee: route.params?.pickedAssignee ?? null,
        pickedFollowerIds: route.params?.pickedFollowerIds ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per mount
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pickedContact, setPickedContact] = useState<PickedContact | null>(
    initialDraft.pickedContact,
  );
  const [picker, setPicker] = useState<PickerKind>(null);
  const [ownerDisplayName, setOwnerDisplayName] = useState(initialDraft.ownerName);
  const [followerNames, setFollowerNames] = useState(initialDraft.followerNames);
  const [values, setValues] = useState(initialDraft.values);

  const draftRef = useRef<OpportunityFormDraft>(initialDraft);
  draftRef.current = { values, pickedContact, ownerName: ownerDisplayName, followerNames };

  const commitDraft = useCallback(
    (next: OpportunityFormDraft) => {
      draftRef.current = next;
      setValues(next.values);
      setPickedContact(next.pickedContact);
      setOwnerDisplayName(next.ownerName);
      setFollowerNames(next.followerNames);
      writeOpportunityFormDraft(ownerKey, next);
    },
    [ownerKey],
  );

  const syncDraft = useCallback(() => {
    writeOpportunityFormDraft(ownerKey, draftRef.current);
  }, [ownerKey]);

  useEffect(() => {
    draftRef.current = { values, pickedContact, ownerName: ownerDisplayName, followerNames };
    writeOpportunityFormDraft(ownerKey, draftRef.current);
  }, [ownerKey, values, pickedContact, ownerDisplayName, followerNames]);

  useFocusEffect(
    useCallback(() => {
      if (
        route.params?.pickedContact ||
        route.params?.pickedAssignee ||
        route.params?.pickedFollowerIds
      ) {
        return;
      }
      const stored = readOpportunityFormDraft(ownerKey);
      if (!stored) return;
      commitDraft(stored);
    }, [
      ownerKey,
      commitDraft,
      route.params?.pickedContact,
      route.params?.pickedAssignee,
      route.params?.pickedFollowerIds,
    ]),
  );

  useEffect(() => {
    const incoming = route.params?.pickedContact;
    if (!incoming) return;
    contactGatePassed.current = true;
    const next = applyPickedContact(draftRef.current, incoming);
    commitDraft(next);
    navigation.setParams({ pickedContact: undefined });
    if (!token || !locationId) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        const contactRes = await api.getJson<ContactResponse>(
          `/api/contacts/${incoming.id}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        const contactTags = contactRes.contact.tags ?? [];
        const businessName = contactRes.contact.companyName?.trim() ?? '';
        savedContactTags.current = contactTags;
        savedBusinessName.current = businessName;
        setValues((prev) => ({
          ...prev,
          contactTags,
          businessName: businessName || prev.businessName,
        }));
      } catch {
        savedContactTags.current = [];
      }
    })();
  }, [route.params?.pickedContact, navigation, commitDraft, token, locationId]);

  useEffect(() => {
    const picked = route.params?.pickedAssignee;
    if (!picked) return;
    contactGatePassed.current = true;
    commitDraft(applyPickedAssignee(draftRef.current, picked));
    navigation.setParams({ pickedAssignee: undefined });
  }, [route.params?.pickedAssignee, navigation, commitDraft]);

  useEffect(() => {
    const ids = route.params?.pickedFollowerIds;
    if (!ids) return;
    contactGatePassed.current = true;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      let namesById: Record<string, string> | undefined;
      if (token && locationId && ids.length) {
        try {
          const assignees = await api.getJson<{ users: { id: string; name: string }[] }>(
            '/api/tasks/assignees',
            { headers: withAuthHeaders({ token, locationId }) },
          );
          namesById = Object.fromEntries(
            (assignees.users ?? []).map((u) => [u.id, u.name]),
          );
        } catch {
          namesById = undefined;
        }
      }
      commitDraft(applyPickedFollowers(draftRef.current, ids, namesById));
      navigation.setParams({ pickedFollowerIds: undefined });
    })();
  }, [route.params?.pickedFollowerIds, navigation, commitDraft, token, locationId]);

  const loadPipelines = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const pipeRes = await api.getJson<PipelinesResponse>('/api/opportunities/pipelines', {
        headers: withAuthHeaders({ token, locationId }),
      });
      const list = pipeRes.pipelines ?? [];
      setPipelines(list);

      if (isEdit && opportunityId) {
        const oppRes = await api.getJson<{ opportunity: Opportunity }>(
          `/api/opportunities/${opportunityId}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        const opp = oppRes.opportunity;
        const formValues = opportunityToFormValues(opp);
        const followerIds = opp.followerIds ?? [];
        savedFollowerIds.current = followerIds;
        let contactTags: string[] = [];
        let businessName = formValues.businessName;
        if (opp.contactId?.trim()) {
          try {
            const contactRes = await api.getJson<ContactResponse>(
              `/api/contacts/${opp.contactId.trim()}`,
              { headers: withAuthHeaders({ token, locationId }) },
            );
            setPickedContact(contactToPicked(contactRes.contact));
            contactTags = contactRes.contact.tags ?? [];
            businessName = contactRes.contact.companyName?.trim() || formValues.businessName;
          } catch {
            setPickedContact({ id: opp.contactId.trim(), name: 'Contact' });
          }
        }
        savedContactTags.current = contactTags;
        savedBusinessName.current = businessName;
        setValues({ ...formValues, contactTags, followerIds, businessName });
        let namesById: Record<string, string> = {};
        try {
          const assignees = await api.getJson<{ users: { id: string; name: string }[] }>(
            '/api/tasks/assignees',
            { headers: withAuthHeaders({ token, locationId }) },
          );
          namesById = Object.fromEntries((assignees.users ?? []).map((u) => [u.id, u.name]));
        } catch {
          namesById = {};
        }
        if (opp.assignedTo?.trim()) {
          setOwnerDisplayName(namesById[opp.assignedTo] ?? '');
        }
        if (followerIds.length) {
          setFollowerNames(followerIds.map((id) => namesById[id] ?? 'Follower'));
        }
      } else if (!pipelinesLoaded.current) {
        setValues((prev) => {
          const pipelineId = prev.pipelineId || initialPipelineId || list[0]?.id || '';
          const pipelineStageId =
            prev.pipelineStageId ||
            initialStageId ||
            defaultStageIdForPipeline(list, pipelineId);
          return { ...prev, pipelineId, pipelineStageId };
        });
        pipelinesLoaded.current = true;
      }
    } catch (e) {
      Alert.alert(isEdit ? 'Opportunity' : 'Pipelines', formatError(e), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [token, locationId, navigation, initialPipelineId, initialStageId, isEdit, opportunityId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadPipelines();
  }, [loadPipelines]);

  const hasContact = hasOpportunityContact({ pickedContact, values });

  useEffect(() => {
    if (isEdit || loading || contactGatePassed.current) return;
    if (hasContact) {
      contactGatePassed.current = true;
      return;
    }
    contactGatePassed.current = true;
    navigation.replace('PickContact', {
      flow: 'opportunity',
      pipelineId: initialPipelineId || undefined,
      pipelineStageId: initialStageId || undefined,
    });
  }, [hasContact, loading, navigation, initialPipelineId, initialStageId, isEdit]);

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
    syncDraft();
    navigation.navigate('SelectAssignees', {
      mode: 'single',
      selectedIds: values.assignedTo ? [values.assignedTo] : [],
      returnTo: 'OpportunityForm',
    });
  }

  function openFollowersPicker() {
    syncDraft();
    navigation.navigate('SelectAssignees', {
      mode: 'multi',
      selectedIds: values.followerIds,
      returnTo: 'OpportunityForm',
    });
  }

  const followerLabel = formatFollowerLabel(values.followerIds, followerNames);

  function showSyncWarnings(warnings?: { field: string; message: string }[]) {
    if (!warnings?.length) return;
    Alert.alert(
      'Saved with warnings',
      warnings.map((w) => w.message).join('\n'),
    );
  }

  function openContactPicker() {
    syncDraft();
    navigation.navigate('PickContact', {
      flow: 'opportunity',
      pipelineId: values.pipelineId,
      pipelineStageId: values.pipelineStageId,
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
      const payload = formValuesToOpportunityPayload(values, {
        previousContactTags: savedContactTags.current,
        previousFollowerIds: savedFollowerIds.current,
        previousBusinessName: savedBusinessName.current,
      });
      const headers = withAuthHeaders({ token, locationId });
      type WriteResponse = OpportunityResponse & {
        warnings?: { field: string; message: string }[];
      };
      if (isEdit && opportunityId) {
        const res = await api.putJson<WriteResponse>(
          `/api/opportunities/${opportunityId}`,
          payload,
          { headers },
        );
        savedFollowerIds.current = [...values.followerIds];
        savedContactTags.current = [...values.contactTags];
        savedBusinessName.current = values.businessName.trim();
        showSyncWarnings(res.warnings);
        finishWizardFlow(navigation, {
          name: 'OpportunityDetail',
          params: { opportunityId, title: values.name.trim() },
        });
        clearOpportunityFormDraft(ownerKey);
        return;
      }
      const res = await api.postJson<WriteResponse>('/api/opportunities', payload, { headers });
      const createdId = res.opportunity?.id;
      if (!createdId) {
        Alert.alert('Created', 'Opportunity saved, but could not open detail (missing id).');
        clearOpportunityFormDraft(ownerKey);
        navigation.navigate('PipelineHome');
        return;
      }
      savedFollowerIds.current = [...values.followerIds];
      savedContactTags.current = [...values.contactTags];
      savedBusinessName.current = values.businessName.trim();
      showSyncWarnings(res.warnings);
      clearOpportunityFormDraft(ownerKey);
      finishWizardFlow(navigation, {
        name: 'OpportunityDetail',
        params: { opportunityId: createdId, title: values.name.trim() },
      });
    } catch (e) {
      Alert.alert(isEdit ? 'Save failed' : 'Create failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!isEdit && !hasContact && !loading) {
    return (
      <View style={styles.container}>
        <AppBar title="Add Opportunity" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Select a contact to continue.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={isEdit ? 'Edit Opportunity' : 'Add Opportunity'}
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
              onPress={openContactPicker}
            />

            <Field label="Opportunity Name">
              <TextInput
                value={values.name}
                onChangeText={(t) => setField('name', t)}
                placeholder="Enter opportunity name"
                placeholderTextColor={theme.colors.inputPlaceholder}
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
              value={followerLabel}
              placeholder="Add followers"
              onPress={openFollowersPicker}
            />

            <Field label="Value">
              <View style={styles.moneyRow}>
                <Text style={styles.moneyPrefix}>$</Text>
                <TextInput
                  value={values.monetaryValue}
                  onChangeText={(t) => setField('monetaryValue', t)}
                  placeholder="Enter value"
                  placeholderTextColor={theme.colors.inputPlaceholder}
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
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={styles.input}
              />
            </Field>

            <Field label="Business Name">
              <TextInput
                value={values.businessName}
                onChangeText={(t) => setField('businessName', t)}
                placeholder="Business name"
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={styles.input}
                autoCapitalize="words"
              />
            </Field>

            <ContactTagsField
              token={token}
              locationId={locationId}
              label="Contact tags"
              hint="Tags apply to the linked contact in GHL."
              selected={values.contactTags}
              onChange={(contactTags) => setField('contactTags', contactTags)}
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
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  loadingText: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },
  body: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
    marginBottom: theme.spacing.xs,
  },
  field: { gap: 6 },
  fieldLabel: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
  },
  moneyRow: { flexDirection: 'row', alignItems: 'center' },
  moneyPrefix: {
    position: 'absolute',
    left: theme.spacing.lg,
    zIndex: 1,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  moneyInput: { flex: 1, paddingLeft: theme.spacing.xl + 8 },
  emptyTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
  },
  sheetRow: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sheetRowActive: { backgroundColor: `${theme.colors.primary}14` },
  sheetRowText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
});
}
