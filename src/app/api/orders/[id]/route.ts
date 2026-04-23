import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getOrderDetail } from '@/dal/orders'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const order = await getOrderDetail(getSupabaseAdmin(), id)

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json(
      { error: '주문 상세 조회에 실패했습니다.' },
      { status: 500 },
    )
  }
}
