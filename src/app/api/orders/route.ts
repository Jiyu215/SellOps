import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getOrders } from '@/dal/orders'
import { orderListQuerySchema } from '@/features/orders/schemas/order.schema'
import type { OrderListQuery } from '@/features/orders/types/order.type'

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
