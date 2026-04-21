import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json() as { ids: string[] }

    if (!ids?.length) {
      return NextResponse.json(
        { error: '선택된 상품이 없습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', ids)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}