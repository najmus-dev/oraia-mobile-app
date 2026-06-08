import type { Task } from './tasks';
import { formatEventRange } from './dates';

export type CalendarSearchEvent = {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
};

export function taskSearchDetail(task: Task): string {
  const parts: string[] = [];
  if (task.dueDate) {
    try {
      parts.push(new Date(task.dueDate).toLocaleDateString());
    } catch {
      parts.push(task.dueDate);
    }
  }
  if (task.contactName?.trim()) parts.push(task.contactName.trim());
  if (task.completed) parts.push('Completed');
  return parts.join(' · ');
}

export function appointmentSearchDetail(event: CalendarSearchEvent): string {
  return formatEventRange(event.startTime, event.endTime) || 'Scheduled';
}

export function filterAppointmentsByQuery(
  events: CalendarSearchEvent[],
  query: string,
): CalendarSearchEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((e) => (e.title ?? '').toLowerCase().includes(q));
}
