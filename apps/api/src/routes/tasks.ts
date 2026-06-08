import { Router } from 'express';
import { AppError } from '../lib/errors';
import { param } from '../lib/params';
import { mapGhlTask, mapGhlTasks, ghlTaskId } from '../lib/taskMapping';
import { enrichTaskContext, userDisplayName } from '../lib/taskEnrichment';
import { validateTaskWriteBody } from '../lib/taskValidation';
import { locationDelete, locationGet, locationPost, locationPut } from '../middleware/locationRoute';
import { config } from '../config';
import { getLocationGhlClient } from '../services/tokenVault';
import type { GhlClient } from '../services/ghl/ghlClient';
import type { GhlTask } from '../services/ghl/types';

export const tasksRouter = Router();

function parseTaskBody(body: unknown, partial = false) {
  try {
    return validateTaskWriteBody(body, partial);
  } catch (e) {
    throw new AppError(400, e instanceof Error ? e.message : 'Invalid task', 'VALIDATION_ERROR');
  }
}

type TaskSearchBody = {
  contactId?: string[];
  completed?: boolean;
  assignedTo?: string[];
  query?: string;
  limit?: number;
  skip?: number;
};

async function searchAllLocationTasks(
  ghl: GhlClient,
  locationId: string,
  searchBody: TaskSearchBody,
): Promise<GhlTask[]> {
  const pageSize = Math.min(searchBody.limit ?? 100, 100);
  const all: GhlTask[] = [];
  let skip = searchBody.skip ?? 0;

  for (let page = 0; page < 10; page += 1) {
    const data = await ghl.searchLocationTasks(locationId, {
      ...searchBody,
      limit: pageSize,
      skip,
    });
    const batch = data.tasks ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    skip += batch.length;
  }

  return all;
}

function requireGhlTask(raw: GhlTask | undefined, action: string): GhlTask {
  if (!raw || !ghlTaskId(raw)) {
    throw new AppError(502, `Task ${action} returned no task`, 'UPSTREAM_ERROR');
  }
  return raw;
}

locationPost(tasksRouter, '/search', async (req, res) => {
  const locationId = req.locationId!;
  const body = req.body as Record<string, unknown>;
  const ghl = getLocationGhlClient(locationId);

  const searchBody: TaskSearchBody = {
    limit: Math.min(Number(body.limit) || 50, 100),
    skip: Number(body.skip) || 0,
  };

  if (typeof body.query === 'string' && body.query.trim()) {
    searchBody.query = body.query.trim();
  }
  if (typeof body.completed === 'boolean') {
    searchBody.completed = body.completed;
  }
  if (Array.isArray(body.contactId)) {
    searchBody.contactId = body.contactId.filter((x) => typeof x === 'string');
  }
  if (Array.isArray(body.assignedTo)) {
    searchBody.assignedTo = body.assignedTo.filter((x) => typeof x === 'string');
  }

  const rawTasks = await searchAllLocationTasks(ghl, locationId, searchBody);
  const { assigneeNames, contactNames } = await enrichTaskContext(locationId, rawTasks);
  const tasks = mapGhlTasks(rawTasks, assigneeNames, contactNames);

  res.json({ locationId, tasks });
});

locationGet(tasksRouter, '/assignees', async (req, res) => {
  const locationId = req.locationId!;
  const query = typeof req.query.query === 'string' ? req.query.query : undefined;
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.searchUsers({
    companyId: config.ghl.companyId,
    locationId,
    query,
    limit: Math.min(Number(req.query.limit) || 50, 100),
  });
  const users = (data.users ?? []).map((u) => ({
    id: u.id,
    name: userDisplayName(u),
    email: u.email,
  }));
  res.json({ locationId, users });
});

locationGet(tasksRouter, '/pending-count', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  const rawTasks = await searchAllLocationTasks(ghl, locationId, { completed: false, limit: 100 });
  const pending = rawTasks.filter((t) => !t.completed);
  res.json({ locationId, count: pending.length });
});

locationPost(tasksRouter, '/contacts/:contactId', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const payload = parseTaskBody(req.body);
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.createContactTask(contactId, payload);
  const task = requireGhlTask(data.task, 'create');
  const { assigneeNames, contactNames } = await enrichTaskContext(locationId, [task]);
  res.status(201).json({
    locationId,
    contactId,
    task: mapGhlTask(task, assigneeNames, contactNames),
  });
});

locationPut(tasksRouter, '/contacts/:contactId/:taskId', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const taskId = param(req.params, 'taskId');
  const payload = parseTaskBody(req.body, true);
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.updateContactTask(contactId, taskId, payload);
  const task = requireGhlTask(data.task, 'update');
  const { assigneeNames, contactNames } = await enrichTaskContext(locationId, [task]);
  res.json({
    locationId,
    contactId,
    task: mapGhlTask(task, assigneeNames, contactNames),
  });
});

locationPut(tasksRouter, '/contacts/:contactId/:taskId/completed', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const taskId = param(req.params, 'taskId');
  const completed = Boolean((req.body as { completed?: boolean }).completed);
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.updateContactTaskCompleted(contactId, taskId, completed);
  const task = requireGhlTask(data.task, 'status update');
  const { assigneeNames, contactNames } = await enrichTaskContext(locationId, [task]);
  res.json({
    locationId,
    contactId,
    task: mapGhlTask(task, assigneeNames, contactNames),
  });
});

locationDelete(tasksRouter, '/contacts/:contactId/:taskId', async (req, res) => {
  const locationId = req.locationId!;
  const contactId = param(req.params, 'contactId');
  const taskId = param(req.params, 'taskId');
  const ghl = getLocationGhlClient(locationId);
  await ghl.deleteContactTask(contactId, taskId);
  res.status(204).send();
});
