export type Task = {
  id: string;
  title: string;
  body?: string;
  dueDate?: string;
  completed: boolean;
  contactId?: string;
  contactName?: string;
  assignedTo?: string;
  assigneeName?: string;
};

export type TaskAssignee = {
  id: string;
  name: string;
  email?: string;
};

export type TaskStatusFilter = 'all' | 'pending' | 'completed';

export type TaskSortField = 'dueDate';
export type TaskSortOrder = 'asc' | 'desc';

export type TaskFilters = {
  status: TaskStatusFilter;
  contactIds: string[];
  assigneeIds: string[];
  sortField: TaskSortField;
  sortOrder: TaskSortOrder;
};

export type TasksSearchResponse = {
  locationId: string;
  tasks: Task[];
};

export type TaskResponse = {
  locationId: string;
  contactId: string;
  task: Task;
};

export type AssigneesResponse = {
  locationId: string;
  users: TaskAssignee[];
};

export type PendingCountResponse = {
  locationId: string;
  count: number;
};

export type TaskFormValues = {
  title: string;
  body: string;
  dueDate: string;
  assignedTo: string;
  contactId: string;
  completed: boolean;
};

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  status: 'all',
  contactIds: [],
  assigneeIds: [],
  sortField: 'dueDate',
  sortOrder: 'asc',
};

export function emptyTaskFormValues(): TaskFormValues {
  return {
    title: '',
    body: '',
    dueDate: defaultDueDateIso(),
    assignedTo: '',
    contactId: '',
    completed: false,
  };
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title ?? '',
    body: stripTaskBodyHtml(task.body),
    dueDate: task.dueDate ?? defaultDueDateIso(),
    assignedTo: task.assignedTo ?? '',
    contactId: task.contactId ?? '',
    completed: task.completed,
  };
}

export function defaultDueDateIso(d = new Date()) {
  const date = new Date(d);
  date.setHours(17, 0, 0, 0);
  return date.toISOString();
}

export function validateTaskForm(values: TaskFormValues, requireContact = false): string | null {
  if (!values.title.trim()) return 'Title is required';
  if (!values.dueDate.trim()) return 'Due date is required';
  if (requireContact && !values.contactId.trim()) return 'Contact is required';
  return null;
}

export function formValuesToTaskPayload(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    body: values.body.trim() || undefined,
    dueDate: values.dueDate,
    completed: values.completed,
    assignedTo: values.assignedTo.trim() || undefined,
  };
}

export function buildTaskSearchBody(
  filters: TaskFilters,
  query?: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = { limit: 100 };
  if (filters.status === 'pending') body.completed = false;
  if (filters.status === 'completed') body.completed = true;
  if (filters.contactIds.length > 0) body.contactId = filters.contactIds;
  if (filters.assigneeIds.length > 0) body.assignedTo = filters.assigneeIds;
  if (query?.trim()) body.query = query.trim();
  return body;
}

export function sortTasks(tasks: Task[], sortField: TaskSortField, sortOrder: TaskSortOrder): Task[] {
  const dir = sortOrder === 'asc' ? 1 : -1;
  return tasks.slice().sort((a, b) => {
    if (sortField === 'dueDate') {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return (aTime - bTime) * dir;
    }
    return 0;
  });
}

export function filterTasksByQuery(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((t) => {
    const hay = [
      t.title,
      stripTaskBodyHtml(t.body),
      t.contactName,
      t.assigneeName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function formatTaskDueDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export function taskStatusLabel(completed: boolean): string {
  return completed ? 'Completed' : 'Pending';
}

/** GHL task bodies are often HTML; show plain text in list rows. */
export function stripTaskBodyHtml(html?: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function activeFilterCount(filters: TaskFilters): number {
  let count = 0;
  if (filters.contactIds.length > 0) count += 1;
  if (filters.assigneeIds.length > 0) count += 1;
  if (filters.status !== 'all') count += 1;
  return count;
}

export function sortLabel(filters: TaskFilters): string {
  if (filters.sortField === 'dueDate') {
    return filters.sortOrder === 'asc' ? 'Due Date (Asc)' : 'Due Date (Des)';
  }
  return 'Due Date (Asc)';
}

export function statusFilterLabel(status: TaskStatusFilter): string {
  if (status === 'pending') return 'Pending';
  if (status === 'completed') return 'Completed';
  return 'All';
}

export function isTaskOverdue(task: Task): boolean {
  if (task.completed || !task.dueDate) return false;
  const due = new Date(task.dueDate).getTime();
  return !Number.isNaN(due) && due < Date.now();
}

export function hasActiveTaskFilters(filters: TaskFilters): boolean {
  return activeFilterCount(filters) > 0;
}
