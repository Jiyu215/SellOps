import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

/**
 * Deletes a notification by ID and returns a JSON response.
 *
 * @param params - A promise that resolves to an object containing the `id` of the notification to delete.
 * @returns A `NextResponse` with `{ success: true }` on successful deletion; returns `auth.response` when authentication fails; otherwise a `NextResponse` with `{ error: '알림 삭제에 실패했습니다.' }` and status `500`.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '알림 삭제에 실패했습니다.' },
      { status: 500 },
    )
  }
}
