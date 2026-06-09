import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../../lib/api';
import { type ContactTag, type ContactTagsResponse } from '../../lib/contacts';
import { formatError } from '../../lib/errors';
import { theme } from '../../theme';
import { BottomSheet } from '../BottomSheet';
import { FormFieldLabel } from './FormFieldLabel';

export function ContactTagsField({
  token,
  locationId,
  selected,
  onChange,
}: {
  token: string | null;
  locationId: string | null;
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
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
    if (!open) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadTags();
  }, [open, loadTags]);

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
      <FormFieldLabel label="Tags" />
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        {selected.length === 0 ? (
          <Text style={styles.placeholder}>Add tags</Text>
        ) : (
          <View style={styles.chips}>
            {selected.map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText}>{tag}</Text>
                <Pressable onPress={() => removeTag(tag)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={theme.colors.mutedTextOnDark} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Ionicons name="chevron-down" size={18} color={theme.colors.mutedTextOnDark} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Select tags">
        {loading ? (
          <ActivityIndicator color={theme.colors.link} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : available.length === 0 ? (
          <Text style={styles.empty}>No tags in this location. Create tags in GHL first.</Text>
        ) : (
          available.map((tag) => {
            const active = selected.some((t) => t.toLowerCase() === tag.name.toLowerCase());
            return (
              <Pressable
                key={tag.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => toggleTag(tag.name)}
              >
                <Text style={styles.rowText}>{tag.name}</Text>
                {active ? <Ionicons name="checkmark" size={18} color={theme.colors.link} /> : null}
              </Pressable>
            );
          })
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
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
  placeholder: {
    flex: 1,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  loader: { marginVertical: theme.spacing.lg },
  error: {
    color: '#FCA5A5',
    fontFamily: theme.typography.fontFamily.regular,
    padding: theme.spacing.md,
  },
  empty: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    padding: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowActive: { backgroundColor: 'rgba(96, 165, 250, 0.08)' },
  rowText: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
});
