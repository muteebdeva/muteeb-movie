// In-app notifications for the movie site.
// Visibility is enforced by RLS on public.notifications: a signed-in user
// sees only published, non-cancelled notifications where audience = 'all'
// or their own id is in target_user_ids. Reads are tracked per user in
// public.notification_reads (own rows only).
import { useCallback, useEffect, useState } from 'react';
import { activeSupabase, isSupabaseConfigured } from './supabase';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  publish_at: string;
  created_at: string;
  read: boolean;
}

async function client() {
  if (!isSupabaseConfigured()) return null;
  return activeSupabase();
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const c = await client();
  if (!c) return [];
  const { data: userData } = await c.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: notifs, error } = await c
    .from('notifications')
    .select('id,title,message,link,publish_at,created_at')
    .order('publish_at', { ascending: false })
    .limit(50);
  if (error || !notifs) return [];

  const { data: reads } = await c
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', uid);
  const readSet = new Set((reads ?? []).map((r) => (r as { notification_id: string }).notification_id));

  return (notifs as Array<Omit<AppNotification, 'read'>>).map((n) => ({
    ...n,
    read: readSet.has(n.id),
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const c = await client();
  if (!c) return;
  const { data: userData } = await c.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await c.from('notification_reads').upsert(
    { notification_id: notificationId, user_id: uid },
    { onConflict: 'notification_id,user_id' }
  );
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  const c = await client();
  if (!c || ids.length === 0) return;
  const { data: userData } = await c.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await c.from('notification_reads').upsert(
    ids.map((notification_id) => ({ notification_id, user_id: uid })),
    { onConflict: 'notification_id,user_id' }
  );
}

interface NotificationState {
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

/** Poll-free: refresh on mount + when the auth user changes + on demand. */
export function useNotifications(enabled: boolean): NotificationState {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      setNotifications(await fetchNotifications());
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await markNotificationRead(id);
      } catch {
        /* keep optimistic state */
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(ids);
    } catch {
      /* keep optimistic state */
    }
  }, [notifications]);

  return {
    notifications,
    unread: notifications.filter((n) => !n.read).length,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}
