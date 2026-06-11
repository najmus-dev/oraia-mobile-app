import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useFullScreenBottomInset } from '../lib/safeArea';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { api, withAuthHeaders } from '../lib/api';
import type { ContactResponse } from '../lib/contacts';
import {
  type ConversationMessage,
  type MessageChannel,
  type SendMessageResponse,
  buildSendMessagePayload,
  resolveConversationContactId,
} from '../lib/conversations';
import {
  markConversationReadBestEffort,
  setConversationStarred,
  uploadMessageAttachment,
} from '../lib/conversationsApi';
import { setCachedContactChannels } from '../lib/contactCache';
import { formatError } from '../lib/errors';
import { navigateToContactDetail } from '../lib/navigation';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { ListBusyState } from '../components/ListBusyState';
import { ConversationThreadHeader } from '../components/inbox/ConversationThreadHeader';
import { MessageBubble } from '../components/inbox/MessageBubble';
import { ThreadComposer } from '../components/inbox/ThreadComposer';
import { ThreadContactBar } from '../components/inbox/ThreadContactBar';
import {
  canSendEmail,
  canSendSms,
  formatMessageBodyForDisplay,
  formatMessageMeta,
  isActivityMessage,
  isOutboundMessage,
  isUndeliveredMessage,
  resolveMessageChannel,
  resolveSendChannels,
} from '../lib/messageFormat';
import {
  buildInvertedThreadRows,
  mergeThreadMessages,
  prependOlderMessages,
  sortMessagesChronologically,
  type ThreadRow,
} from '../lib/threadMessages';
import type { InboxStackParamList } from '../navigation/InboxStack';

type Props = NativeStackScreenProps<InboxStackParamList, 'ConversationThread'>;

type MessagesResponse = {
  messages: ConversationMessage[];
  nextPage?: boolean;
  lastMessageId?: string;
};

export function ConversationThreadScreen({ navigation, route }: Props) {
  const {
    conversationId: initialConversationId,
    contactId: routeContactId,
    contactName,
    contactPhone: routePhone,
    contactEmail: routeEmail,
    channel: initialChannel = 'SMS',
    starred: initialStarred,
  } = route.params;
  const { token, locationId } = useAppState();
  const bottomInset = useFullScreenBottomInset();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [initialLoading, setInitialLoading] = useState(Boolean(initialConversationId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderCursor, setOlderCursor] = useState<string | undefined>();
  const [starred, setStarred] = useState(Boolean(initialStarred));
  const [starredBusy, setStarredBusy] = useState(false);
  const [contactPhone, setContactPhone] = useState(routePhone);
  const [contactEmail, setContactEmail] = useState(routeEmail);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [channel, setChannel] = useState<MessageChannel>(() =>
    resolveMessageChannel(initialChannel, routePhone, routeEmail),
  );
  const [fromNumber, setFromNumber] = useState<string | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [attaching, setAttaching] = useState(false);
  const listRef = useRef<FlatList<ThreadRow>>(null);
  const isNearBottomRef = useRef(true);
  const pendingScrollRef = useRef(false);
  const skipNextLoadRef = useRef(false);
  const messageCountRef = useRef(0);
  const deliveryPollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const resolvedContactId = useMemo(() => {
    const fromMessages = resolveConversationContactId(routeContactId, messages);
    const trimmed = routeContactId?.trim();
    return fromMessages || trimmed || undefined;
  }, [routeContactId, messages]);

  const rows = useMemo(() => buildInvertedThreadRows(messages), [messages]);
  const displayName = contactName ?? 'Contact';

  useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    setConversationId(initialConversationId);
  }, [initialConversationId]);

  const sendGate = useMemo(() => {
    if (!resolvedContactId) {
      return { canSend: false, reason: 'Link a contact to this thread before replying.' };
    }
    if (channel === 'Email') {
      const emailCheck = canSendEmail(contactEmail);
      return { canSend: emailCheck.ok, reason: emailCheck.reason };
    }
    const smsCheck = canSendSms(contactPhone);
    return { canSend: smsCheck.ok, reason: smsCheck.reason };
  }, [resolvedContactId, channel, contactEmail, contactPhone]);

  const availableChannels = useMemo(
    () => resolveSendChannels(contactPhone, contactEmail),
    [contactPhone, contactEmail],
  );

  useEffect(() => {
    setChannel((prev) => resolveMessageChannel(prev, contactPhone, contactEmail));
  }, [contactPhone, contactEmail]);

  const composerAuth = useMemo(
    () => (token && locationId ? { token, locationId } : null),
    [token, locationId],
  );

  const fetchMessagePage = useCallback(
    async (id: string, lastMessageId?: string) => {
      const qs = new URLSearchParams({ limit: '50' });
      if (lastMessageId) qs.set('lastMessageId', lastMessageId);
      const res = await api.getJson<MessagesResponse>(
        `/api/conversations/${encodeURIComponent(id)}/messages?${qs.toString()}`,
        { headers: withAuthHeaders({ token: token!, locationId: locationId! }) },
      );
      return {
        messages: sortMessagesChronologically(res.messages ?? []),
        hasOlder: Boolean(res.nextPage && res.lastMessageId),
        cursor: res.lastMessageId,
      };
    },
    [token, locationId],
  );

  const loadInitial = useCallback(async () => {
    if (!token || !locationId || !conversationId) {
      setInitialLoading(false);
      return;
    }
    setInitialLoading(true);
    try {
      const page = await fetchMessagePage(conversationId);
      setMessages(page.messages);
      setHasOlder(page.hasOlder);
      setOlderCursor(page.cursor);
      isNearBottomRef.current = true;
      pendingScrollRef.current = true;
      markConversationReadBestEffort({ token, locationId }, conversationId);
    } catch (e) {
      Alert.alert('Messages', formatError(e));
    } finally {
      setInitialLoading(false);
    }
  }, [token, locationId, conversationId, fetchMessagePage]);

  const refreshMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token || !locationId || !conversationId) return;
      if (!opts?.silent) setRefreshing(true);
      try {
        const page = await fetchMessagePage(conversationId);
        const hadMessages = messageCountRef.current;
        setMessages((prev) => mergeThreadMessages(prev, page.messages));
        setHasOlder(page.hasOlder);
        setOlderCursor(page.cursor);
        if (isNearBottomRef.current || hadMessages === 0) {
          pendingScrollRef.current = true;
        }
      } catch (e) {
        if (!opts?.silent) Alert.alert('Messages', formatError(e));
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [token, locationId, conversationId, fetchMessagePage],
  );

  const scheduleDeliveryStatusPoll = useCallback(() => {
    deliveryPollTimersRef.current.forEach(clearTimeout);
    deliveryPollTimersRef.current = [2_000, 5_000, 12_000].map((delay) =>
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        refreshMessages({ silent: true });
      }, delay),
    );
  }, [refreshMessages]);

  useEffect(
    () => () => {
      deliveryPollTimersRef.current.forEach(clearTimeout);
      deliveryPollTimersRef.current = [];
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      const interval = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        refreshMessages({ silent: true });
      }, 20_000);
      return () => clearInterval(interval);
    }, [conversationId, refreshMessages]),
  );

  const loadOlderMessages = useCallback(async () => {
    if (!token || !locationId || !conversationId || !hasOlder || !olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchMessagePage(conversationId, olderCursor);
      setMessages((prev) => prependOlderMessages(prev, page.messages));
      setHasOlder(page.hasOlder);
      setOlderCursor(page.cursor);
    } catch (e) {
      Alert.alert('Messages', formatError(e));
    } finally {
      setLoadingOlder(false);
    }
  }, [token, locationId, conversationId, hasOlder, olderCursor, loadingOlder, fetchMessagePage]);

  useEffect(() => {
    if (!conversationId) {
      setInitialLoading(false);
      setMessages([]);
      return;
    }
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    setMessages([]);
    setHasOlder(false);
    setOlderCursor(undefined);
    isNearBottomRef.current = true;
    pendingScrollRef.current = true;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadInitial();
  }, [conversationId, loadInitial]);

  useEffect(() => {
    if (!token || !locationId || !resolvedContactId) return;
    if (routePhone?.trim() && routeEmail?.trim()) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.getJson<ContactResponse>(
          `/api/contacts/${encodeURIComponent(resolvedContactId)}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        if (!alive) return;
        const phone = res.contact?.phone?.trim();
        const email = res.contact?.email?.trim();
        if (phone || email) {
          setCachedContactChannels(resolvedContactId, { phone, email });
        }
        if (!routePhone?.trim() && phone) setContactPhone(phone);
        if (!routeEmail?.trim() && email) setContactEmail(email);
      } catch {
        /* optional enrichment */
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, locationId, resolvedContactId, routePhone, routeEmail]);

  const scrollToLatest = useCallback((animated = true) => {
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  useEffect(() => {
    if (initialLoading || rows.length === 0 || !pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    scrollToLatest(false);
    const t = setTimeout(() => scrollToLatest(false), 120);
    return () => clearTimeout(t);
  }, [initialLoading, rows.length, scrollToLatest]);

  function handleContentSizeChange() {
    if (isNearBottomRef.current) {
      scrollToLatest(false);
    }
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { y: number } } }) {
    // Inverted list: offset 0 is the newest messages at the bottom.
    isNearBottomRef.current = e.nativeEvent.contentOffset.y < 80;
  }

  function openContact() {
    if (!resolvedContactId) {
      Alert.alert('Contact', 'No contact is linked to this conversation yet.');
      return;
    }
    navigateToContactDetail(navigation, resolvedContactId);
  }

  async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!token || !locationId || !resolvedContactId) return;
    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    setAttaching(true);
    try {
      const urls = await uploadMessageAttachment(
        { token, locationId },
        { contactId: resolvedContactId, conversationId },
        { uri: asset.uri, name, type },
      );
      if (urls.length === 0) {
        Alert.alert('Upload', 'GHL did not return an attachment URL. Try again or check API scopes.');
        return;
      }
      setAttachmentUrls((prev) => [...prev, ...urls].slice(0, 5));
    } catch (e) {
      Alert.alert('Upload failed', formatError(e));
    } finally {
      setAttaching(false);
    }
  }

  async function pickPhoto(source: 'library' | 'camera') {
    if (!token || !locationId || !resolvedContactId || channel !== 'SMS') return;
    if (attachmentUrls.length >= 5) {
      Alert.alert('Attachments', 'You can attach up to 5 files per message.');
      return;
    }
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos', source === 'camera' ? 'Allow camera access to take photos.' : 'Allow photo library access to attach images.');
      return;
    }
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsMultipleSelection: false,
          });
    if (picked.canceled || !picked.assets[0]) return;
    await uploadPickedAsset(picked.assets[0]);
  }

  function showAttachOptions() {
    const options = ['Photo library', 'Take photo', 'Cancel'];
    const cancelIndex = 2;
    const onSelect = (index: number) => {
      if (index === 0) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        pickPhoto('library');
      } else if (index === 1) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        pickPhoto('camera');
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        onSelect,
      );
    } else {
      Alert.alert('Attach photo', undefined, [
        { text: 'Photo library', onPress: () => pickPhoto('library') },
        { text: 'Take photo', onPress: () => pickPhoto('camera') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function send(overrideText?: string, overrideAttachments?: string[]) {
    const text = (overrideText ?? draft).trim();
    const attachments = overrideAttachments ?? attachmentUrls;
    if (
      (!text && attachments.length === 0) ||
      !token ||
      !locationId ||
      !resolvedContactId ||
      sending ||
      !sendGate.canSend
    ) {
      if (!sendGate.canSend && sendGate.reason) Alert.alert('Cannot send', sendGate.reason);
      return;
    }

    const pendingId = `pending-${Date.now()}`;
    const optimistic: ConversationMessage = {
      id: pendingId,
      body: text || (attachments.length ? ' ' : ''),
      direction: 'outbound',
      messageType: channel,
      dateAdded: new Date().toISOString(),
      contactId: resolvedContactId,
      attachments: attachments.length ? attachments : undefined,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setAttachmentUrls([]);
    isNearBottomRef.current = true;
    pendingScrollRef.current = true;
    scrollToLatest();
    setSending(true);

    try {
      const res = await api.postJson<SendMessageResponse>(
        '/api/conversations/messages',
        buildSendMessagePayload({
          channel,
          contactId: resolvedContactId,
          conversationId,
          message: text || ' ',
          subject: emailSubject,
          fromNumber: fromNumber ?? undefined,
          toNumber: contactPhone,
          attachments: attachments.length ? attachments : undefined,
        }),
        { headers: withAuthHeaders({ token, locationId }) },
      );

      const nextConversationId = res.conversationId ?? conversationId;
      if (res.conversationId && res.conversationId !== conversationId) {
        skipNextLoadRef.current = true;
        setConversationId(res.conversationId);
      }

      if (nextConversationId) {
        const page = await fetchMessagePage(nextConversationId);
        setMessages((prev) =>
          mergeThreadMessages(
            prev.filter((m) => m.id !== pendingId),
            page.messages,
          ),
        );
        setHasOlder(page.hasOlder);
        setOlderCursor(page.cursor);
        isNearBottomRef.current = true;
        pendingScrollRef.current = true;
        scrollToLatest();
        scheduleDeliveryStatusPoll();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, id: `failed-${Date.now()}` } : m)),
      );
      Alert.alert('Send failed', formatError(e));
    } finally {
      setSending(false);
    }
  }

  async function toggleStarred() {
    if (!token || !locationId || !conversationId || starredBusy) return;
    const next = !starred;
    setStarredBusy(true);
    try {
      await setConversationStarred({ token, locationId }, conversationId, next);
      setStarred(next);
    } catch (e) {
      Alert.alert('Conversation', formatError(e));
    } finally {
      setStarredBusy(false);
    }
  }

  function retryFailed(message: ConversationMessage) {
    const body = formatMessageBodyForDisplay(message.body) ?? '';
    const attachments = message.attachments ?? [];
    if (!body && attachments.length === 0) return;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    send(body, attachments);
  }

  function showMessageActions(message: ConversationMessage) {
    const body = message.body?.trim();
    const attachmentList = message.attachments ?? [];
    if (!body && attachmentList.length === 0) return;

    const options: string[] = [];
    const failed = message.id.startsWith('failed-') || isUndeliveredMessage(message);
    if (failed) options.push('Retry send');
    if (body) options.push('Copy text');
    if (attachmentList[0]) options.push('Copy attachment link');
    options.push('Cancel');
    const cancelIndex = options.length - 1;

    const onSelect = (index: number) => {
      if (index === cancelIndex || index < 0) return;
      const label = options[index];
      if (label === 'Retry send') {
        retryFailed(message);
        return;
      }
      if (label === 'Copy text' && body) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Clipboard.setStringAsync(body).then(() => Alert.alert('Copied', 'Message copied.'));
        return;
      }
      if (label === 'Copy attachment link' && attachmentList[0]) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Clipboard.setStringAsync(attachmentList[0]).then(() =>
          Alert.alert('Copied', 'Link copied.'),
        );
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        onSelect,
      );
    } else {
      Alert.alert('Message', undefined, [
        ...(failed ? [{ text: 'Retry send', onPress: () => retryFailed(message) }] : []),
        ...(body
          ? [
              {
                text: 'Copy text',
                onPress: () => {
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  Clipboard.setStringAsync(body).then(() => Alert.alert('Copied', 'Message copied.'));
                },
              },
            ]
          : []),
        ...(attachmentList[0]
          ? [
              {
                text: 'Copy attachment link',
                onPress: () => {
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  Clipboard.setStringAsync(attachmentList[0]).then(() =>
                    Alert.alert('Copied', 'Link copied.'),
                  );
                },
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  const renderRow = useCallback(
    ({ item }: { item: ThreadRow }) => {
      if (item.kind === 'day') {
        return (
          <View style={styles.dayPill}>
            <Text style={styles.dayText}>{item.label}</Text>
          </View>
        );
      }
      const msg = item.message;
      const activity = isActivityMessage(msg.messageType);
      const failed = item.failed || isUndeliveredMessage(msg);
      return (
        <MessageBubble
          body={formatMessageBodyForDisplay(msg.body)}
          meta={formatMessageMeta(msg)}
          outbound={!activity && isOutboundMessage(msg.direction)}
          activity={activity}
          pending={item.pending}
          failed={failed}
          attachments={msg.attachments}
          onLongPress={() => showMessageActions(msg)}
          onRetry={failed ? () => retryFailed(msg) : undefined}
        />
      );
    },
    [sendGate.canSend],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ConversationThreadHeader
        contactName={displayName}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        starred={starred}
        starredBusy={starredBusy}
        onToggleStar={conversationId ? toggleStarred : undefined}
        onBack={() => navigation.goBack()}
        onOpenContact={openContact}
      />
      <ThreadContactBar
        phone={contactPhone}
        email={contactEmail}
        onViewContact={openContact}
      />

      <View style={styles.messagesPane}>
        {initialLoading ? (
          <ListBusyState blocking message="Loading messages…" />
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            inverted={rows.length > 0}
            keyExtractor={(r) => r.key}
            renderItem={renderRow}
            contentContainerStyle={[
              styles.messages,
              rows.length === 0 && styles.messagesEmptyGrow,
            ]}
            refreshing={refreshing}
            onRefresh={conversationId ? () => refreshMessages() : undefined}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            initialNumToRender={20}
            maxToRenderPerBatch={16}
            windowSize={11}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={
              hasOlder ? (
                <Pressable
                  style={styles.loadOlder}
                  onPress={loadOlderMessages}
                  disabled={loadingOlder}
                >
                  <Text style={styles.loadOlderText}>
                    {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyHint}>
                  {conversationId
                    ? 'No messages yet. Say hello below.'
                    : 'New conversation — send your first message below.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {composerAuth ? (
        <ThreadComposer
          auth={composerAuth}
          channel={channel}
          onChannelChange={setChannel}
          draft={draft}
          onDraftChange={setDraft}
          emailSubject={emailSubject}
          onEmailSubjectChange={setEmailSubject}
          fromNumber={fromNumber}
          onFromNumberChange={setFromNumber}
          canSend={sendGate.canSend}
          sendBlockedReason={sendGate.reason}
          sending={sending}
          attachmentUrls={attachmentUrls}
          attaching={attaching}
          onAttachPhoto={channel === 'SMS' ? showAttachOptions : undefined}
          onRemoveAttachment={(url) =>
            setAttachmentUrls((prev) => prev.filter((u) => u !== url))
          }
          onSend={() => send()}
          bottomInset={bottomInset}
          availableChannels={availableChannels}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  messagesPane: { flex: 1 },
  messages: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  messagesEmptyGrow: { flexGrow: 1, justifyContent: 'center' },
  dayPill: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  dayText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  loadOlder: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  loadOlderText: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    transform: [{ scaleY: -1 }],
  },
  emptyHint: {
    textAlign: 'center',
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.md,
    paddingHorizontal: theme.spacing.xl,
  },
});
