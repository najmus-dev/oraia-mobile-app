import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api, withAuthHeaders } from '../lib/api';
import {
  type Contact,
  type ContactResponse,
  type ContactTasksResponse,
  contactAddressLine,
  contactDisplayName,
} from '../lib/contacts';
import {
  type ContactNotesResponse,
  type CreateNoteResponse,
  formatNoteWhen,
} from '../lib/contactNotes';
import { lookupConversationForContact } from '../lib/conversationsApi';
import {
  navigateToContactMessage,
  navigateToScheduleForContact,
} from '../lib/navigation';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { Button } from '../components/Button';
import { ListBusyState } from '../components/ListBusyState';
import { ContactAvatar } from '../components/contacts/ContactAvatar';
import { ContactQuickActions } from '../components/contacts/ContactQuickActions';
import { ContactTabBar, type ContactTab } from '../components/contacts/ContactTabBar';
import { TaskRow } from '../components/tasks/TaskRow';
import type { Task } from '../lib/tasks';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'ContactDetail'>;

function AccordionSection({ title }: { title: string }) {
  return (
    <Pressable style={styles.accordion}>
      <Text style={styles.accordionTitle}>{title}</Text>
      <Ionicons name="chevron-down" size={18} color={theme.colors.mutedTextOnDark} />
    </Pressable>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function ContactDetailScreen({ navigation, route }: Props) {
  const { contactId } = route.params;
  const scrollBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<ContactTab>('details');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notes, setNotes] = useState<ContactNotesResponse['notes']>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasks, setTasks] = useState<ContactTasksResponse['tasks']>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const res = await api.getJson<ContactResponse>(`/api/contacts/${contactId}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      setContact(res.contact);
    } catch (e) {
      Alert.alert('Contact', formatError(e));
    } finally {
      setLoading(false);
    }
  }, [token, locationId, contactId]);

  const loadNotes = useCallback(async () => {
    if (!token || !locationId) return;
    setNotesLoading(true);
    try {
      const res = await api.getJson<ContactNotesResponse>(
        `/api/contacts/${contactId}/notes`,
        { headers: withAuthHeaders({ token, locationId }) },
      );
      setNotes(res.notes ?? []);
    } catch (e) {
      Alert.alert('Notes', formatError(e));
    } finally {
      setNotesLoading(false);
    }
  }, [token, locationId, contactId]);

  const loadTasks = useCallback(async () => {
    if (!token || !locationId) return;
    setTasksLoading(true);
    try {
      const res = await api.getJson<ContactTasksResponse>(
        `/api/contacts/${contactId}/tasks`,
        { headers: withAuthHeaders({ token, locationId }) },
      );
      setTasks(res.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [token, locationId, contactId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadNotes();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadTasks();
  }, [load, loadNotes, loadTasks]);

  const displayName = contact ? contactDisplayName(contact) : 'Contact';
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  const quickActions = useMemo(
    () => [
      {
        id: 'call',
        label: 'Call',
        icon: 'call-outline' as const,
        disabled: !contact?.phone?.trim(),
        onPress: () => {
          const phone = contact?.phone?.trim();
          if (!phone) {
            Alert.alert('Call', 'No phone number on file.');
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          Linking.openURL(`tel:${phone}`);
        },
      },
      {
        id: 'message',
        label: 'Message',
        icon: 'chatbubble-ellipses-outline' as const,
        disabled: !contact?.phone?.trim() && !contact?.email?.trim(),
        onPress: async () => {
          if (!contact || !token || !locationId) return;
          try {
            const conversation = await lookupConversationForContact({ token, locationId }, contact.id);
            navigateToContactMessage(navigation, {
              contactId: contact.id,
              contactName: displayName,
              contactPhone: contact.phone,
              contactEmail: contact.email,
              conversationId: conversation?.id,
            });
          } catch (e) {
            Alert.alert('Message', formatError(e));
          }
        },
      },
      {
        id: 'email',
        label: 'Email',
        icon: 'mail-outline' as const,
        disabled: !contact?.email?.trim(),
        onPress: () => {
          const addr = contact?.email?.trim();
          if (!addr) {
            Alert.alert('Email', 'No email on file.');
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          Linking.openURL(`mailto:${addr}`);
        },
      },
      {
        id: 'meeting',
        label: 'Meeting',
        icon: 'calendar-outline' as const,
        disabled: false,
        onPress: () => {
          if (!contact) return;
          navigateToScheduleForContact(navigation, {
            id: contact.id,
            name: displayName,
            phone: contact.phone,
            email: contact.email,
          });
        },
      },
    ],
    [contact, token, locationId, navigation, displayName],
  );

  function openTask(task: Task) {
    if (!task.contactId) {
      Alert.alert('Task', 'This task cannot be edited.');
      return;
    }
    navigation.navigate('TaskForm', {
      taskId: task.id,
      contactId: task.contactId,
      initialTask: task,
    });
  }

  function confirmDelete() {
    setMenuOpen(false);
    Alert.alert(
      'Delete contact',
      'This removes the contact from GHL. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteContact },
      ],
    );
  }

  async function deleteContact() {
    if (!token || !locationId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/contacts/${contactId}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      navigation.navigate('ContactsList');
    } catch (e) {
      Alert.alert('Delete failed', formatError(e));
    } finally {
      setDeleting(false);
    }
  }

  async function addNote() {
    const text = noteDraft.trim();
    if (!text || !token || !locationId || savingNote) return;
    setSavingNote(true);
    try {
      const res = await api.postJson<CreateNoteResponse>(
        `/api/contacts/${contactId}/notes`,
        { body: text },
        { headers: withAuthHeaders({ token, locationId }) },
      );
      setNoteDraft('');
      setNotes((prev) => [res.note, ...prev]);
    } catch (e) {
      Alert.alert('Note', formatError(e));
    } finally {
      setSavingNote(false);
    }
  }

  async function copyName() {
    if (!contact) return;
    await Clipboard.setStringAsync(displayName);
    Alert.alert('Copied', 'Contact name copied to clipboard.');
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={displayName}
        onBack={() => navigation.goBack()}
        rightLabel="⋯"
        onRightPress={() => setMenuOpen((v) => !v)}
      />

      {menuOpen ? (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={() => {
            setMenuOpen(false);
            navigation.navigate('ContactForm', { contactId });
          }}>
            <Text style={styles.menuText}>Edit contact</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={confirmDelete} disabled={deleting}>
            <Text style={[styles.menuText, styles.menuDanger]}>Delete contact</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: scrollBottom }}>
        {contact ? (
          <>
            <View style={styles.profile}>
              <View style={styles.tagRow}>
                <Pressable style={styles.tagPill}>
                  <Ionicons name="pricetag-outline" size={14} color={theme.colors.link} />
                  <Text style={styles.tagPillText}>Tags</Text>
                </Pressable>
                {contact.tags?.length ? (
                  <Text style={styles.tagSummary} numberOfLines={1}>
                    {contact.tags.join(', ')}
                  </Text>
                ) : null}
              </View>

              <View style={styles.avatarWrap}>
                <ContactAvatar contact={contact} size={96} />
                <Pressable style={styles.cameraBtn}>
                  <Ionicons name="camera-outline" size={16} color={theme.colors.link} />
                </Pressable>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Pressable onPress={copyName} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.colors.mutedTextOnDark} />
                </Pressable>
              </View>
              {contact.phone?.trim() ? (
                <Text style={styles.profileSub}>{contact.phone.trim()}</Text>
              ) : null}
              {contact.email?.trim() ? (
                <Text style={styles.profileSub}>{contact.email.trim()}</Text>
              ) : null}
            </View>

            <ContactQuickActions actions={quickActions} />

            <View style={styles.tabsWrap}>
              <ContactTabBar
                active={activeTab}
                onChange={setActiveTab}
                taskCount={pendingTasks}
              />
            </View>

            {activeTab === 'details' ? (
              <View style={styles.tabBody}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Hide Empty Fields</Text>
                  <Switch
                    value={hideEmpty}
                    onValueChange={setHideEmpty}
                    trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                  />
                </View>
                <AccordionSection title="Contact" />
                <View style={styles.sectionBody}>
                  <DetailField label="First name" value={contact.firstName} />
                  <DetailField label="Last name" value={contact.lastName} />
                  <DetailField label="Email" value={contact.email} />
                  <DetailField label="Phone" value={contact.phone} />
                  <DetailField label="Company" value={contact.companyName} />
                  <DetailField label="Type" value={contact.type} />
                  <DetailField label="Timezone" value={contact.timezone} />
                </View>
                <AccordionSection title="General info" />
                <View style={styles.sectionBody}>
                  <DetailField label="Website" value={contact.website} />
                  <DetailField label="Address" value={contactAddressLine(contact)} />
                </View>
                <AccordionSection title="DND" />
                <View style={styles.sectionBody}>
                  <DetailField label="DND all channels" value={contact.dnd ? 'Yes' : 'No'} />
                </View>
              </View>
            ) : null}

            {activeTab === 'tasks' ? (
              <View style={styles.tabBody}>
                {tasksLoading ? (
                  <ListBusyState message="Loading tasks…" />
                ) : tasks.length === 0 ? (
                  <Text style={styles.emptyTab}>No tasks linked to this contact.</Text>
                ) : (
                  tasks.map((task) => (
                    <TaskRow key={task.id} task={task} onPress={() => openTask(task)} />
                  ))
                )}
              </View>
            ) : null}

            {activeTab === 'notes' ? (
              <View style={styles.tabBody}>
                <TextInput
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="Add a note about this contact…"
                  placeholderTextColor={theme.colors.mutedTextOnDark}
                  style={styles.noteInput}
                  multiline
                  maxLength={4000}
                />
                <Button
                  title={savingNote ? 'Saving…' : 'Add note'}
                  onPress={addNote}
                  disabled={savingNote || !noteDraft.trim()}
                  style={styles.addNoteBtn}
                />
                {notesLoading ? (
                  <ListBusyState message="Loading notes…" />
                ) : notes.length === 0 ? (
                  <Text style={styles.emptyTab}>No notes yet.</Text>
                ) : (
                  notes.map((note) => (
                    <View key={note.id} style={styles.noteCard}>
                      {note.dateAdded ? (
                        <Text style={styles.noteMeta}>{formatNoteWhen(note.dateAdded)}</Text>
                      ) : null}
                      <Text style={styles.noteBody}>{note.body ?? '—'}</Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </>
        ) : !loading ? (
          <Text style={styles.emptyTab}>Contact not found.</Text>
        ) : (
          <ListBusyState message="Loading contact…" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  menu: {
    position: 'absolute',
    top: 88,
    right: theme.spacing.lg,
    zIndex: 30,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  menuText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  menuDanger: { color: theme.colors.danger },
  profile: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  tagRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagPillText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  tagSummary: {
    flex: 1,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  avatarWrap: { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  cameraBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  profileName: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
  },
  profileSub: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  tabsWrap: { marginTop: theme.spacing.lg },
  tabBody: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  toggleLabel: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  accordion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  accordionTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  sectionBody: { gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
  detailField: { gap: 4 },
  detailLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  detailValue: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  noteInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing.md,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlignVertical: 'top',
  },
  addNoteBtn: { alignSelf: 'flex-start' },
  noteCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  noteMeta: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  noteBody: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.md,
  },
  emptyTab: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
