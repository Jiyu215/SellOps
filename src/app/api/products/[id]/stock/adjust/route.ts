import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { stockAdjustSchema } from '@/features/products/schemas/product.schema'

type AdjustStockOk = {
  product_id: string
  total:      number
  sold:       number
  available:  number
}

type AdjustStockErr =
  | { error: 'stock_not_found' }
  | { error: 'product_not_found' }
  | { error: 'insufficient_stock'; available: number }
  | { error: 'invalid_stock_adjustment' }

type AdjustRpcResult = AdjustStockOk | AdjustStockErr

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const raw = await request.json()

    const parsed = stockAdjustSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터가 올바르지 않습니다.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { type, quantity, reason } = parsed.data
    const supabaseAdmin = getSupabaseAdmin()

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'adjust_product_stock',
      {
        p_product_id: id,
        p_type:       type,
        p_quantity:   quantity,
        p_reason:     reason ?? null,
      }
    )

    if (rpcError) throw rpcError

    const result = rpcData as unknown as AdjustRpcResult

    if ('error' in result) {
      if (result.error === 'product_not_found') {
        return NextResponse.json(
          { error: '상품을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      if (result.error === 'stock_not_found') {
        return NextResponse.json(
          { error: '재고 정보를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      if (result.error === 'insufficient_stock') {
        return NextResponse.json(
          { error: `가용 재고보다 많은 수량입니다. (가용: ${result.available}개)` },
          { status: 400 }
        )
      }
      if (result.error === 'invalid_stock_adjustment') {
        return NextResponse.json(
          { error: '요청 데이터가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: '재고 조정에 실패했습니다.' },
      { status: 500 }
    )
  }
}
