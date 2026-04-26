import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

/**
 * Reorders images for a product by updating each image's `order` value in the database.
 *
 * Requires authentication; if authentication fails, the handler returns the authentication response.
 *
 * @param params - A promise resolving to route parameters; must provide `id` as the product identifier
 * @returns `{ success: true }` on success; the authentication response if unauthorized; otherwise `{ error: '순서 변경에 실패했습니다.' }` with HTTP status 500 on failure
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const { orders } = await request.json() as {
      orders: Array<{ id: string; order: number }>
    }

    // 각 이미지의 order 값을 개별 업데이트
    await Promise.all(
      orders.map(({ id: imageId, order }) =>
        supabaseAdmin
          .from('product_images')
          .update({ order })
          .eq('id', imageId)
          .eq('product_id', id)
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '순서 변경에 실패했습니다.' },
      { status: 500 }
    )
  }
}
