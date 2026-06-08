import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import {
  type Conversation,
  type ConversationsListResponse,
  type InboxFilter,
  type InboxTab,
  buildConversationsQuery,
} from '../lib/conversations';
import { getCachedContactChannels, prefetchContactChannels } from '../lib/contactCache';
import {
  markConversationRead,
  markConversationUnread,
  setConversationStarred,
} from '../lib/conversationsApi';
import { formatError } from '../lib/errors';
import { FAB_LIST_PADDING_BOTTOM } from '../lib/fabLayout';
import { useMyInboxAssigneeId } from '../lib/myInboxAssignee';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { ContactSearchBar } from '../components/contacts/ContactSearchBar';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { ListBusyState } from '../components/ListBusyState';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import { ConversationListRow } from '../components/inbox/ConversationListRow';
import { InboxBrandHeader } from '../components/inbox/InboxBrandHeader';
import { InboxFilterBar } from '../components/inbox/InboxFilterBar';
import { InboxFilterSheet } from '../components/inbox/InboxFilterSheet';
import { InboxTabBar } from '../components/inbox/InboxTabBar';
import {
  CreateMessageSheet,
  type ComposeKind,
} from '../components/inbox/CreateMessageSheet';
import type { InboxStackParamList } from '../navigation/InboxStack';

type Props = NativeStackScreenProps<InboxStackParamList, 'InboxList'>;

export function ConversationsScreen({ navigation }: Props) {
  const { token, locationId, locationName, locationAddress, locationLogoUrl, user } =
    useAppState();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [inboxTab, setInboxTab] = useState<InboxTab>('team');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const loadSeq = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const searchPlaceholder =
    inboxTab === 'team'
      ? 'Search conversations in team inbox'
      : 'Search conversations in my inbox';

  const ghlUserId = user?.ghlUserId?.trim();
  const { assigneeId: myAssigneeId, resolving: resolvingMyInbox } = useMyInboxAssigneeId({
    token,
    locationId,
    userEmail: user?.email,
    ghlUserId,
    inboxTab,
  });

  const load = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!token || !locationId) return;

      const seq = ++loadSeq.current;
      if (opts?.pull) setRefreshing(true);
      else if (!hasLoaded) setInitialLoading(true);

      if (inboxTab === 'mine' && !myAssigneeId) {
        if (seq === loadSeq.current) {
          setConversations([]);
          setHasLoaded(true);
          setInitialLoading(false);
          setRefreshing(false);
        }
        return;
      }

      try {
        const assignedTo = inboxTab === 'mine' ? myAssigneeId : undefined;
        const res = await api.getJson<ConversationsListResponse>(
          `/api/conversations?${buildConversationsQuery({ limit: 60, query, filter, assignedTo })}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        if (seq !== loadSeq.current) return;
        const list = res.conversations ?? [];
        setConversations(list);
        setHasLoaded(true);
        const ids = list.map((c) => c.contactId).filter((id): id is string => Boolean(id?.trim()));
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        prefetchContactChannels({ token, locationId }, ids);
      } catch (e) {
        if (seq === loadSeq.current) Alert.alert('Inbox', formatError(e));
      } finally {
        if (seq === loadSeq.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, locationId, query, filter, hasLoaded, inboxTab, myAssigneeId],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      load();
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (hasLoaded) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        load();
      }
    }, [load, hasLoaded]),
  );

  const patchConversation = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const openThread = useCallback(
    (item: Conversation) => {
      const cached = item.contactId ? getCachedContactChannels(item.contactId) : undefined;
      navigation.navigate('ConversationThread', {
        conversationId: item.id,
        contactId: item.contactId ?? '',
        contactName: item.contactName,
        contactPhone: cached?.phone,
        contactEmail: cached?.email,
        starred: item.starred,
      });
    },
    [navigation],
  );

  const showRowActions = useCallback(
    (item: Conversation) => {
      if (!token || !locationId) return;
      const unread = (item.unreadCount ?? 0) > 0;
      const options: string[] = [];
      const handlers: Array<() => void> = [];

      if (unread) {
        options.push('Mark as read');
        handlers.push(async () => {
          try {
            await markConversationRead({ token, locationId }, item.id);
            patchConversation(item.id, { unreadCount: 0 });
          } catch (e) {
            Alert.alert('Inbox', formatError(e));
          }
        });
      } else {
        options.push('Mark as unread');
        handlers.push(async () => {
          try {
            await markConversationUnread({ token, locationId }, item.id);
            patchConversation(item.id, { unreadCount: 1 });
          } catch (e) {
            Alert.alert('Inbox', formatError(e));
          }
        });
      }

      options.push(item.starred ? 'Remove star' : 'Star conversation');
      handlers.push(async () => {
        const next = !item.starred;
        try {
          await setConversationStarred({ token, locationId }, item.id, next);
          patchConversation(item.id, { starred: next });
        } catch (e) {
          Alert.alert('Inbox', formatError(e));
        }
      });

      options.push('Cancel');
      const cancelIndex = options.length - 1;

      const onSelect = (index: number) => {
        if (index === cancelIndex || index < 0) return;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handlers[index]?.();
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: cancelIndex },
          onSelect,
        );
      } else {
        Alert.alert(item.contactName ?? 'Conversation', undefined, [
          ...handlers.map((fn, i) => ({
            text: options[i],
            onPress: () => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              fn();
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [token, locationId, patchConversation],
  );

  function onComposeSelect(kind: ComposeKind) {
    setComposeOpen(false);
    navigation.navigate('PickContactForMessage', {
      channel: kind === 'email' ? 'Email' : 'SMS',
    });
  }

  const emptySubtitle =
    inboxTab === 'mine' && resolvingMyInbox
      ? 'Linking your GHL account…'
      : inboxTab === 'mine' && !myAssigneeId
        ? 'Switch to Team Inbox to see all conversations, or ask your admin to add your email as a GHL user in this location.'
        : filter === 'unread'
          ? 'No unread messages right now.'
          : filter === 'starred'
            ? 'No starred conversations yet.'
            : 'Tap + to start a new message.';

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <InboxBrandHeader
          locationName={locationName}
          locationAddress={locationAddress}
          locationLogoUrl={locationLogoUrl}
          onOpenLocation={() => setLocationSheetOpen(true)}
        />

        <View style={styles.searchWrap}>
          <ContactSearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
          />
        </View>

        <InboxTabBar active={inboxTab} onChange={setInboxTab} />

        <InboxFilterBar
          filter={filter}
          onFilterChange={setFilter}
          onOpenFilterSheet={() => setFilterSheetOpen(true)}
        />
      </View>

      <View style={styles.listBody}>
        {initialLoading && !hasLoaded ? (
          <ListBusyState
            blocking
            message={inboxTab === 'mine' && resolvingMyInbox ? 'Linking your inbox…' : 'Loading inbox…'}
          />
        ) : (
          <FlatList
            style={styles.list}
            data={conversations}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={() => load({ pull: true })}
            initialNumToRender={12}
            renderItem={({ item }) => (
              <ConversationListRow
                item={item}
                onOpenThread={openThread}
                onLongPressRow={showRowActions}
              />
            )}
            ListEmptyComponent={
              hasLoaded && !initialLoading && !refreshing ? (
                <EmptyState title="No conversations" subtitle={emptySubtitle} />
              ) : null
            }
          />
        )}
      </View>

      <FloatingActionButton
        onPress={() => setComposeOpen(true)}
        accessibilityLabel="Create new message"
      />

      <CreateMessageSheet
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSelect={onComposeSelect}
      />

      <InboxFilterSheet
        visible={filterSheetOpen}
        selected={filter}
        onClose={() => setFilterSheetOpen(false)}
        onSelect={setFilter}
      />

      <LocationSelectSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onSelected={() => setLocationSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerSection: {
    flexGrow: 0,
    flexShrink: 0,
  },
  searchWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  listBody: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  listContent: { paddingBottom: FAB_LIST_PADDING_BOTTOM },
});
