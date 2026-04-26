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

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

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
