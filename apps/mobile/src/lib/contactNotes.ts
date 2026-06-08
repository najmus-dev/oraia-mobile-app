export type ContactNote = {
  id: string;
  body?: string;
  dateAdded?: string;
  userId?: string;
};

export type ContactNotesResponse = {
  notes: ContactNote[];
};

export type CreateNoteResponse = {
  note: ContactNote;
};

export function formatNoteWhen(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
