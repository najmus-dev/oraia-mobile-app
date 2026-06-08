import type { GhlTask } from '../services/ghl/types';

export type MappedTask = {
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

export function ghlTaskId(raw: GhlTask | undefined): string {
  if (!raw) return '';
  const id = raw.id ?? raw._id;
  return typeof id === 'string' ? id : '';
}

function nameFromParts(first?: string, last?: string): string | undefined {
  const built = [first, last].filter(Boolean).join(' ').trim();
  return built || undefined;
}

export function mapGhlTask(
  raw: GhlTask,
  assigneeNames: Map<string, string>,
  contactNames: Map<string, string>,
): MappedTask {
  const contactId = typeof raw.contactId === 'string' ? raw.contactId : undefined;
  const assignedTo = typeof raw.assignedTo === 'string' ? raw.assignedTo : undefined;

  const contactDetails = raw.contactDetails as
    | { firstName?: string; lastName?: string }
    | undefined;
  const assigneeDetails = raw.assignedToUserDetails as
    | { id?: string; firstName?: string; lastName?: string }
    | undefined;

  const contactFromRaw =
    typeof raw.contactName === 'string'
      ? raw.contactName
      : nameFromParts(contactDetails?.firstName, contactDetails?.lastName) ||
        (typeof (raw.contact as { name?: string } | undefined)?.name === 'string'
          ? (raw.contact as { name: string }).name
          : undefined);

  const assigneeFromRaw = nameFromParts(
    assigneeDetails?.firstName,
    assigneeDetails?.lastName,
  );

  return {
    id: ghlTaskId(raw),
    title: typeof raw.title === 'string' ? raw.title : '',
    body: typeof raw.body === 'string' ? raw.body : undefined,
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : undefined,
    completed: Boolean(raw.completed),
    contactId,
    contactName: contactFromRaw || (contactId ? contactNames.get(contactId) : undefined),
    assignedTo,
    assigneeName:
      assigneeFromRaw || (assignedTo ? assigneeNames.get(assignedTo) : undefined),
  };
}

export function mapGhlTasks(
  rawTasks: GhlTask[],
  assigneeNames: Map<string, string>,
  contactNames: Map<string, string>,
): MappedTask[] {
  return rawTasks
    .map((t) => mapGhlTask(t, assigneeNames, contactNames))
    .filter((t) => t.id);
}
