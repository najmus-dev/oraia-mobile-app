import type { GhlClient } from '../services/ghl/ghlClient';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/** Counts incomplete tasks, stopping early when the final page is partial. */
export async function countPendingLocationTasks(
  ghl: GhlClient,
  locationId: string,
): Promise<number> {
  let count = 0;
  let skip = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await ghl.searchLocationTasks(locationId, {
      completed: false,
      limit: PAGE_SIZE,
      skip,
    });
    const batch = data.tasks ?? [];
    count += batch.filter((t) => !t.completed).length;
    if (batch.length < PAGE_SIZE) break;
    skip += batch.length;
  }

  return count;
}
