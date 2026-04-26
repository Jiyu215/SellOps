import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { ProductStatus } from '@/features/products/types/product.type'
import { requireAuth } from '@/lib/api/requireAuth'
import { createNotification } from '@/lib/notifications'

const STATUS_LABELS: Record<ProductStatus, string> = {
  active:   '판매중',
  hidden:   '숨김',
  sold_out: '품절',
}

/**
 * Updates the status of multiple products and returns a JSON response indicating the outcome.
 *
 * Attempts to update the `status` and `updated_at` fields for the products whose `id` values are provided.
 *
 * @returns A `NextResponse` containing `{ success: true }` on success; otherwise a JSON error object with status `400` when no product ids are provided, status `500` on internal failure, or the authentication response when authentication fails.
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { ids, status } = await request.json() as {
      ids: string[]
      status: ProductStatus
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (!ids?.length) {
      return NextResponse.json(
        { error: '선택된 상품이 없습니다.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw error

    void createNotification({
      type:    'product',
      level:   'info',
      title:   '상품 일괄 상태 변경',
      message: `${ids.length}개 상품이 ${STATUS_LABELS[status] ?? status}(으)로 변경되었습니다.`,
      link:    '/dashboard/products',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '상태 변경에 실패했습니다.' },
      { status: 500 }
    )
  }
}
