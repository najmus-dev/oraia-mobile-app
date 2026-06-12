import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import {
  type MessageChannel,
  type SmsPhoneNumber,
  channelPlaceholder,
} from '../../lib/conversations';
import { fetchSmsPhoneNumbers } from '../../lib/conversationsApi';
import { smsSegmentInfo } from '../../lib/messageFormat';
import { useDebouncedEffect } from '../../lib/useDebouncedEffect';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import type { ApiAuth } from '../../lib/api';

type Props = {
  auth: ApiAuth;
  channel: MessageChannel;
  onChannelChange: (channel: MessageChannel) => void;
  draft: string;
  onDraftChange: (text: string) => void;
  emailSubject: string;
  onEmailSubjectChange: (text: string) => void;
  fromNumber: string | null;
  onFromNumberChange: (phone: string | null) => void;
  canSend: boolean;
  sendBlockedReason?: string;
  sending: boolean;
  attachmentUrls: string[];
  attaching?: boolean;
  onAttachPhoto?: () => void;
  onRemoveAttachment?: (url: string) => void;
  onSend: () => void;
  bottomInset?: number;
  availableChannels: MessageChannel[];
};

function formatFromLabel(phone: string | null): string {
  if (!phone?.trim()) return 'Select number';
  const p = phone.trim();
  return p.length > 14 ? `${p.slice(0, 14)}…` : p;
}

export function ThreadComposer({
  auth,
  channel,
  onChannelChange,
  draft,
  onDraftChange,
  emailSubject,
  onEmailSubjectChange,
  fromNumber,
  onFromNumberChange,
  canSend,
  sendBlockedReason,
  sending,
  attachmentUrls,
  attaching,
  onAttachPhoto,
  onRemoveAttachment,
  onSend,
  bottomInset = 0,
  availableChannels,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [channelSheetOpen, setChannelSheetOpen] = useState(false);
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [debouncedPhoneSearch, setDebouncedPhoneSearch] = useState('');
  const [phones, setPhones] = useState<SmsPhoneNumber[]>([]);
  const [phonesLoading, setPhonesLoading] = useState(false);
  const fromNumberRef = useRef(fromNumber);
  fromNumberRef.current = fromNumber;
  const onFromNumberChangeRef = useRef(onFromNumberChange);
  onFromNumberChangeRef.current = onFromNumberChange;
  const phoneFetchSeq = useRef(0);
  const authToken = auth.token;
  const authLocationId = auth.locationId;

  const smsInfo = channel === 'SMS' ? smsSegmentInfo(draft) : null;
  const hasContent = draft.trim().length > 0 || attachmentUrls.length > 0;
  const sendDisabled = sending || attaching || !hasContent || !canSend;
  const attachDisabled = channel !== 'SMS' || !canSend || attaching || attachmentUrls.length >= 5;
  const channelOptions =
    availableChannels.length > 0 ? availableChannels : (['SMS'] as MessageChannel[]);
  const channelSelectable = channelOptions.length > 1;

  useDebouncedEffect(() => setDebouncedPhoneSearch(phoneSearch.trim()), [phoneSearch], 350);

  useEffect(() => {
    if (channel !== 'SMS' || !authToken || !authLocationId) return;
    let alive = true;
    (async () => {
      try {
        const list = await fetchSmsPhoneNumbers({ token: authToken, locationId: authLocationId }, '');
        if (!alive) return;
        if (!fromNumberRef.current && list.length > 0) {
          const preferred = list.find((n) => n.isDefault) ?? list[0];
          onFromNumberChangeRef.current(preferred.phoneNumber);
        }
      } catch {
        /* default number optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, [channel, authToken, authLocationId]);

  useEffect(() => {
    if (!phoneSheetOpen || !authToken || !authLocationId) return;
    const seq = ++phoneFetchSeq.current;
    const showBlockingLoader = phones.length === 0;
    if (showBlockingLoader) setPhonesLoading(true);
    let alive = true;
    (async () => {
      try {
        const list = await fetchSmsPhoneNumbers(
          { token: authToken, locationId: authLocationId },
          debouncedPhoneSearch,
        );
        if (!alive || seq !== phoneFetchSeq.current) return;
        setPhones(list);
      } catch {
        if (alive && seq === phoneFetchSeq.current) setPhones([]);
      } finally {
        if (alive && seq === phoneFetchSeq.current) setPhonesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when sheet/search/auth changes
  }, [phoneSheetOpen, debouncedPhoneSearch, authToken, authLocationId]);

  function closePhoneSheet() {
    setPhoneSheetOpen(false);
    setPhoneSearch('');
    setDebouncedPhoneSearch('');
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, theme.spacing.md) }]}>
      <View style={styles.metaRow}>
        <Pressable
          style={[styles.channelPill, !channelSelectable && styles.channelPillStatic]}
          onPress={() => channelSelectable && setChannelSheetOpen(true)}
          disabled={!channelSelectable}
          accessibilityState={{ disabled: !channelSelectable }}
        >
          <Ionicons
            name={channel === 'SMS' ? 'chatbubble-outline' : 'mail-outline'}
            size={16}
            color={theme.colors.link}
          />
          <Text style={styles.channelPillText}>{channel}</Text>
          {channelSelectable ? (
            <Ionicons name="chevron-down" size={14} color={theme.colors.foregroundMuted} />
          ) : null}
        </Pressable>
        {channel === 'SMS' ? (
          <Pressable style={styles.fromPill} onPress={() => setPhoneSheetOpen(true)}>
            <Ionicons name="call-outline" size={14} color={theme.colors.foregroundMuted} />
            <Text style={styles.fromPillText} numberOfLines={1}>
              {formatFromLabel(fromNumber)}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {channel === 'Email' ? (
        <TextInput
          value={emailSubject}
          onChangeText={onEmailSubjectChange}
          placeholder="Subject"
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={styles.subjectInput}
          editable={canSend}
        />
      ) : null}

      <TextInput
        value={draft}
        onChangeText={onDraftChange}
        placeholder={
          canSend
            ? channelPlaceholder(channel)
            : sendBlockedReason ?? 'Cannot send without a contact'
        }
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={styles.input}
        multiline
        maxLength={channel === 'SMS' ? 1600 : 8000}
        editable={canSend}
      />

      {attachmentUrls.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachRow}>
          {attachmentUrls.map((url) => (
            <View key={url} style={styles.attachThumbWrap}>
              <Image source={{ uri: url }} style={styles.attachThumb} />
              {onRemoveAttachment ? (
                <Pressable style={styles.attachRemove} onPress={() => onRemoveAttachment(url)}>
                  <Ionicons name="close" size={14} color={theme.colors.white} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {sendBlockedReason && !canSend ? (
        <Text style={styles.blockedHint}>{sendBlockedReason}</Text>
      ) : null}

      <View style={styles.footer}>
        {channel === 'SMS' && onAttachPhoto ? (
          <Pressable
            style={[styles.attachBtn, attachDisabled && styles.attachBtnDisabled]}
            onPress={onAttachPhoto}
            disabled={attachDisabled}
            accessibilityLabel="Attach photo"
          >
            {attaching ? (
              <ActivityIndicator color={theme.colors.link} size="small" />
            ) : (
              <Ionicons name="image-outline" size={22} color={theme.colors.link} />
            )}
          </Pressable>
        ) : null}
        {smsInfo && draft.length > 0 ? (
          <Text style={styles.counter}>
            {smsInfo.length} chars · {smsInfo.segments} segment{smsInfo.segments === 1 ? '' : 's'}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          onPress={onSend}
          disabled={sendDisabled}
          style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
          accessibilityLabel="Send message"
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.sendLabel}>Send</Text>
              <Ionicons name="send" size={16} color={theme.colors.white} />
            </>
          )}
        </Pressable>
      </View>

      <BottomSheet visible={channelSheetOpen} onClose={() => setChannelSheetOpen(false)} title="Send via">
        {channelOptions.map((ch) => (
          <Pressable
            key={ch}
            style={[styles.sheetRow, channel === ch && styles.sheetRowActive]}
            onPress={() => {
              onChannelChange(ch);
              setChannelSheetOpen(false);
            }}
          >
            <Ionicons
              name={ch === 'SMS' ? 'chatbubble-outline' : 'mail-outline'}
              size={20}
              color={theme.colors.link}
            />
            <Text style={styles.sheetRowText}>{ch}</Text>
            {channel === ch ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={phoneSheetOpen} onClose={closePhoneSheet}>
        <View style={styles.phoneHeader}>
          <Text style={styles.phoneTitle}>From number</Text>
          <Pressable onPress={closePhoneSheet}>
            <Text style={styles.phoneDone}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.phoneSearch}>
          <Ionicons name="search" size={16} color={theme.colors.foregroundMuted} />
          <TextInput
            value={phoneSearch}
            onChangeText={setPhoneSearch}
            placeholder="Search numbers"
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={styles.phoneSearchInput}
          />
        </View>
        {phonesLoading ? (
          <ActivityIndicator color={theme.colors.secondary} style={{ marginVertical: theme.spacing.lg }} />
        ) : phones.length === 0 ? (
          <Text style={styles.phoneEmpty}>
            No SMS numbers for this location. Configure numbers in GHL → Phone System.
          </Text>
        ) : (
          phones.map((n) => {
            const selected = fromNumber === n.phoneNumber;
            return (
              <Pressable
                key={n.id}
                style={[styles.phoneRow, selected && styles.phoneRowSelected]}
                onPress={() => {
                  onFromNumberChange(n.phoneNumber);
                  closePhoneSheet();
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.phoneNum}>{n.phoneNumber}</Text>
                  {n.isDefault ? <Text style={styles.phoneBadge}>Default</Text> : null}
                  {n.assignedTo || n.label ? (
                    <Text style={styles.phoneMeta}>{n.label ?? n.assignedTo}</Text>
                  ) : null}
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selected ? theme.colors.link : theme.colors.foregroundMuted}
                />
              </Pressable>
            );
          })
        )}
      </BottomSheet>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  const linkTint = `${theme.colors.link}14`;

  return StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  channelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  channelPillStatic: { opacity: 0.92 },
  channelPillText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  fromPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 0,
  },
  fromPillText: {
    flex: 1,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  subjectInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    paddingVertical: theme.spacing.sm,
  },
  blockedHint: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  attachRow: { marginBottom: theme.spacing.sm },
  attachThumbWrap: { marginRight: theme.spacing.sm, position: 'relative' },
  attachThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.surfaceMuted },
  attachRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnDisabled: { opacity: 0.4 },
  counter: {
    flex: 1,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    minWidth: 88,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendLabel: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  sheetRowActive: { borderColor: theme.colors.link, backgroundColor: linkTint },
  sheetRowText: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  phoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  phoneTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg,
  },
  phoneDone: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  phoneSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  phoneSearchInput: {
    flex: 1,
    color: theme.colors.foreground,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.regular,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  phoneRowSelected: { borderColor: theme.colors.link },
  phoneNum: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  phoneBadge: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginTop: 2,
  },
  phoneMeta: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    marginTop: 2,
  },
  phoneEmpty: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
    lineHeight: theme.typography.lineHeight.md,
  },
  });
}
