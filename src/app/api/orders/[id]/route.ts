import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getOrderDetail } from '@/dal/orders'

/**
 * Handle GET requests for a single order by authenticating the request and returning the order details for the route `id`.
 *
 * @param params - A promise that resolves to an object with an `id` string identifying the order
 * @returns A NextResponse containing the order object on success; the authentication response when authentication fails; a 404 JSON error `{ error: '주문을 찾을 수 없습니다.' }` when the order is not found; or a 500 JSON error `{ error: '주문 상세 조회에 실패했습니다.' }` on unexpected failure
 */
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
