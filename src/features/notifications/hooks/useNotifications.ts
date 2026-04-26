'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types/dashboard';

const POLL_INTERVAL_MS = 30_000;

/**
 * Manage a client-side notification list with realtime updates, manual refresh, visibility-triggered refetch, and polling fallback.
 *
 * Keeps local notifications state initialized from `initial` and updates it in the following priority:
 * 1. Supabase realtime INSERT/UPDATE/DELETE events
 * 2. Explicit refresh calls
 * 3. Page visibility changes (refetch when tab becomes visible)
 * 4. Periodic polling (every POLL_INTERVAL_MS)
 *
 * @param initial - Initial array of notifications used to seed local state
 * @returns An object with:
 *   - `notifications`: the current notification list
 *   - `refresh`: fetches the latest notifications from the server and replaces local state (guards against concurrent requests)
 *   - `markRead(id)`: optimistically marks a single notification as read locally and sends a PATCH to the server; network failures are ignored
 *   - `markAllRead()`: optimistically marks all notifications as read locally and sends a POST to the server; network failures are ignored
 */
export function useNotifications(initial: Notification[]) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const isFetching = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const response = await fetch('/api/notifications?limit=50');
      if (!response.ok) return;

      const data = (await response.json()) as { items: Notification[] };
      setNotifications(data.items);
    } catch {
      // 네트워크 오류 시 현재 상태 유지
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refresh]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => {
            const newNotification = payload.new as Notification;
            if (prev.some((notification) => notification.id === newNotification.id)) {
              return prev;
            }

            return [newNotification, ...prev].slice(0, 50);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === payload.new.id
                ? (payload.new as Notification)
                : notification,
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== payload.old.id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification,
      ),
    );

    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // 낙관적 업데이트 유지
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true })),
    );

    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      // 낙관적 업데이트 유지
    }
  }, []);

  return { notifications, refresh, markRead, markAllRead };
}
