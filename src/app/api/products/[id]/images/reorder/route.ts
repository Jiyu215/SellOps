import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
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
