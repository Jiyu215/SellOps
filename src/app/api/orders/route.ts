import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getOrders } from '@/dal/orders'
import { orderListQuerySchema } from '@/features/orders/schemas/order.schema'
import type { OrderListQuery } from '@/features/orders/types/order.type'

/**
 * Handle GET requests for the orders list: authenticate the caller, validate supported query
 * parameters, fetch matching orders, and return the result as JSON.
 *
 * If query validation fails the response is a 400 JSON object with `error: 'invalid_order_query'`
 * and `details` containing field errors. If authentication fails this handler returns the
 * authentication response. On unexpected errors the response is a 500 JSON object with
 * `error: '주문 목록 조회에 실패했습니다.'`.
 *
 * @returns On success, a JSON object containing the fetched orders and related metadata.
 *          On validation failure, `{ error: 'invalid_order_query', details: Record<string, string[]> }`.
 *          On internal failure, `{ error: '주문 목록 조회에 실패했습니다.' }` (status 500).
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const parsed = orderListQuerySchema.safeParse({
      search:         searchParams.get('search'),
      orderStatus:    searchParams.get('orderStatus'),
      paymentStatus:  searchParams.get('paymentStatus'),
      shippingStatus: searchParams.get('shippingStatus'),
      paymentMethod:  searchParams.get('paymentMethod'),
      page:           searchParams.get('page'),
      limit:          searchParams.get('limit'),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_order_query', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()
    const query = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as OrderListQuery
    const result = await getOrders(supabase, query)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: '주문 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
