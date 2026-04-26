import type {
  NotificationListQuery,
  NotificationListResponse,
} from '../types/notification.types'

function buildQuery(params: NotificationListQuery): string {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.type)   q.set('type',   params.type)
  if (params.level)  q.set('level',  params.level)
  if (params.period) q.set('period', params.period)
  if (params.page)   q.set('page',   String(params.page))
  if (params.limit)  q.set('limit',  String(params.limit))
  const qs = q.toString()
  return qs ? `/api/notifications?${qs}` : '/api/notifications'
}

export async function fetchNotifications(
  params: NotificationListQuery = {},
): Promise<NotificationListResponse> {
  const res = await fetch(buildQuery(params), { cache: 'no-store' })
  if (!res.ok) throw new Error('알림 조회에 실패했습니다.')
  return res.json() as Promise<NotificationListResponse>
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  if (!res.ok) throw new Error('읽음 처리에 실패했습니다.')
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', { method: 'POST' })
  if (!res.ok) throw new Error('전체 읽음 처리에 실패했습니다.')
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('알림 삭제에 실패했습니다.')
}
