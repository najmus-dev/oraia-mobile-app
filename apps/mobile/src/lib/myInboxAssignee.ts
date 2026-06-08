import { useCallback, useEffect, useRef, useState } from 'react';
import { api, withAuthHeaders } from './api';

type Assignee = { id: string; email?: string };

/** Resolve GHL assignee id for My Inbox when not yet on the user profile. */
export function useMyInboxAssigneeId(opts: {
  token: string | null;
  locationId: string | null;
  userEmail?: string;
  ghlUserId?: string;
  inboxTab: 'team' | 'mine';
}): { assigneeId?: string; resolving: boolean } {
  const { token, locationId, userEmail, ghlUserId, inboxTab } = opts;
  const [fallbackId, setFallbackId] = useState<string | undefined>();
  const [resolving, setResolving] = useState(false);
  const resolveSeq = useRef(0);

  const resolve = useCallback(async () => {
    if (inboxTab !== 'mine' || ghlUserId?.trim() || !token || !locationId || !userEmail?.trim()) {
      setFallbackId(undefined);
      setResolving(false);
      return;
    }

    const seq = ++resolveSeq.current;
    setResolving(true);
    try {
      const inboxRes = await api.getJson<{ ghlUserId: string | null }>('/api/auth/inbox-assignee', {
        headers: withAuthHeaders({ token, locationId }),
      });
      if (seq !== resolveSeq.current) return;

      const fromApi = inboxRes.ghlUserId?.trim();
      if (fromApi) {
        setFallbackId(fromApi);
        return;
      }

      const res = await api.getJson<{ users: Assignee[] }>('/api/tasks/assignees?limit=100', {
        headers: withAuthHeaders({ token, locationId }),
      });
      if (seq !== resolveSeq.current) return;

      const normalized = userEmail.toLowerCase().trim();
      const match = (res.users ?? []).find((u) => u.email?.toLowerCase().trim() === normalized);
      setFallbackId(match?.id?.trim());
    } catch {
      if (seq === resolveSeq.current) setFallbackId(undefined);
    } finally {
      if (seq === resolveSeq.current) setResolving(false);
    }
  }, [inboxTab, ghlUserId, token, locationId, userEmail]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    resolve();
  }, [resolve]);

  const assigneeId = ghlUserId?.trim() || fallbackId;
  return { assigneeId, resolving: inboxTab === 'mine' && !assigneeId && resolving };
}
