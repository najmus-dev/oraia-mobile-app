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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { type PickedContact } from '../lib/contacts';
import { formatError } from '../lib/errors';
import { openAndroidDueDatePicker, isIosDueDatePicker } from '../lib/pickDueDate';
import {
  clearTaskFormDraft,
  readTaskFormDraft,
  resetCreateTaskFormDraft,
  taskFormOwnerKey,
  writeTaskFormDraft,
  type TaskFormDraft,
} from '../lib/taskFormDraft';
import { useFullScreenBottomInset } from '../lib/safeArea';
import {
  type TaskAssignee,
  type TaskResponse,
  type AssigneesResponse,
  type TaskFormValues,
  emptyTaskFormValues,
  formValuesToTaskPayload,
  taskToFormValues,
  validateTaskForm,
} from '../lib/tasks';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { finishWizardFlow } from '../lib/stackNavigation';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { FormPickerField } from '../components/FormPickerField';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'TaskForm'>;

function formatDueDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function resolveInitialDraft(params: Props['route']['params'], ownerKey: string): TaskFormDraft {
  if (params?.fresh) {
    resetCreateTaskFormDraft();
  }

  const stored = readTaskFormDraft(ownerKey);
  if (stored) return stored;

  if (params?.initialTask) {
    const task = params.initialTask;
    return {
      values: taskToFormValues(task),
      pickedContact: task.contactId
        ? { id: task.contactId, name: task.contactName ?? 'Contact' }
        : null,
      assigneeName: task.assigneeName ?? '',
    };
  }

  const pickedContact = params?.pickedContact ?? null;
  return {
    values: {
      ...emptyTaskFormValues(),
      contactId: pickedContact?.id ?? '',
    },
    pickedContact,
    assigneeName: params?.pickedAssignee?.name ?? '',
  };
}

export function TaskFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const scrollBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const isEdit = Boolean(route.params?.taskId && route.params?.contactId);
  const ownerKey = taskFormOwnerKey(route.params ?? {});
  const initialDraft = useMemo(
    () => resolveInitialDraft(route.params, ownerKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed state once per mount
    [],
  );

  const [saving, setSaving] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [values, setValues] = useState<TaskFormValues>(initialDraft.values);
  const [pickedContact, setPickedContact] = useState<PickedContact | null>(initialDraft.pickedContact);
  const [assigneeDisplayName, setAssigneeDisplayName] = useState(initialDraft.assigneeName);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const appliedFreshRef = useRef(Boolean(route.params?.fresh));

  useEffect(() => {
    if (route.params?.fresh && !appliedFreshRef.current) {
      appliedFreshRef.current = true;
      navigation.setParams({ fresh: undefined });
    }
  }, [route.params?.fresh, navigation]);

  const persistDraft = useCallback(
    (patch?: Partial<TaskFormDraft>) => {
      writeTaskFormDraft(ownerKey, {
        values: patch?.values ?? values,
        pickedContact: patch?.pickedContact !== undefined ? patch.pickedContact : pickedContact,
        assigneeName: patch?.assigneeName ?? assigneeDisplayName,
      });
    },
    [ownerKey, values, pickedContact, assigneeDisplayName],
  );

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.fresh) return;
      const stored = readTaskFormDraft(ownerKey);
      if (!stored) return;
      setValues(stored.values);
      setPickedContact(stored.pickedContact);
      setAssigneeDisplayName(stored.assigneeName);
    }, [ownerKey, route.params?.fresh]),
  );

  const dueDateValue = useMemo(() => {
    const d = new Date(values.dueDate);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [values.dueDate]);

  function openDueDatePicker() {
    persistDraft();
    if (isIosDueDatePicker()) {
      setShowDatePicker(true);
      return;
    }
    openAndroidDueDatePicker(dueDateValue, (date) => {
      setValues((prev) => ({ ...prev, dueDate: date.toISOString() }));
    });
  }

  function onIosDueDateChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (event.type === 'set' && date) {
      setValues((prev) => ({ ...prev, dueDate: date.toISOString() }));
    }
  }

  useEffect(() => {
    const incoming = route.params?.pickedContact;
    if (!incoming) return;
    setPickedContact(incoming);
    setValues((prev) => ({ ...prev, contactId: incoming.id }));
    navigation.setParams({ pickedContact: undefined });
  }, [route.params?.pickedContact, navigation]);

  useEffect(() => {
    const picked = route.params?.pickedAssignee;
    if (!picked) return;
    setAssigneeDisplayName(picked.name);
    setValues((prev) => ({ ...prev, assignedTo: picked.id }));
    navigation.setParams({ pickedAssignee: undefined });
  }, [route.params?.pickedAssignee, navigation]);

  const loadAssignees = useCallback(async () => {
    if (!token || !locationId) return;
    try {
      const res = await api.getJson<AssigneesResponse>('/api/tasks/assignees', {
        headers: withAuthHeaders({ token, locationId }),
      });
      setAssignees(res.users ?? []);
    } catch {
      setAssignees([]);
    }
  }, [token, locationId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadAssignees();
  }, [loadAssignees]);

  const assigneeLabel = useMemo(() => {
    if (!values.assignedTo) return '';
    const fromList = assignees.find((u) => u.id === values.assignedTo)?.name;
    if (fromList) return fromList;
    if (assigneeDisplayName) return assigneeDisplayName;
    if (route.params?.initialTask?.assignedTo === values.assignedTo) {
      return route.params.initialTask.assigneeName ?? 'Assignee';
    }
    return 'Assignee';
  }, [assignees, values.assignedTo, assigneeDisplayName, route.params?.initialTask]);

  function openAssigneePicker() {
    persistDraft();
    navigation.navigate('SelectAssignees', {
      mode: 'single',
      selectedIds: values.assignedTo ? [values.assignedTo] : [],
      returnTo: 'TaskForm',
    });
  }

  function openContactPicker() {
    persistDraft();
    navigation.navigate('PickContact', {
      flow: 'task',
    });
  }

  async function save() {
    if (!token || !locationId) return;
    const contactId = pickedContact?.id || values.contactId;
    const error = validateTaskForm({ ...values, contactId }, !isEdit);
    if (error) {
      Alert.alert(isEdit ? 'Edit task' : 'Add new task', error);
      return;
    }
    if (!contactId) {
      Alert.alert('Add new task', 'Select a contact for this task.');
      return;
    }

    const payload = formValuesToTaskPayload({ ...values, contactId });
    setSaving(true);
    try {
      if (isEdit && route.params?.taskId && route.params?.contactId) {
        await api.putJson<TaskResponse>(
          `/api/tasks/contacts/${route.params.contactId}/${route.params.taskId}`,
          payload,
          { headers: withAuthHeaders({ token, locationId }) },
        );
      } else {
        await api.postJson<TaskResponse>(`/api/tasks/contacts/${contactId}`, payload, {
          headers: withAuthHeaders({ token, locationId }),
        });
      }
      clearTaskFormDraft(ownerKey);
      finishWizardFlow(navigation, { name: 'TasksHome' });
    } catch (e) {
      Alert.alert(isEdit ? 'Edit task' : 'Add new task', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={isEdit ? 'Edit task' : 'Add new task'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Title*</Text>
            <TextInput
              value={values.title}
              onChangeText={(title) => setValues((prev) => ({ ...prev, title }))}
              style={styles.input}
              placeholder="Task title"
              placeholderTextColor={theme.colors.inputPlaceholder}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={values.body}
              onChangeText={(body) => setValues((prev) => ({ ...prev, body }))}
              style={[styles.input, styles.textArea]}
              placeholder="Optional details"
              placeholderTextColor={theme.colors.inputPlaceholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          <FormPickerField
            label="Assignee"
            value={assigneeLabel}
            placeholder="Unassigned"
            icon="person-outline"
            onPress={openAssigneePicker}
          />

          <FormPickerField
            label="Contact"
            value={pickedContact?.name ?? ''}
            placeholder="Select contact"
            icon="people-outline"
            disabled={isEdit}
            onPress={openContactPicker}
          />

          <Pressable style={styles.field} onPress={openDueDatePicker}>
            <Text style={styles.label}>Due Date*</Text>
            <View style={styles.input}>
              <Text style={styles.dueValue}>{formatDueDateLabel(values.dueDate)}</Text>
            </View>
          </Pressable>

          {isIosDueDatePicker() && showDatePicker ? (
            <DateTimePicker
              value={dueDateValue}
              mode="datetime"
              display="spinner"
              onChange={onIosDueDateChange}
            />
          ) : null}
          {isIosDueDatePicker() && showDatePicker ? (
            <Pressable style={styles.doneDateBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneDateText}>Done</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  body: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  field: { gap: 8 },
  label: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 120,
    paddingTop: theme.spacing.md,
  },
  dueValue: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
  },
  doneDateBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
  },
  doneDateText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  cancelText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  saveBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 12,
    backgroundColor: theme.colors.link,
  },
  saveText: {
    color: theme.colors.navy,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
}
