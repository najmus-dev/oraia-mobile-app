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
  formatContactClipboardText,
} from '../lib/contacts';
import {
  type ContactNotesResponse,
  type CreateNoteResponse,
  formatNoteWhen,
} from '../lib/contactNotes';
import { lookupConversationForContact } from '../lib/conversationsApi';
import type { MessageChannel } from '../lib/conversations';
import {
  navigateToContactMessage,
  navigateToScheduleForContact,
} from '../lib/navigation';
import { finishWizardFlow, popWizardBack } from '../lib/stackNavigation';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { Button } from '../components/Button';
import { ListBusyState } from '../components/ListBusyState';
import { ContactAvatar } from '../components/contacts/ContactAvatar';
import { ContactDetailSection } from '../components/contacts/ContactDetailSection';
import { ContactOverflowMenu } from '../components/contacts/ContactOverflowMenu';
import { ContactQuickActions } from '../components/contacts/ContactQuickActions';
import { ContactTabBar, type ContactTab } from '../components/contacts/ContactTabBar';
import { TaskRow } from '../components/tasks/TaskRow';
import type { Task, AssigneesResponse } from '../lib/tasks';
import { type Opportunity, formatOpportunityMoney } from '../lib/opportunities';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'ContactDetail'>;

function DetailField({
  label,
  value,
  hideEmpty,
}: {
  label: string;
  value?: string;
  hideEmpty: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const trimmed = value?.trim();
  if (hideEmpty && !trimmed) return null;
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{trimmed || '—'}</Text>
    </View>
  );
}

export function ContactDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const res = await api.getJson<ContactResponse>(`/api/contacts/${contactId}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      setContact(res.contact);
      const aid = res.contact.assignedTo?.trim();
      if (aid) {
        try {
          const assignees = await api.getJson<AssigneesResponse>('/api/tasks/assignees', {
            headers: withAuthHeaders({ token, locationId }),
          });
          setAssigneeName((assignees.users ?? []).find((u) => u.id === aid)?.name ?? null);
        } catch {
          setAssigneeName(null);
        }
      } else {
        setAssigneeName(null);
      }
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

  const loadOpportunities = useCallback(async () => {
    if (!token || !locationId) return;
    setOpportunitiesLoading(true);
    try {
      const res = await api.getJson<{ opportunities: Opportunity[] }>(
        `/api/opportunities?contactId=${encodeURIComponent(contactId)}&limit=50`,
        { headers: withAuthHeaders({ token, locationId }) },
      );
      setOpportunities(res.opportunities ?? []);
    } catch {
      setOpportunities([]);
    } finally {
      setOpportunitiesLoading(false);
    }
  }, [token, locationId, contactId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadNotes();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadTasks();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadOpportunities();
  }, [load, loadNotes, loadTasks, loadOpportunities]);

  const displayName = contact ? contactDisplayName(contact) : 'Contact';
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  const openInAppConversation = useCallback(
    async (channel: MessageChannel) => {
      if (!contact || !token || !locationId) return;
      if (channel === 'Email' && !contact.email?.trim()) {
        Alert.alert('Email', 'No email on file.');
        return;
      }
      if (channel === 'SMS' && !contact.phone?.trim() && !contact.email?.trim()) {
        Alert.alert('Message', 'No phone or email on file.');
        return;
      }
      try {
        const conversation = await lookupConversationForContact({ token, locationId }, contact.id);
        navigateToContactMessage(navigation, {
          contactId: contact.id,
          contactName: displayName,
          contactPhone: contact.phone,
          contactEmail: contact.email,
          conversationId: conversation?.id,
          channel,
        });
      } catch (e) {
        Alert.alert(channel === 'Email' ? 'Email' : 'Message', formatError(e));
      }
    },
    [contact, token, locationId, navigation, displayName],
  );

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
        onPress: () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          openInAppConversation('SMS');
        },
      },
      {
        id: 'email',
        label: 'Email',
        icon: 'mail-outline' as const,
        disabled: !contact?.email?.trim(),
        onPress: () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          openInAppConversation('Email');
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
    [contact, openInAppConversation, navigation, displayName],
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
      finishWizardFlow(navigation, { name: 'ContactsList' });
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

  async function copyContact() {
    if (!contact) return;
    setMenuOpen(false);
    const text = formatContactClipboardText(contact);
    if (!text) {
      Alert.alert('Copy contact', 'No contact details to copy.');
      return;
    }
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Contact details copied to clipboard.');
  }

  function openEditContact() {
    navigation.navigate('ContactForm', { contactId });
  }

  function handleTabChange(tab: ContactTab) {
    setMenuOpen(false);
    setActiveTab(tab);
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={displayName}
        onBack={() => popWizardBack(navigation, 'ContactsList')}
        rightIcon="ellipsis-vertical"
        onRightPress={() => setMenuOpen((v) => !v)}
      />

      <ContactOverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          { label: 'Copy contact', onPress: () => { void copyContact(); } },
          { label: 'Edit contact', onPress: openEditContact },
          { label: 'Delete contact', onPress: confirmDelete, destructive: true, disabled: deleting },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        onScrollBeginDrag={() => setMenuOpen(false)}
        keyboardShouldPersistTaps="handled"
      >
        {contact ? (
          <>
            <View style={styles.profile}>
              <View style={styles.tagRow}>
                <Pressable style={styles.tagPill} onPress={openEditContact}>
                  <Ionicons name="pricetag-outline" size={14} color={theme.colors.link} />
                  <Text style={styles.tagPillText}>Tags</Text>
                </Pressable>
                {contact.tags?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                    {contact.tags.map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagChipText} numberOfLines={1}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.tagEmpty}>No tags</Text>
                )}
              </View>

              <ContactAvatar contact={contact} size={96} />

              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Pressable
                  onPress={() => { void copyContact(); }}
                  hitSlop={8}
                  accessibilityLabel="Copy contact details"
                >
                  <Ionicons name="copy-outline" size={18} color={theme.colors.foregroundMuted} />
                </Pressable>
              </View>

              <View style={styles.contactLines}>
                {contact.phone?.trim() ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${contact.phone!.trim()}`)}
                    hitSlop={4}
                  >
                    <Text style={styles.profileLink}>{contact.phone.trim()}</Text>
                  </Pressable>
                ) : null}
                {contact.email?.trim() ? (
                  <Pressable
                    onPress={() => {
                      // eslint-disable-next-line @typescript-eslint/no-floating-promises
                      openInAppConversation('Email');
                    }}
                    hitSlop={4}
                  >
                    <Text style={styles.profileLink}>{contact.email.trim()}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ContactQuickActions actions={quickActions} />

            <View style={styles.tabsWrap}>
              <ContactTabBar
                active={activeTab}
                onChange={handleTabChange}
                taskCount={pendingTasks}
                opportunityCount={opportunities.length}
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
                <ContactDetailSection title="Contact" defaultOpen>
                  <DetailField label="First name" value={contact.firstName} hideEmpty={hideEmpty} />
                  <DetailField label="Last name" value={contact.lastName} hideEmpty={hideEmpty} />
                  <DetailField label="Email" value={contact.email} hideEmpty={hideEmpty} />
                  <DetailField label="Phone" value={contact.phone} hideEmpty={hideEmpty} />
                  <DetailField label="Company" value={contact.companyName} hideEmpty={hideEmpty} />
                  <DetailField label="Type" value={contact.type} hideEmpty={hideEmpty} />
                  <DetailField label="Owner" value={assigneeName ?? undefined} hideEmpty={hideEmpty} />
                  <DetailField label="Timezone" value={contact.timezone} hideEmpty={hideEmpty} />
                </ContactDetailSection>
                <ContactDetailSection title="General info" defaultOpen={false}>
                  <DetailField label="Website" value={contact.website} hideEmpty={hideEmpty} />
                  <DetailField label="Address" value={contactAddressLine(contact)} hideEmpty={hideEmpty} />
                </ContactDetailSection>
                <ContactDetailSection title="DND" defaultOpen={false}>
                  <DetailField
                    label="DND all channels"
                    value={contact.dnd ? 'Yes' : 'No'}
                    hideEmpty={hideEmpty}
                  />
                </ContactDetailSection>
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

            {activeTab === 'opportunities' ? (
              <View style={styles.tabBody}>
                {opportunitiesLoading ? (
                  <ListBusyState message="Loading deals…" />
                ) : opportunities.length === 0 ? (
                  <Text style={styles.emptyTab}>No opportunities linked to this contact.</Text>
                ) : (
                  opportunities.map((opp) => (
                    <Pressable
                      key={opp.id}
                      style={styles.oppRow}
                      onPress={() =>
                        navigation.navigate('OpportunityDetail', {
                          opportunityId: opp.id,
                          title: opp.name,
                        })
                      }
                    >
                      <Text style={styles.oppTitle} numberOfLines={2}>
                        {opp.name ?? 'Untitled'}
                      </Text>
                      <Text style={styles.oppMeta}>
                        {formatOpportunityMoney(opp.monetaryValue) || '$0.00'}
                        {opp.status ? ` · ${opp.status}` : ''}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            {activeTab === 'notes' ? (
              <View style={styles.tabBody}>
                <View style={styles.noteComposer}>
                  <TextInput
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    placeholder="Add a note about this contact…"
                    placeholderTextColor={theme.colors.inputPlaceholder}
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
                </View>
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

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
    minHeight: 36,
  },
  tagScroll: {
    flex: 1,
  },
  tagChip: {
    marginRight: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 140,
  },
  tagChipText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  tagEmpty: {
    flex: 1,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
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
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  profileName: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
  },
  contactLines: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  profileLink: {
    color: theme.colors.link,
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
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  detailField: { gap: theme.spacing.xs },
  detailLabel: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  detailValue: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  noteComposer: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  noteInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing.md,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.md,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.background,
  },
  addNoteBtn: { alignSelf: 'stretch' },
  noteCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  noteMeta: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  noteBody: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.md,
  },
  oppRow: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  oppTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  oppMeta: {
    marginTop: theme.spacing.xs,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  emptyTab: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
}
