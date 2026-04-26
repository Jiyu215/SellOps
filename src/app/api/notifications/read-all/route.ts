import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

/**
 * Marks all notifications with `is_read = false` as read.
 *
 * Requires authentication; if authentication fails, the authentication response is returned.
 *
 * @returns On success, a JSON object `{ success: true }`. On failure, a JSON error message and HTTP status `500`.
 */
export async function POST() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '전체 읽음 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}
