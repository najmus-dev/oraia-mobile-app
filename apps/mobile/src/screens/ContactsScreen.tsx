import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useHeaderTopPadding } from '../lib/safeArea';
import { api, withAuthHeaders } from '../lib/api';
import {
  type Contact,
  type ContactSmartList,
  type ContactsListResponse,
  type ContactSmartListsResponse,
  usesPageBasedContactPagination,
} from '../lib/contacts';
import { formatError } from '../lib/errors';
import { FAB_LIST_PADDING_BOTTOM } from '../lib/fabLayout';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { ErrorBanner } from '../components/ErrorBanner';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { ContactFilterPill } from '../components/contacts/ContactFilterPill';
import { ContactFilterSheet } from '../components/contacts/ContactFilterSheet';
import { ContactListRow } from '../components/contacts/ContactListRow';
import { ContactSearchBar } from '../components/contacts/ContactSearchBar';
import { NewContactSheet } from '../components/contacts/NewContactSheet';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'ContactsList'>;

const PAGE_SIZE = 30;
const DEFAULT_LISTS: ContactSmartList[] = [{ id: 'all', name: 'All Contacts', source: 'all' }];

export function ContactsScreen({ navigation, route }: Props) {
  const paddingTop = useHeaderTopPadding();
  const { token, locationId } = useAppState();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [smartLists, setSmartLists] = useState<ContactSmartList[]>(DEFAULT_LISTS);
  const [query, setQuery] = useState(route.params?.initialQuery?.trim() ?? '');
  const [filterId, setFilterId] = useState('all');
  const [filterLabel, setFilterLabel] = useState('All Contacts');
  const [filterOpen, setFilterOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const nextPageRef = useRef<{ startAfterId?: string; startAfter?: number } | null>(null);

  const pageBased = usesPageBasedContactPagination(filterId);

  const loadSmartLists = useCallback(async () => {
    if (!token || !locationId) return;
    try {
      const res = await api.getJson<ContactSmartListsResponse>('/api/contacts/smart-lists', {
        headers: withAuthHeaders({ token, locationId }),
      });
      setSmartLists(res.lists?.length ? res.lists : DEFAULT_LISTS);
    } catch {
      setSmartLists(DEFAULT_LISTS);
    }
  }, [token, locationId]);

  const loadPage = useCallback(
    async (opts?: {
      reset?: boolean;
      nextPage?: number;
      cursor?: { startAfterId?: string; startAfter?: number };
    }) => {
      if (!token || !locationId) return;
      const reset = opts?.reset ?? false;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      if (reset) setLoadError(null);

      try {
        const qsParts = [`limit=${PAGE_SIZE}`];
        if (query.trim()) qsParts.push(`query=${encodeURIComponent(query.trim())}`);
        if (filterId !== 'all') {
          qsParts.push(`filterId=${encodeURIComponent(filterId)}`);
        }

        if (pageBased) {
          const next = reset ? 1 : (opts?.nextPage ?? 1);
          qsParts.push(`page=${next}`);
        } else if (opts?.cursor?.startAfterId) {
          qsParts.push(`startAfterId=${encodeURIComponent(opts.cursor.startAfterId)}`);
          if (opts.cursor.startAfter != null) {
            qsParts.push(`startAfter=${opts.cursor.startAfter}`);
          }
        }

        const res = await api.getJson<ContactsListResponse>(`/api/contacts?${qsParts.join('&')}`, {
          headers: withAuthHeaders({ token, locationId }),
        });
        const incoming = res.contacts ?? [];
        setContacts((prev) => (reset ? incoming : [...prev, ...incoming]));

        const meta = res.meta;
        if (pageBased) {
          const currentPage = reset ? 1 : (opts?.nextPage ?? 1);
          setPage(currentPage);
          setHasMore(Boolean(meta?.hasMore));
          nextPageRef.current = null;
        } else {
          setPage(1);
          if (meta?.startAfterId) {
            nextPageRef.current = {
              startAfterId: meta.startAfterId,
              startAfter: meta.startAfter,
            };
            setHasMore(true);
          } else {
            nextPageRef.current = null;
            setHasMore(false);
          }
        }
      } catch (e) {
        const message = formatError(e);
        if (reset) {
          setLoadError(message);
          setContacts([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, locationId, query, filterId, pageBased],
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadSmartLists();
  }, [loadSmartLists]);

  useEffect(() => {
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      loadPage({ reset: true });
    }, 250);
    return () => clearTimeout(t);
  }, [loadPage]);

  function loadMore() {
    if (loadingMore || !hasMore) return;
    if (pageBased) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      loadPage({ nextPage: page + 1 });
      return;
    }
    if (nextPageRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      loadPage({ cursor: nextPageRef.current });
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop }}>
        <AppBar title="Contacts" />
      </View>

      <View style={styles.controls}>
        <ContactSearchBar value={query} onChangeText={setQuery} />
        <ContactFilterPill label={filterLabel} onPress={() => setFilterOpen(true)} />
      </View>

      {loadError ? (
        <ErrorBanner
          message={loadError}
          onRetry={() => loadPage({ reset: true })}
          onDismiss={() => setLoadError(null)}
        />
      ) : null}

      {loading && contacts.length === 0 ? (
        <ActivityIndicator color={theme.colors.link} style={styles.loader} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => loadPage({ reset: true })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <ContactListRow
              contact={item}
              onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
            />
          )}
          ListEmptyComponent={
            !loading && !loadError ? (
              <Text style={styles.empty}>
                {filterId === 'all'
                  ? 'No contacts yet. Tap + to add someone.'
                  : 'No contacts match this list.'}
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={theme.colors.link} style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <FloatingActionButton
        accessibilityLabel="Add contact"
        onPress={() => setNewContactOpen(true)}
      />

      <ContactFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        lists={smartLists}
        selectedId={filterId}
        onSelect={(id, label) => {
          setFilterId(id);
          setFilterLabel(label);
        }}
      />

      <NewContactSheet
        visible={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        onAddContact={() => navigation.navigate('ContactForm')}
        onScanCard={() => navigation.navigate('ScanBusinessCard')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  controls: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  list: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
  },
  loader: { marginTop: theme.spacing['2xl'] },
  footerLoader: { marginVertical: theme.spacing.lg },
  empty: {
    marginTop: theme.spacing['2xl'],
    textAlign: 'center',
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
});
