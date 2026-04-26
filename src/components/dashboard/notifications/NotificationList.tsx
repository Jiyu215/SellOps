'use client';

import { useMemo } from 'react';
import type { Notification } from '@/features/notifications/types/notification.types';
import { NotificationRow } from './NotificationRow';

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead:    (id: string) => void;
  onDelete:      (id: string) => void;
}

type DateGroup = {
  label: string;
  items: Notification[];
};

/**
 * Compute a Korean date-group label for a timestamp.
 *
 * @param isoString - An ISO 8601 timestamp string representing the item's date/time.
 * @returns One of:
 * - `오늘 (YYYY.MM.DD)` when the timestamp is the current calendar day (formatted with year, month, day),
 * - `어제` when it is one day before today,
 * - `이번 주` when it is between 2 and 6 days before today (inclusive),
 * - `이전` when it is 7 or more days before today.
 */
function getDateGroup(isoString: string): string {
  const now   = new Date();
  const date  = new Date(isoString);

  const nowDate  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((nowDate.getTime() - itemDate.getTime()) / 86_400_000);

  if (diffDays === 0) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `오늘 (${y}.${m}.${d})`
  }
  if (diffDays === 1) return '어제'
  if (diffDays <= 6)  return '이번 주'
  return '이전'
}

const GROUP_ORDER = ['오늘', '어제', '이번 주', '이전'];

/**
 * Group notifications into date buckets labeled by relative Korean date categories.
 *
 * @param notifications - The notifications to group by their `created_at` timestamp.
 * @returns An array of `DateGroup` objects in `GROUP_ORDER`. Each group contains `items` — the notifications for that bucket — and a `label`. The "오늘" group, when present, uses the specific `오늘 (YYYY.MM.DD)` form returned by `getDateGroup` for today's notifications; other groups use their category label (`어제`, `이번 주`, `이전`).
 */
function groupByDate(notifications: Notification[]): DateGroup[] {
  const map = new Map<string, Notification[]>();

  for (const n of notifications) {
    const label = getDateGroup(n.created_at);
    const key   = label.startsWith('오늘') ? '오늘' : label;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }

  return GROUP_ORDER
    .filter((k) => map.has(k))
    .map((k) => ({
      label: notifications.find((n) => {
        const g = getDateGroup(n.created_at);
        return (g.startsWith('오늘') ? '오늘' : g) === k;
      })
        ? k === '오늘'
          ? getDateGroup(notifications.find((n) => getDateGroup(n.created_at).startsWith('오늘'))!.created_at)
          : k
        : k,
      items: map.get(k)!,
    }));
}

export const NotificationList = ({
  notifications,
  onMarkRead,
  onDelete,
}: NotificationListProps) => {
  const groups = useMemo(() => groupByDate(notifications), [notifications]);

  return (
    <div className="space-y-md">
      {groups.map((group) => (
        <section key={group.label}>
          {/* 날짜 구분선 */}
          <div className="flex items-center gap-sm mb-xs">
            <span className="text-caption font-semibold text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-light-border dark:bg-dark-border" />
          </div>

          <ul
            className={[
              'rounded-lg border border-light-border dark:border-dark-border overflow-hidden',
              'bg-light-surface dark:bg-dark-surface',
            ].join(' ')}
          >
            {group.items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
