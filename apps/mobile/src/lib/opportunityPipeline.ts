import type { Opportunity, PipelineStage } from './opportunities';

export type OpportunitySortField = 'dateAdded' | 'monetaryValue';
export type OpportunitySortOrder = 'asc' | 'desc';

export type StageStats = {
  count: number;
  totalValue: number;
};

export function filterOpportunitiesByQuery(list: Opportunity[], query: string): Opportunity[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((o) => {
    const hay = [o.name, o.status, o.contactId, o.source].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export function filterOpportunitiesByStatus(list: Opportunity[], status: string | null): Opportunity[] {
  if (!status) return list;
  const target = status.toLowerCase();
  return list.filter((o) => (o.status ?? 'open').toLowerCase() === target);
}

export function sortOpportunities(
  list: Opportunity[],
  field: OpportunitySortField,
  order: OpportunitySortOrder,
): Opportunity[] {
  const dir = order === 'asc' ? 1 : -1;
  return list.slice().sort((a, b) => {
    if (field === 'monetaryValue') {
      return ((a.monetaryValue ?? 0) - (b.monetaryValue ?? 0)) * dir;
    }
    const ta = new Date(a.dateAdded ?? 0).getTime();
    const tb = new Date(b.dateAdded ?? 0).getTime();
    return (ta - tb) * dir;
  });
}

export function groupOpportunitiesByStage(
  opportunities: Opportunity[],
  stages: PipelineStage[],
): Map<string, Opportunity[]> {
  const map = new Map<string, Opportunity[]>();
  for (const stage of stages) map.set(stage.id, []);
  const unassigned: Opportunity[] = [];
  for (const opp of opportunities) {
    const stageId = opp.pipelineStageId;
    if (stageId && map.has(stageId)) {
      map.get(stageId)!.push(opp);
    } else {
      unassigned.push(opp);
    }
  }
  if (unassigned.length && stages[0]) {
    map.get(stages[0].id)!.push(...unassigned);
  }
  return map;
}

export function computeStageStats(items: Opportunity[]): StageStats {
  return {
    count: items.length,
    totalValue: items.reduce((sum, o) => sum + (o.monetaryValue ?? 0), 0),
  };
}
