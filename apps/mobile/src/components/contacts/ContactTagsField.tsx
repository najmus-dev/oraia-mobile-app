import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../../lib/api';
import { type ContactTag, type ContactTagsResponse } from '../../lib/contacts';
import { formatError } from '../../lib/errors';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { BottomSheet } from '../BottomSheet';
import { ContactSearchBar } from './ContactSearchBar';
import { FormFieldLabel } from './FormFieldLabel';

const INLINE_TAG_CAP = 3;
const TAG_LIST_MAX_HEIGHT = 420;

export function ContactTagsField({
  token,
  locationId,
  selected,
  onChange,
  label = 'Tags',
  hint,
}: {
  token: string | null;
  locationId: string | null;
  selected: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<ContactTag[]>([]);

  const loadTags = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getJson<ContactTagsResponse>('/api/contacts/tags', {
        headers: withAuthHeaders({ token, locationId }),
      });
      setAvailable(res.tags ?? []);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [token, locationId]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadTags();
  }, [open, loadTags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [available, query]);

  const showCompact = selected.length > INLINE_TAG_CAP;
  const inlineTags = showCompact ? selected.slice(0, INLINE_TAG_CAP) : selected;

  function toggleTag(name: string) {
    const normalized = name.trim();
    if (!normalized) return;
    if (selected.some((t) => t.toLowerCase() === normalized.toLowerCase())) {
      onChange(selected.filter((t) => t.toLowerCase() !== normalized.toLowerCase()));
    } else {
      onChange([...selected, normalized]);
    }
  }

  function removeTag(name: string) {
    onChange(selected.filter((t) => t !== name));
  }

  return (
    <View style={styles.wrap}>
      <FormFieldLabel label={label} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <View style={styles.fieldBody}>
          {selected.length === 0 ? (
            <Text style={styles.placeholder}>Add tags</Text>
          ) : showCompact ? (
            <Text style={styles.summary} numberOfLines={2}>
              {selected.length} tags selected
            </Text>
          ) : (
            <View style={styles.chips}>
              {inlineTags.map((tag) => (
                <View key={tag} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {tag}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={14} color={theme.colors.foregroundMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.colors.foregroundMuted} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Select tags">
        <ContactSearchBar value={query} onChangeText={setQuery} placeholder="Search tags" />
        {loading ? (
          <ActivityIndicator color={theme.colors.link} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : available.length === 0 ? (
          <Text style={styles.empty}>No tags in this location. Create tags in GHL first.</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>No tags match your search.</Text>
            }
            renderItem={({ item }) => {
              const active = selected.some((t) => t.toLowerCase() === item.name.toLowerCase());
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => toggleTag(item.name)}
                >
                  <Text style={styles.rowText} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
                </Pressable>
              );
            }}
          />
        )}
      </BottomSheet>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    hint: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
      marginTop: -2,
    },
    field: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 48,
    },
    fieldBody: {
      flex: 1,
      minWidth: 0,
    },
    placeholder: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.md,
    },
    summary: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      maxHeight: 72,
      overflow: 'hidden',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '100%',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    chipText: {
      flexShrink: 1,
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
    },
    list: {
      maxHeight: TAG_LIST_MAX_HEIGHT,
      marginTop: theme.spacing.md,
    },
    loader: { marginVertical: theme.spacing.lg },
    error: {
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily.regular,
      padding: theme.spacing.md,
    },
    empty: {
      color: theme.colors.foregroundMuted,
      fontFamily: theme.typography.fontFamily.regular,
      padding: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowActive: { backgroundColor: `${theme.colors.primary}14` },
    rowText: {
      flex: 1,
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    },
  });
}
