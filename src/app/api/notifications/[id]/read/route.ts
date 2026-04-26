import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '읽음 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}
