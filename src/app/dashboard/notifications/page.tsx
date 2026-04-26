import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NotificationsContent } from './NotificationsContent';
import { NotificationSkeleton } from '@/components/dashboard/notifications/NotificationSkeleton';
import type { Notification, NotificationListSummary } from '@/features/notifications/types/notification.types';
import type { NotificationType, NotificationLevel } from '@/features/notifications/types/notification.types';

type NotificationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Get the first value for a query parameter key.
 *
 * @param params - Record of query parameters where values may be a string, an array of strings, or `undefined`
 * @param key - The parameter name to retrieve
 * @returns The parameter value (first element if an array) or `undefined` if not present
 */
function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Fetches paginated notifications and an unread/level summary based on URL query parameters.
 *
 * Recognizes these query parameters in `params`: `status` (`'unread'`), `type` (`'order' | 'inventory' | 'product' | 'system'`), `level` (`'critical' | 'warning' | 'info'`), `period` (`'today' | '7d' | '30d'`), `page`, and `limit` (`20 | 50 | 100`). Applies filtering and pagination accordingly and returns the matching notification rows plus aggregate summary counts.
 *
 * @param params - A record of query-string values (single string or string[]). Keys listed above are interpreted for filtering and pagination.
 * @returns An object containing:
 *  - `items`: the page of `Notification` rows,
 *  - `total`: the total number of rows for the paginated query,
 *  - `summary`: aggregate counts with properties:
 *      - `total`: total number of notifications considered for the summary,
 *      - `unread`: number of unread notifications,
 *      - `critical`: number of unread critical notifications,
 *      - `warning`: number of unread warning notifications.
 */
async function getPageData(params: Record<string, string | string[] | undefined>) {
  const status = getParam(params, 'status')
  const type   = getParam(params, 'type')
  const level  = getParam(params, 'level')
  const period = getParam(params, 'period')
  const page   = Math.max(1, Number(getParam(params, 'page') ?? 1))
  const limit  = (() => {
    const l = Number(getParam(params, 'limit') ?? 20)
    return [20, 50, 100].includes(l) ? l : 20
  })()
  const from = (page - 1) * limit
  const to   = from + limit - 1

  const supabaseAdmin = getSupabaseAdmin()

  let query = supabaseAdmin
    .from('notifications')
    .select('id, type, level, title, message, link, is_read, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status === 'unread') query = query.eq('is_read', false)
  if (type && ['order', 'inventory', 'product', 'system'].includes(type))
    query = query.eq('type', type as NotificationType)
  if (level && ['critical', 'warning', 'info'].includes(level))
    query = query.eq('level', level as NotificationLevel)
  if (period === 'today') {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    query = query.gte('created_at', today.toISOString())
  } else if (period === '7d') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
  } else if (period === '30d') {
    query = query.gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
  }

  const [listResult, summaryResult] = await Promise.all([
    query,
    supabaseAdmin.from('notifications').select('level, is_read'),
  ])

  const summaryRows = summaryResult.data ?? []
  const summary: NotificationListSummary = {
    total:    summaryRows.length,
    unread:   summaryRows.filter((n) => !n.is_read).length,
    critical: summaryRows.filter((n) => n.level === 'critical' && !n.is_read).length,
    warning:  summaryRows.filter((n) => n.level === 'warning'  && !n.is_read).length,
  }

  return {
    items: (listResult.data ?? []) as Notification[],
    total: listResult.count ?? 0,
    summary,
  }
}

/**
 * Render the dashboard notifications page with initial user, notification and page data.
 *
 * Resolves optional query parameters, fetches the current dashboard user, initial notifications, and paginated notification data, and renders them inside the dashboard layout. The notifications content is wrapped in a Suspense boundary with a skeleton fallback.
 *
 * @param searchParams - Optional promise resolving to a record of query-string values used for filtering and pagination (e.g., `status`, `type`, `level`, `period`, `page`, `limit`).
 * @returns The React element for the notifications page.
 */
export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams ?? {}

  const [currentUser, notifications, pageData] = await Promise.all([
    getDashboardUser(),
    getInitialNotifications(),
    getPageData(params),
  ])

  return (
    <DashboardLayout
      currentUser={currentUser}
      notifications={notifications}
      pageTitle="알림"
      nativeScroll
    >
      <Suspense fallback={<NotificationSkeleton />}>
        <NotificationsContent
          initialNotifications={pageData.items}
          initialTotal={pageData.total}
          initialSummary={pageData.summary}
        />
      </Suspense>
    </DashboardLayout>
  )
}
