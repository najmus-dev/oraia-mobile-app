import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  type Contact,
  type ContactsListResponse,
  contactDisplayName,
  contactSubtitle,
  contactToPicked,
} from '../lib/contacts';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { LocationAvatar } from '../components/LocationAvatar';
import type { AppsStackParamList } from '../navigation/AppsStack';
import type { CalendarStackParamList } from '../navigation/CalendarStack';
import type { TaskFilters } from '../lib/tasks';

export type PickContactParams = {
  flow: 'schedule' | 'opportunity' | 'appointment' | 'task' | 'taskFilter';
  eventId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  selectedContactIds?: string[];
  filters?: TaskFilters;
};

type CalendarPickProps = NativeStackScreenProps<CalendarStackParamList, 'PickContact'>;
type AppsPickProps = NativeStackScreenProps<AppsStackParamList, 'PickContact'>;
type PipelinePickProps = AppsPickProps;

type Props = CalendarPickProps | AppsPickProps;

export function PickContactScreen({ navigation, route }: Props) {
  const listBottom = useFullScreenBottomInset();
  const { flow, eventId } = route.params;
  const isTaskFilter = flow === 'taskFilter';
  const { token, locationId } = useAppState();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(route.params.selectedContactIds ?? []);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const qs = query.trim() ? `&query=${encodeURIComponent(query.trim())}` : '';
      const res = await api.getJson<ContactsListResponse>(`/api/contacts?limit=50${qs}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      setContacts(res.contacts ?? []);
    } catch (e) {
      Alert.alert('Contacts', formatError(e));
    } finally {
      setLoading(false);
    }
  }, [token, locationId, query]);

  useEffect(() => {
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      load();
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  function pick(contact: Contact) {
    const picked = contactToPicked(contact);
    if (flow === 'taskFilter') {
      setSelectedIds((prev) =>
        prev.includes(contact.id) ? prev.filter((id) => id !== contact.id) : [...prev, contact.id],
      );
      return;
    }
    if (flow === 'schedule') {
      (navigation as CalendarPickProps['navigation']).navigate('ScheduleAppointment', { contact: picked });
      return;
    }
    if (flow === 'opportunity') {
      (navigation as PipelinePickProps['navigation']).navigate('OpportunityForm', {
        pickedContact: picked,
        pipelineId: route.params.pipelineId,
        pipelineStageId: route.params.pipelineStageId,
      });
      return;
    }
    if (flow === 'task') {
      (navigation as PipelinePickProps['navigation']).navigate({
        name: 'TaskForm',
        params: { pickedContact: picked },
        merge: true,
      });
      return;
    }
    if (flow === 'taskFilter') {
      return;
    }
    (navigation as CalendarPickProps['navigation']).navigate({
      name: 'AppointmentForm',
      params: { pickedContact: picked, eventId },
      merge: true,
    });
  }

  function applyTaskFilterContacts() {
    (navigation as PipelinePickProps['navigation']).navigate('TaskFilters', {
      filters: route.params.filters,
      pickedContactIds: selectedIds,
    });
  }

  return (
    <View style={styles.container}>
      <AppBar title={isTaskFilter ? 'Select contacts' : 'Contacts'} onBack={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.mutedTextOnDark} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone number, email, or company"
          placeholderTextColor={theme.colors.mutedTextOnDark}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading && contacts.length === 0 ? (
        <ActivityIndicator color={theme.colors.secondary} style={{ marginTop: theme.spacing.xl }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[styles.list, { paddingBottom: listBottom }]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const checked = isTaskFilter && selectedIds.includes(item.id);
            return (
              <Pressable style={styles.row} onPress={() => pick(item)}>
                {isTaskFilter ? (
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? (
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    ) : null}
                  </View>
                ) : null}
                <LocationAvatar name={contactDisplayName(item)} size={44} />
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {contactDisplayName(item)}
                  </Text>
                  {item.phone?.trim() ? (
                    <Text style={styles.sub} numberOfLines={1}>
                      {item.phone.trim()}
                    </Text>
                  ) : null}
                  {item.email?.trim() ? (
                    <Text style={styles.sub} numberOfLines={1}>
                      {item.email.trim()}
                    </Text>
                  ) : null}
                  {!item.phone?.trim() && !item.email?.trim() && contactSubtitle(item) ? (
                    <Text style={styles.sub} numberOfLines={2}>
                      {contactSubtitle(item)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            !loading ? <Text style={styles.empty}>No contacts found.</Text> : null
          }
        />
      )}

      {isTaskFilter ? (
        <View style={styles.footer}>
          <Pressable
            style={styles.clearBtn}
            onPress={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={applyTaskFilterContacts}>
            <Text style={styles.applyText}>
              Apply{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    margin: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    paddingVertical: theme.spacing.md,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowBody: { flex: 1, minWidth: 0 },
  name: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  sub: {
    marginTop: 4,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.link,
    borderColor: theme.colors.link,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  clearBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  clearText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  applyBtn: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: theme.colors.link,
  },
  applyText: {
    color: theme.colors.navy,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
