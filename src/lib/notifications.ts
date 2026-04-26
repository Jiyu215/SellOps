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
 * 서버사이드에서 알림을 DB에 생성한다.
 * 실패해도 호출 측 로직에 영향을 주지 않도록 내부에서 오류를 흡수한다.
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
 * 복수 알림을 단일 INSERT로 일괄 생성한다.
 * 실패해도 호출 측 로직에 영향을 주지 않는다.
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
