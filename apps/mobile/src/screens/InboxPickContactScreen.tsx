import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppBar } from '../components/AppBar';
import { ListBusyState } from '../components/ListBusyState';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  type Contact,
  type ContactsListResponse,
  contactDisplayName,
  contactToPicked,
} from '../lib/contacts';
import { canSendEmail, canSendSms } from '../lib/messageFormat';
import { setCachedContactChannels } from '../lib/contactCache';
import { lookupConversationForContact } from '../lib/conversationsApi';
import { FAB_LIST_PADDING_BOTTOM } from '../lib/fabLayout';
import { formatError } from '../lib/errors';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { finishWizardFlow } from '../lib/stackNavigation';
import { useAppState } from '../state/AppState';
import { LocationAvatar } from '../components/LocationAvatar';
import type { InboxStackParamList } from '../navigation/InboxStack';

type Props = NativeStackScreenProps<InboxStackParamList, 'PickContactForMessage'>;

export function InboxPickContactScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { channel } = route.params;
  const { token, locationId } = useAppState();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [opening, setOpening] = useState(false);
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  const visibleContacts = useMemo(() => {
    if (channel === 'Email') return contacts.filter((c) => canSendEmail(c.email).ok);
    if (channel === 'SMS') return contacts.filter((c) => canSendSms(c.phone).ok);
    return contacts;
  }, [contacts, channel]);

  const load = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!token || !locationId) return;
      if (opts?.pull) setRefreshing(true);
      else if (!hasLoaded) setInitialLoading(true);
      try {
        const qs = query.trim() ? `&query=${encodeURIComponent(query.trim())}` : '';
        const res = await api.getJson<ContactsListResponse>(`/api/contacts?limit=50${qs}`, {
          headers: withAuthHeaders({ token, locationId }),
        });
        setContacts(res.contacts ?? []);
        setHasLoaded(true);
      } catch (e) {
        Alert.alert('Contacts', formatError(e));
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [token, locationId, query, hasLoaded],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      load();
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function openContact(contact: Contact) {
    if (!token || !locationId || opening) return;
    const picked = contactToPicked(contact);
    if (channel === 'Email' && !canSendEmail(picked.email).ok) {
      Alert.alert(
        'No email',
        'This contact has no email on file. Add one in GHL or pick another contact.',
      );
      return;
    }
    if (channel === 'SMS' && !canSendSms(picked.phone).ok) {
      Alert.alert(
        'No phone number',
        'This contact has no phone number on file. Add one in GHL or pick another contact.',
      );
      return;
    }
    setCachedContactChannels(picked.id, { phone: picked.phone, email: picked.email });
    setOpening(true);
    try {
      const existing = await lookupConversationForContact({ token, locationId }, picked.id);
      finishWizardFlow(navigation, {
        name: 'ConversationThread',
        params: {
          conversationId: existing?.id,
          contactId: picked.id,
          contactName: picked.name,
          contactPhone: picked.phone,
          contactEmail: picked.email,
          channel,
        },
      });
    } catch (e) {
      Alert.alert('Conversation', formatError(e));
    } finally {
      setOpening(false);
    }
  }

  const title = channel === 'Email' ? 'New Email' : 'New Direct Message';

  return (
    <View style={styles.container}>
      <AppBar title={title} onBack={() => navigation.goBack()} />

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone number, email, or…"
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {opening ? (
        <View style={styles.openingOverlay}>
          <ActivityIndicator color={theme.colors.secondary} size="large" />
          <Text style={styles.openingText}>Opening conversation…</Text>
        </View>
      ) : null}

      {initialLoading && !hasLoaded ? (
        <ListBusyState blocking message="Loading contacts…" />
      ) : (
        <FlatList
          data={visibleContacts}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={() => load({ pull: true })}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openContact(item)} disabled={opening}>
              <LocationAvatar name={contactDisplayName(item)} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {contactDisplayName(item)}
                </Text>
                {item.phone ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {item.phone}
                  </Text>
                ) : null}
                {item.email ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {item.email}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            hasLoaded && !initialLoading ? (
              <Text style={styles.empty}>
                {channel === 'Email'
                  ? 'No contacts with an email address found.'
                  : channel === 'SMS'
                    ? 'No contacts with a phone number found.'
                    : 'No contacts found.'}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  search: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    paddingVertical: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.regular,
  },
  list: { paddingBottom: FAB_LIST_PADDING_BOTTOM },
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
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  sub: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.foregroundMuted,
    marginTop: theme.spacing.xl,
    fontFamily: theme.typography.fontFamily.regular,
  },
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 19, 35, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: theme.spacing.md,
  },
  openingText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
});
}
