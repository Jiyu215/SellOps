import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { StockAdjustBody } from '@/features/products/types/product.type'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { type, quantity, reason } = await request.json() as StockAdjustBody

    // 현재 재고 조회
    const { data: stock, error: fetchError } = await supabaseAdmin
      .from('stocks')
      .select('total, sold')
      .eq('product_id', id)
      .single()

    if (fetchError || !stock) {
      return NextResponse.json(
        { error: '재고 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const available = stock.total - stock.sold

    // 출고 수량 검증
    if (type === 'out' && quantity > available) {
      return NextResponse.json(
        { error: `가용 재고보다 많은 수량입니다. (가용: ${available}개)` },
        { status: 400 }
      )
    }

    // 재고 업데이트
    // 입고: total 증가 / 출고: total 감소 (가용재고 = total - sold 이므로 total이 실제 변해야 함)
    const newTotal = type === 'in'
      ? stock.total + quantity
      : stock.total - quantity

    const { error: updateError } = await supabaseAdmin
      .from('stocks')
      .update({ total: newTotal })
      .eq('product_id', id)

    if (updateError) throw updateError

    // 재고 이력 기록
    await supabaseAdmin.from('stock_histories').insert({
      product_id: id,
      type,
      quantity,
      reason: reason ?? null,
    })

    const newAvailable = type === 'in'
      ? available + quantity
      : available - quantity

    return NextResponse.json({
      product_id: id,
      total:     newTotal,
      sold:      stock.sold,
      available: newAvailable,
    })
  } catch {
    return NextResponse.json(
      { error: '재고 조정에 실패했습니다.' },
      { status: 500 }
    )
  }
}
