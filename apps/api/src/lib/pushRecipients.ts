export type PushRecipientUser = {
  _id: unknown;
  role: string;
  status?: string;
  allowedLocationIds?: string[];
  ghlUserId?: string | null;
};

export function userCanAccessLocation(user: PushRecipientUser, locationId: string): boolean {
  if (user.role === 'agency_admin') return true;
  return Boolean(user.allowedLocationIds?.includes(locationId));
}

/**
 * Who should get an inbound SMS/call push.
 *
 * HighLevel's official app shows location-scoped notifications (not assignee-only).
 * Oraia matches that: every active user with access to the location gets the push.
 * `assignedTo` is retained for API compatibility / future prioritization.
 */
export function selectPushRecipientIds(
  users: PushRecipientUser[],
  locationId: string,
  _assignedTo?: string,
): string[] {
  const accessible = users.filter(
    (user) => user.status !== 'pending' && user.status !== 'rejected' && userCanAccessLocation(user, locationId),
  );
  return [...new Set(accessible.map((user) => String(user._id)))];
}
