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
 * Who should get an inbound SMS/call push, matching GHL inbox behavior:
 * - assigned GHL user (if they have an ORAIA account)
 * - all agency admins for that location
 * - if unassigned / unmatched, every staff member with access
 */
export function selectPushRecipientIds(
  users: PushRecipientUser[],
  locationId: string,
  assignedTo?: string,
): string[] {
  const accessible = users.filter(
    (user) => user.status !== 'pending' && user.status !== 'rejected' && userCanAccessLocation(user, locationId),
  );
  const assignedId = assignedTo?.trim();
  const assigned = assignedId
    ? accessible.filter((user) => user.ghlUserId?.trim() === assignedId)
    : [];
  const admins = accessible.filter((user) => user.role === 'agency_admin');
  const includeAllStaff = !assignedId || assigned.length === 0;
  const staff = includeAllStaff
    ? accessible.filter((user) => user.role !== 'agency_admin')
    : [];
  return [...new Set([...assigned, ...admins, ...staff].map((user) => String(user._id)))];
}
