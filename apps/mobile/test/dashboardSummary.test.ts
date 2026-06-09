import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  clearDashboardCache,
  readDashboardCache,
  writeDashboardCache,
} from '../src/lib/dashboardSummaryCache';

describe('dashboardSummary cache', () => {
  beforeEach(() => {
    clearDashboardCache();
  });

  it('returns cached summary for matching location and day', () => {
    writeDashboardCache(
      'loc_1',
      {
        todayEvents: [],
        todayAppointmentCount: 2,
        unreadCount: 5,
        pipelineValue: 100,
        pendingTasks: 3,
      },
      '2026-06-09',
    );
    const cached = readDashboardCache('loc_1', '2026-06-09');
    assert.equal(cached?.unreadCount, 5);
    assert.equal(cached?.pendingTasks, 3);
  });

  it('misses when location or day differs', () => {
    writeDashboardCache(
      'loc_1',
      {
        todayEvents: [],
        todayAppointmentCount: 0,
        unreadCount: 1,
        pipelineValue: 0,
        pendingTasks: 0,
      },
      '2026-06-09',
    );
    assert.equal(readDashboardCache('loc_2', '2026-06-09'), null);
    assert.equal(readDashboardCache('loc_1', '2026-06-10'), null);
  });
});
