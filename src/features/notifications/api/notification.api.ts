import type {
  NotificationListQuery,
  NotificationListResponse,
} from '../types/notification.types'

/**
 * Builds the notifications API endpoint URL with optional query parameters.
 *
 * @param params - Filters and pagination for the notification list (`status`, `type`, `level`, `period`, `page`, `limit`)
 * @returns The `/api/notifications` endpoint string; appends a query string when any `params` fields are provided
 */
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

/**
 * Fetches a list of notifications using optional query parameters.
 *
 * @param params - Optional filters and pagination options for the notification list
 * @returns The notification list response containing notifications and pagination metadata
 * @throws Error - when the request fails with message '알림 조회에 실패했습니다.'
 */
export async function fetchNotifications(
  params: NotificationListQuery = {},
): Promise<NotificationListResponse> {
  const res = await fetch(buildQuery(params), { cache: 'no-store' })
  if (!res.ok) throw new Error('알림 조회에 실패했습니다.')
  return res.json() as Promise<NotificationListResponse>
}

/**
 * Marks the specified notification as read.
 *
 * @param id - The notification identifier to mark as read
 * @throws Error if the request fails (response is not OK)
 */
export async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  if (!res.ok) throw new Error('읽음 처리에 실패했습니다.')
}

/**
 * Marks all notifications as read on the server.
 *
 * @throws Error('전체 읽음 처리에 실패했습니다.') if the server responds with a non-OK status.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', { method: 'POST' })
  if (!res.ok) throw new Error('전체 읽음 처리에 실패했습니다.')
}

/**
 * Deletes a notification by its ID.
 *
 * @param id - The notification ID to delete
 * @throws Error if the server responds with a non-OK status
 */
export async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('알림 삭제에 실패했습니다.')
}
