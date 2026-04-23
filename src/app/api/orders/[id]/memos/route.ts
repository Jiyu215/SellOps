import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { orderMemoCreateSchema } from '@/features/orders/schemas/order.schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const raw = await request.json()

    const parsed = orderMemoCreateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터가 올바르지 않습니다.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { data, error } = await getSupabaseAdmin()
      .from('order_memos')
      .insert({
        order_id: id,
        author_type: 'admin',
        author_name: auth.user.email ?? auth.user.id,
        content: parsed.data.content,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: '주문 메모 등록에 실패했습니다.' },
      { status: 500 },
    )
  }
}
