import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code      = searchParams.get('code') ?? ''
    const excludeId = searchParams.get('excludeId')  // 수정 시 자기 자신 제외

    if (!code) {
      return NextResponse.json({ available: false })
    }

    let query = supabaseAdmin
      .from('products')
      .select('id')
      .eq('product_code', code)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query

    return NextResponse.json({ available: !data?.length })
  } catch {
    return NextResponse.json(
      { error: '중복 확인에 실패했습니다.' },
      { status: 500 }
    )
  }
}
