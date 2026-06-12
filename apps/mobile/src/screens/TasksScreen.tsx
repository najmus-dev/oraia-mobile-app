import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import { navigateToContactDetail } from '../lib/navigation';
import { FAB_LIST_PADDING_BOTTOM } from '../lib/fabLayout';
import { useHeaderTopPadding } from '../lib/safeArea';
import {
  type Task,
  type TaskFilters,
  type TasksSearchResponse,
  DEFAULT_TASK_FILTERS,
  activeFilterCount,
  buildTaskSearchBody,
  filterTasksByQuery,
  hasActiveTaskFilters,
  sortTasks,
} from '../lib/tasks';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { useAppState } from '../state/AppState';
import { ErrorBanner } from '../components/ErrorBanner';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { ListBusyState } from '../components/ListBusyState';
import { TaskActionSheet } from '../components/tasks/TaskActionSheet';
import { TaskFilterBar } from '../components/tasks/TaskFilterBar';
import { TaskListSummary } from '../components/tasks/TaskListSummary';
import { TaskRow } from '../components/tasks/TaskRow';
import { TasksEmptyState } from '../components/tasks/TasksEmptyState';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'TasksHome'>;

export function TasksScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = useHeaderTopPadding();
  const { token, locationId } = useAppState();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  useEffect(() => {
    const applied = route.params?.appliedFilters;
    if (applied) {
      setFilters(applied);
      navigation.setParams({ appliedFilters: undefined });
    }
  }, [route.params?.appliedFilters, navigation]);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (!token || !locationId) return;
    const isInitial = !hasLoadedRef.current;
    if (opts?.refresh || !isInitial) setRefreshing(true);
    else setInitialLoading(true);
    setLoadError(null);
    try {
      const res = await api.postJson<TasksSearchResponse>(
        '/api/tasks/search',
        buildTaskSearchBody(filters),
        { headers: withAuthHeaders({ token, locationId }) },
      );
      setTasks(res.tasks ?? []);
    } catch (e) {
      const message = formatError(e);
      setLoadError(message);
      if (isInitial) setTasks([]);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    }
  }, [token, locationId, filters]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (hasLoaded) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        load({ refresh: true });
      }
    }, [load, hasLoaded]),
  );

  const visibleTasks = useMemo(() => {
    const sorted = sortTasks(tasks, filters.sortField, filters.sortOrder);
    return filterTasksByQuery(sorted, query);
  }, [tasks, filters.sortField, filters.sortOrder, query]);

  const filterBadge = activeFilterCount(filters);
  const showBlockingLoad = initialLoading && !hasLoaded;

  const emptySubtitle = loadError
    ? undefined
    : query.trim()
      ? 'Try a different search term.'
      : hasActiveTaskFilters(filters)
        ? 'No tasks match the current filters.'
        : 'Add a task to get started with follow-ups and reminders.';

  function openTaskActions(task: Task) {
    setSelectedTask(task);
    setActionOpen(true);
  }

  async function toggleComplete() {
    if (!selectedTask?.contactId || !token || !locationId) {
      Alert.alert('Task', 'This task has no linked contact and cannot be updated.');
      return;
    }
    const task = selectedTask;
    setActionOpen(false);
    const nextCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t)),
    );
    try {
      await api.putJson(
        `/api/tasks/contacts/${task.contactId}/${task.id}/completed`,
        { completed: nextCompleted },
        { headers: withAuthHeaders({ token, locationId }) },
      );
    } catch (e) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t)),
      );
      Alert.alert('Task', formatError(e));
    } finally {
      setSelectedTask(null);
    }
  }

  function editTask() {
    if (!selectedTask) return;
    setActionOpen(false);
    navigation.navigate('TaskForm', {
      taskId: selectedTask.id,
      contactId: selectedTask.contactId,
      initialTask: selectedTask,
    });
    setSelectedTask(null);
  }

  function viewContact() {
    if (!selectedTask?.contactId) return;
    setActionOpen(false);
    const contactId = selectedTask.contactId;
    setSelectedTask(null);
    navigateToContactDetail(navigation, contactId);
  }

  function confirmDelete() {
    if (!selectedTask?.contactId || !token || !locationId) {
      Alert.alert('Task', 'This task has no linked contact and cannot be deleted.');
      return;
    }
    const task = selectedTask;
    setActionOpen(false);
    Alert.alert('Delete task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          (async () => {
            try {
              await api.delete(`/api/tasks/contacts/${task.contactId}/${task.id}`, {
                headers: withAuthHeaders({ token, locationId }),
              });
              await load({ refresh: true });
            } catch (e) {
              Alert.alert('Delete task', formatError(e));
            } finally {
              setSelectedTask(null);
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topChrome}>
        <View style={[styles.header, { paddingTop }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerSide}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Task Manager</Text>
          <View style={styles.headerSideRight}>
            <Pressable
              onPress={() => navigation.navigate('TaskFilters', { filters })}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel="Filters"
            >
              <Ionicons name="funnel-outline" size={20} color={theme.colors.foreground} />
              {filterBadge > 0 ? <View style={styles.filterDot} /> : null}
            </Pressable>
            <Pressable
              onPress={() => setSearchOpen((v) => !v)}
              hitSlop={8}
              style={[styles.iconBtn, searchOpen && styles.iconBtnActive]}
              accessibilityLabel="Search tasks"
            >
              <Ionicons name="search" size={20} color={theme.colors.foreground} />
            </Pressable>
          </View>
        </View>

        {searchOpen ? (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={theme.colors.foregroundMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search tasks"
              placeholderTextColor={theme.colors.inputPlaceholder}
              style={styles.searchInput}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={theme.colors.foregroundMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <TaskFilterBar
          status={filters.status}
          sortOrder={filters.sortOrder}
          onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          onSortChange={(sortOrder) => setFilters((prev) => ({ ...prev, sortOrder }))}
        />

        {loadError ? (
          <ErrorBanner
            message={loadError}
            onRetry={() => load({ refresh: true })}
            onDismiss={() => setLoadError(null)}
          />
        ) : null}

        {!showBlockingLoad ? (
          <TaskListSummary
            count={visibleTasks.length}
            filters={filters}
            query={query}
            loading={refreshing}
          />
        ) : null}
      </View>

      <View style={styles.listPane}>
        {showBlockingLoad ? (
          <ListBusyState blocking message="Loading tasks…" />
        ) : (
          <FlatList
            style={styles.list}
            data={visibleTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TaskRow task={item} onPress={() => openTaskActions(item)} />}
            contentContainerStyle={
              visibleTasks.length === 0 ? styles.emptyContent : styles.listContent
            }
            ListEmptyComponent={
              <TasksEmptyState
                title={query.trim() ? 'No matching tasks' : 'No tasks'}
                subtitle={emptySubtitle}
                actionLabel={!query.trim() && !hasActiveTaskFilters(filters) ? 'Add task' : undefined}
                onAction={
                  !query.trim() && !hasActiveTaskFilters(filters)
                    ? () => navigation.navigate('TaskForm', { fresh: true })
                    : undefined
                }
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load({ refresh: true })}
                tintColor={theme.colors.link}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <FloatingActionButton
        accessibilityLabel="Add task"
        onPress={() => navigation.navigate('TaskForm', { fresh: true })}
      />

      <TaskActionSheet
        visible={actionOpen}
        task={selectedTask}
        onClose={() => {
          setActionOpen(false);
          setSelectedTask(null);
        }}
        onToggleComplete={toggleComplete}
        onEdit={editTask}
        onViewContact={viewContact}
        onDelete={confirmDelete}
      />
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topChrome: {
    flexShrink: 0,
  },
  listPane: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: theme.spacing.xs,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: FAB_LIST_PADDING_BOTTOM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerSide: { width: 40, alignItems: 'flex-start' },
  headerSideRight: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.lg,
  },
  iconBtn: { position: 'relative', borderRadius: 8, padding: 2 },
  iconBtnActive: {
    backgroundColor: `${theme.colors.primary}40`,
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
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
});
}
