import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types/dashboard'

/**
 * Fetches up to 50 most recent dashboard notifications for use in server components/pages.
 *
 * Returns an array of notifications (fields: `id`, `type`, `level`, `title`, `message`, `link`, `is_read`, `created_at`) ordered newest first. Returns an empty array if no notifications are found or if an error occurs (for example, when a session is not available).
 *
 * @returns An array of `Notification` objects (up to 50), empty if none or on error.
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
