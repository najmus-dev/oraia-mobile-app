import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { type AssigneesResponse, type TaskAssignee } from '../lib/tasks';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { ErrorBanner } from '../components/ErrorBanner';
import { ListBusyState } from '../components/ListBusyState';
import { returnToScreen } from '../lib/stackNavigation';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'SelectAssignees'>;

export function SelectAssigneesScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const listBottom = useFullScreenBottomInset();
  const { token, locationId } = useAppState();
  const { mode, selectedIds, returnTo } = route.params;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<TaskAssignee[]>([]);
  const [selected, setSelected] = useState<string[]>(selectedIds ?? []);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const qs = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
      const res = await api.getJson<AssigneesResponse>(`/api/tasks/assignees${qs}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      setUsers(res.users ?? []);
    } catch (e) {
      setLoadError(formatError(e));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, locationId, query]);

  useEffect(() => {
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      load();
    }, 200);
    return () => clearTimeout(t);
  }, [load]);

  const rows = useMemo(() => {
    const base: TaskAssignee[] = [{ id: '', name: 'Unassigned' }, ...users];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

  function toggle(id: string) {
    if (mode === 'single') {
      const name = id ? users.find((u) => u.id === id)?.name ?? 'Assignee' : 'Unassigned';
      if (returnTo === 'TaskForm') {
        returnToScreen(navigation, 'TaskForm', { pickedAssignee: { id, name } });
        return;
      }
      if (returnTo === 'OpportunityForm') {
        returnToScreen(navigation, 'OpportunityForm', { pickedAssignee: { id, name } });
        return;
      }
      if (returnTo === 'ContactForm') {
        returnToScreen(navigation, 'ContactForm', { pickedAssignee: { id, name } });
        return;
      }
      if (returnTo === 'TaskFilters' && route.params.filters) {
        returnToScreen(navigation, 'TaskFilters', {
          filters: route.params.filters,
          pickedAssigneeIds: id ? [id] : [],
        });
        return;
      }
      setSelected(id ? [id] : []);
      return;
    }

    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function applyMulti() {
    if (returnTo === 'TaskFilters' && route.params.filters) {
      returnToScreen(navigation, 'TaskFilters', {
        filters: route.params.filters,
        pickedAssigneeIds: selected,
      });
      return;
    }
    if (returnTo === 'OpportunityForm') {
      returnToScreen(navigation, 'OpportunityForm', { pickedFollowerIds: selected });
      return;
    }
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <AppBar title="Select Assignees" onBack={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search assignee"
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loadError ? (
        <ErrorBanner message={loadError} onRetry={load} onDismiss={() => setLoadError(null)} />
      ) : null}

      {loading ? (
        <ListBusyState message="Loading assignees…" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id || '__unassigned__'}
          contentContainerStyle={{ paddingBottom: listBottom }}
          ListEmptyComponent={
            !loadError ? (
              <Text style={styles.empty}>No assignees found for this location.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const checked = mode === 'multi' ? selected.includes(item.id) : false;
            const isCurrentSingle =
              mode === 'single' &&
              (returnTo === 'TaskForm' ||
                returnTo === 'OpportunityForm' ||
                returnTo === 'ContactForm') &&
              selectedIds?.includes(item.id);
            return (
              <Pressable style={styles.row} onPress={() => toggle(item.id)}>
                {mode === 'multi' ? (
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <Ionicons name="checkmark" size={14} color={theme.colors.white} /> : null}
                  </View>
                ) : (
                  <Ionicons
                    name={isCurrentSingle ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isCurrentSingle ? theme.colors.link : theme.colors.foregroundMuted}
                  />
                )}
                <Text style={styles.name}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      )}

      {mode === 'multi' ? (
        <View style={styles.footer}>
          <Pressable style={styles.applyBtn} onPress={applyMulti}>
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    paddingVertical: 0,
  },
  empty: {
    marginTop: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
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
  name: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  applyBtn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.link,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 12,
  },
  applyText: {
    color: theme.colors.navy,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
}
