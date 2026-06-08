export type TaskWriteBody = {
  title: string;
  body?: string;
  dueDate: string;
  completed: boolean;
  assignedTo?: string;
};

export function validateTaskWriteBody(body: unknown, partial = false): TaskWriteBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid task payload');
  }
  const record = body as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const dueDate = typeof record.dueDate === 'string' ? record.dueDate.trim() : '';
  const taskBody = typeof record.body === 'string' ? record.body.trim() : undefined;
  const assignedTo = typeof record.assignedTo === 'string' ? record.assignedTo.trim() : undefined;
  const completed = typeof record.completed === 'boolean' ? record.completed : false;

  if (!partial) {
    if (!title) throw new Error('title is required');
    if (!dueDate) throw new Error('dueDate is required');
  }

  return {
    title,
    body: taskBody || undefined,
    dueDate,
    completed,
    assignedTo: assignedTo || undefined,
  };
}
