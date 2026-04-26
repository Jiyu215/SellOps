'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types/dashboard';

const POLL_INTERVAL_MS = 30_000;

/**
 * 알림 상태 관리 훅
 *
 * 데이터 반영 우선순위:
 * 1. Supabase Realtime INSERT/UPDATE/DELETE 이벤트 즉시 반영
 * 2. 벨 클릭 시 즉시 fetch
 * 3. 탭 복귀 시 즉시 fetch
 * 4. 30초 폴링 fallback
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
