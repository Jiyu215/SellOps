import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types/dashboard'

/**
 * 서버 컴포넌트(페이지)에서 초기 알림 목록을 가져온다.
 * 인증 세션이 없거나 오류 시 빈 배열을 반환한다.
 */
export async function getInitialNotifications(): Promise<Notification[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, type, level, title, message, link, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []) as Notification[]
  } catch {
    return []
  }
}
