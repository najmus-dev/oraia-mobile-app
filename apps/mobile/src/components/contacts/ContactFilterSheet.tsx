import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { ContactSearchBar } from './ContactSearchBar';
import { theme } from '../../theme';
import type { ContactSmartList } from '../../lib/contacts';

type Props = {
  visible: boolean;
  onClose: () => void;
  lists: ContactSmartList[];
  selectedId: string;
  onSelect: (id: string, label: string) => void;
};

export function ContactFilterSheet({ visible, onClose, lists, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((item) => item.name.toLowerCase().includes(q));
  }, [lists, query]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ContactSearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search smart lists"
      />
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(item.id, item.name);
                onClose();
              }}
            >
              <Text style={styles.rowLabel}>{item.name}</Text>
              {selected ? (
                <Ionicons name="checkmark" size={20} color={theme.colors.link} />
              ) : null}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 420,
    marginTop: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
});
