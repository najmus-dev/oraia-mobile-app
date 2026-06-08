import type { PickedContact } from './contacts';
import type { TaskFormValues } from './tasks';

export type TaskFormDraft = {
  values: TaskFormValues;
  pickedContact: PickedContact | null;
  assigneeName: string;
};

let draft: TaskFormDraft | null = null;
let draftOwner: string | null = null;

export function taskFormOwnerKey(params: { taskId?: string; contactId?: string }): string {
  if (params.taskId && params.contactId) return `edit:${params.taskId}`;
  return 'create';
}

export function readTaskFormDraft(owner: string): TaskFormDraft | null {
  if (draftOwner !== owner) return null;
  return draft;
}

export function writeTaskFormDraft(owner: string, next: TaskFormDraft): void {
  draftOwner = owner;
  draft = next;
}

export function clearTaskFormDraft(owner?: string): void {
  if (owner && draftOwner !== owner) return;
  draft = null;
  draftOwner = null;
}

export function resetCreateTaskFormDraft(): void {
  clearTaskFormDraft('create');
}
