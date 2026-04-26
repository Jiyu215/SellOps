import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { stockAdjustSchema } from '@/features/products/schemas/product.schema'
import { createNotifications } from '@/lib/notifications'
import type { CreateNotificationParams } from '@/lib/notifications'

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

/**
 * Handles authenticated POST requests to adjust a product's stock and triggers inventory notifications.
 *
 * @param request - The incoming HTTP request containing the adjustment payload.
 * @param params - An object with a promise resolving to route parameters; `id` is the target product ID.
 * @returns A NextResponse JSON payload containing the RPC result on success; on failure a JSON error object with an appropriate HTTP status (400 for validation or invalid adjustment, 404 for missing product/stock, 500 for internal errors).
 */
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

    // 재고 알림 생성 (비동기, 실패해도 응답에 영향 없음)
    const ok = result as AdjustStockOk
    void (async () => {
      const notifications: CreateNotificationParams[] = [
        {
          type:    'inventory',
          level:   'info',
          title:   '재고 조정 완료',
          message: `재고가 ${quantity}개 ${type === 'in' ? '입고' : '출고'} 처리되었습니다.`,
          link:    `/dashboard/products/${ok.product_id}`,
        },
      ]

      const { data: product } = await supabaseAdmin
        .from('products')
        .select('name, status')
        .eq('id', ok.product_id)
        .single()

      const productName = product?.name ?? ok.product_id

      if (ok.available === 0) {
        notifications.push({
          type:    'inventory',
          level:   'critical',
          title:   '재고 소진',
          message: `[${productName}] 재고가 소진되었습니다.`,
          link:    `/dashboard/products/${ok.product_id}`,
        })
        if (product?.status === 'active') {
          notifications.push({
            type:    'inventory',
            level:   'critical',
            title:   '품절 상품 판매중 상태',
            message: `[${productName}] 재고가 없지만 판매중 상태입니다. 상태를 변경해주세요.`,
            link:    `/dashboard/products/${ok.product_id}`,
          })
        }
      } else if (ok.available >= 1 && ok.available <= 9) {
        notifications.push({
          type:    'inventory',
          level:   'warning',
          title:   '재고 부족 임박',
          message: `[${productName}] 재고가 ${ok.available}개 남았습니다.`,
          link:    `/dashboard/products/${ok.product_id}`,
        })
      }

      await createNotifications(notifications)
    })()

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: '재고 조정에 실패했습니다.' },
      { status: 500 }
    )
  }
}
