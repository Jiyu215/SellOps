import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getOrders } from '@/dal/orders'
import type {
  OrderStatusType,
  PaymentMethod,
  PaymentStatusType,
  ShippingStatusType,
} from '@/features/orders/types/order.type'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Number(searchParams.get('limit') ?? 20) as 10 | 20 | 50 | 100

    const supabase = getSupabaseAdmin()
    const result = await getOrders(supabase, {
      search:         searchParams.get('search') ?? '',
      orderStatus:    (searchParams.get('orderStatus') ?? '') as OrderStatusType | '',
      paymentStatus:  (searchParams.get('paymentStatus') ?? '') as PaymentStatusType | '',
      shippingStatus: (searchParams.get('shippingStatus') ?? '') as ShippingStatusType | '',
      paymentMethod:  (searchParams.get('paymentMethod') ?? '') as PaymentMethod | '',
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: '주문 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
