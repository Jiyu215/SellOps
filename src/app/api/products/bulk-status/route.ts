import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { ProductStatus } from '@/features/products/types/product.type'

export async function PATCH(request: Request) {
  try {
    const { ids, status } = await request.json() as {
      ids: string[]
      status: ProductStatus
    }

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

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '상태 변경에 실패했습니다.' },
      { status: 500 }
    )
  }
}
