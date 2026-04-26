import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { NotificationType, NotificationLevel } from '@/features/notifications/types/notification.types'

export interface CreateNotificationParams {
  type:    NotificationType
  level:   NotificationLevel
  title:   string
  message: string
  link?:   string | null
}

/**
 * Create a notification record in the server-side database.
 *
 * Creates a single row in the `notifications` table. If insertion fails, the error is
 * silently absorbed so the caller's control flow is not affected.
 *
 * @param params - Fields describing the notification to create; `link` may be `undefined` or `null`
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin.from('notifications').insert({
      type:    params.type,
      level:   params.level,
      title:   params.title,
      message: params.message,
      link:    params.link ?? null,
    })
  } catch {
    // 알림 생성 실패는 비즈니스 로직에 영향을 주지 않음
  }
}

/**
 * Create multiple notification records in a single bulk insert.
 *
 * Performs one insert for all provided items; returns immediately if `items` is empty.
 * Any insertion errors are caught and suppressed so callers are not affected.
 *
 * @param items - Array of notification parameters to persist; each item becomes one record
 */
export async function createNotifications(items: CreateNotificationParams[]): Promise<void> {
  if (items.length === 0) return
  try {
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin.from('notifications').insert(
      items.map((p) => ({
        type:    p.type,
        level:   p.level,
        title:   p.title,
        message: p.message,
        link:    p.link ?? null,
      })),
    )
  } catch {
    // 알림 생성 실패는 비즈니스 로직에 영향을 주지 않음
  }
}
