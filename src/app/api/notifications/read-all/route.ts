import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

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
