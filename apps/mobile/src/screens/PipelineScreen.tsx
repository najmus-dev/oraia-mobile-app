import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { formatError } from '../lib/errors';
import { FAB_LIST_PADDING_BOTTOM } from '../lib/fabLayout';
import {
  type Opportunity,
  type Pipeline,
  OPPORTUNITY_STATUS_OPTIONS,
} from '../lib/opportunities';
import {
  filterOpportunitiesByQuery,
  filterOpportunitiesByStatus,
  groupOpportunitiesByStage,
  sortOpportunities,
  type OpportunitySortField,
  type OpportunitySortOrder,
} from '../lib/opportunityPipeline';
import { theme } from '../theme';
import { useAppState } from '../state/AppState';
import { AppBar } from '../components/AppBar';
import { BottomSheet } from '../components/BottomSheet';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { ListBusyState } from '../components/ListBusyState';
import { OpportunityFilterBar } from '../components/opportunities/OpportunityFilterBar';
import { OpportunityKanbanColumn } from '../components/opportunities/OpportunityKanbanColumn';
import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'PipelineHome'>;

export function PipelineScreen({ navigation }: Props) {
  const { token, locationId } = useAppState();
  const [pipelinesLoading, setPipelinesLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsRefreshing, setDealsRefreshing] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState('');
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<OpportunitySortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<OpportunitySortOrder>('desc');
  const [pipelineSheetOpen, setPipelineSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activePipeline = useMemo(
    () => pipelines.find((p) => p.id === pipelineId),
    [pipelines, pipelineId],
  );
  const stages = useMemo(() => activePipeline?.stages ?? [], [activePipeline]);

  const loadPipelines = useCallback(async () => {
    if (!token || !locationId) return;
    setPipelinesLoading(true);
    try {
      const res = await api.getJson<{ pipelines: Pipeline[] }>('/api/opportunities/pipelines', {
        headers: withAuthHeaders({ token, locationId }),
      });
      const list = res.pipelines ?? [];
      setPipelines(list);
      setPipelineId((prev) => prev || list[0]?.id || '');
    } catch (e) {
      Alert.alert('Pipelines', formatError(e));
    } finally {
      setPipelinesLoading(false);
    }
  }, [token, locationId]);

  const loadDeals = useCallback(
    async (pull = false) => {
      if (!token || !locationId || !pipelineId) return;
      if (pull) setDealsRefreshing(true);
      else setDealsLoading(true);
      try {
        const statusQs = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : '';
        const res = await api.getJson<{ opportunities: Opportunity[] }>(
          `/api/opportunities?limit=100&pipelineId=${encodeURIComponent(pipelineId)}${statusQs}`,
          { headers: withAuthHeaders({ token, locationId }) },
        );
        setDeals(res.opportunities ?? []);
      } catch (e) {
        Alert.alert('Opportunities', formatError(e));
      } finally {
        setDealsLoading(false);
        setDealsRefreshing(false);
      }
    },
    [token, locationId, pipelineId, statusFilter],
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadDeals();
  }, [loadDeals]);

  const visibleDeals = useMemo(() => {
    let list = filterOpportunitiesByQuery(deals, query);
    if (statusFilter) list = filterOpportunitiesByStatus(list, statusFilter);
    return sortOpportunities(list, sortField, sortOrder);
  }, [deals, query, statusFilter, sortField, sortOrder]);

  const dealsByStage = useMemo(
    () => groupOpportunitiesByStage(visibleDeals, stages),
    [visibleDeals, stages],
  );

  const filterCount = statusFilter ? 1 : 0;
  const sortLabel = sortField === 'monetaryValue' ? 'Deal Value' : 'Date Added';

  function openCreate(stageId?: string) {
    navigation.navigate('PickContact', {
      flow: 'opportunity',
      pipelineId: pipelineId || undefined,
      pipelineStageId: stageId,
    });
  }

  return (
    <View style={styles.container}>
      <AppBar
        title="Opportunities"
        onRefresh={() => loadDeals(true)}
        onSettings={() =>
          Alert.alert('Pipeline settings', 'Manage pipelines and stages in GHL → Opportunities.')
        }
      />

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.mutedTextOnDark} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Opportunities"
          placeholderTextColor={theme.colors.mutedTextOnDark}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={theme.colors.mutedTextOnDark} />
          </Pressable>
        ) : null}
      </View>

      <OpportunityFilterBar
        pipelineName={activePipeline?.name ?? 'Pipeline'}
        filterCount={filterCount}
        sortLabel={sortLabel}
        onPipelinePress={() => setPipelineSheetOpen(true)}
        onFiltersPress={() => setFilterSheetOpen(true)}
        onSortPress={() => setSortSheetOpen(true)}
      />

      {pipelinesLoading ? (
        <ListBusyState blocking message="Loading pipelines…" />
      ) : pipelines.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No pipelines"
            subtitle="Install the app on this sub-account or configure pipelines in GHL."
          />
        </View>
      ) : dealsLoading && deals.length === 0 ? (
        <ListBusyState blocking message="Loading opportunities…" />
      ) : stages.length === 0 ? (
        <View style={styles.center}>
          <EmptyState title="No stages" subtitle="Add stages to this pipeline in GHL." />
        </View>
      ) : (
        <ScrollView
          horizontal
          style={styles.board}
          contentContainerStyle={[styles.boardContent, { paddingBottom: FAB_LIST_PADDING_BOTTOM }]}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
        >
          {stages.map((stage) => (
            <OpportunityKanbanColumn
              key={stage.id}
              stageName={stage.name}
              opportunities={dealsByStage.get(stage.id) ?? []}
              onCreate={() => openCreate(stage.id)}
              onOpen={(opp) =>
                navigation.navigate('OpportunityDetail', {
                  opportunityId: opp.id,
                  title: opp.name,
                })
              }
            />
          ))}
        </ScrollView>
      )}

      {dealsRefreshing ? (
        <View style={styles.refreshHint}>
          <Text style={styles.refreshHintText}>Refreshing…</Text>
        </View>
      ) : null}

      <FloatingActionButton
        onPress={() => openCreate(stages[0]?.id)}
        accessibilityLabel="Create opportunity"
      />

      <BottomSheet visible={pipelineSheetOpen} onClose={() => setPipelineSheetOpen(false)} title="Select Pipeline">
        {pipelines.map((p) => {
          const selected = p.id === pipelineId;
          return (
            <Pressable
              key={p.id}
              style={[styles.sheetRow, selected && styles.sheetRowActive]}
              onPress={() => {
                setPipelineId(p.id);
                setPipelineSheetOpen(false);
              }}
            >
              <Text style={styles.sheetRowText}>{p.name}</Text>
              {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.link} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>

      <BottomSheet visible={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort By">
        <Pressable
          style={styles.sortOrderPill}
          onPress={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={theme.colors.textOnDark}
          />
          <Text style={styles.sortOrderText}>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</Text>
        </Pressable>
        {(
          [
            { id: 'dateAdded' as const, label: 'Date Added' },
            { id: 'monetaryValue' as const, label: 'Deal Value' },
          ] as const
        ).map((opt) => {
          const selected = sortField === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.sheetRow, selected && styles.sheetRowActive]}
              onPress={() => {
                setSortField(opt.id);
                setSortSheetOpen(false);
              }}
            >
              <Text style={styles.sheetRowText}>{opt.label}</Text>
              {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.link} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>

      <BottomSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} title="Filters">
        <Text style={styles.filterSectionLabel}>Status</Text>
        <Pressable
          style={[styles.sheetRow, !statusFilter && styles.sheetRowActive]}
          onPress={() => {
            setStatusFilter(null);
            setFilterSheetOpen(false);
          }}
        >
          <Text style={styles.sheetRowText}>All statuses</Text>
          {!statusFilter ? <Ionicons name="checkmark" size={20} color={theme.colors.link} /> : null}
        </Pressable>
        {OPPORTUNITY_STATUS_OPTIONS.map((opt) => {
          const selected = statusFilter === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.sheetRow, selected && styles.sheetRowActive]}
              onPress={() => {
                setStatusFilter(opt.id);
                setFilterSheetOpen(false);
              }}
            >
              <Text style={styles.sheetRowText}>{opt.label}</Text>
              {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.link} /> : null}
            </Pressable>
          );
        })}
        <Pressable style={styles.applyBtn} onPress={() => setFilterSheetOpen(false)}>
          <Text style={styles.applyBtnText}>Apply</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center' },
  search: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    paddingVertical: theme.spacing.md,
  },
  board: { flex: 1 },
  boardContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  refreshHint: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  refreshHintText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sheetRowActive: { backgroundColor: 'rgba(96, 165, 250, 0.06)' },
  sheetRowText: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  sortOrderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sortOrderText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  filterSectionLabel: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  applyBtn: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 10,
  },
  applyBtnText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
});
