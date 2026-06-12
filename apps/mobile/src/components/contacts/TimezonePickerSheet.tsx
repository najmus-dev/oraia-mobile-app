import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { ContactSearchBar } from './ContactSearchBar';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import {
  ALL_TIMEZONES,
  RECOMMENDED_TIMEZONES,
  type TimezoneOption,
} from '../../lib/contactTimezones';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
};

export function TimezonePickerSheet({ visible, onClose, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_TIMEZONES;
    return ALL_TIMEZONES.filter(
      (tz) => tz.id.toLowerCase().includes(q) || tz.label.toLowerCase().includes(q),
    );
  }, [query]);

  function renderOption(item: TimezoneOption, selected: boolean) {
    return (
      <Pressable
        key={item.id}
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
      >
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {item.subtitle ? <Text style={styles.rowSub}>{item.subtitle}</Text> : null}
        </View>
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selected ? theme.colors.link : theme.colors.foregroundMuted}
        />
      </Pressable>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Time zone">
      <ContactSearchBar value={query} onChangeText={setQuery} placeholder="Search Timezone" />
      <FlatList
        data={filteredAll}
        keyExtractor={(item) => item.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          query.trim() ? null : (
            <View>
              <Text style={styles.section}>Recommended Timezones</Text>
              {RECOMMENDED_TIMEZONES.map((item) => renderOption(item, item.id === selectedId))}
              <Text style={styles.section}>All Timezones</Text>
            </View>
          )
        }
        renderItem={({ item }) => renderOption(item, item.id === selectedId)}
      />
    </BottomSheet>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  list: { maxHeight: 460, marginTop: theme.spacing.md },
  section: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
    marginBottom: theme.spacing.xs,
  },
  rowSelected: {
    borderWidth: 1,
    borderColor: `${theme.colors.primary}73`,
    backgroundColor: 'rgba(47, 45, 121, 0.25)',
  },
  rowBody: { flex: 1 },
  rowLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  rowSub: {
    marginTop: 2,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
});
}
