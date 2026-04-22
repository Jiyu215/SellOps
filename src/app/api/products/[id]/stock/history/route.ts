import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Number(searchParams.get('limit') ?? 20)
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    const { data, count, error } = await supabaseAdmin
      .from('stock_histories')
      .select('*', { count: 'exact' })
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch {
    return NextResponse.json(
      { error: '재고 이력 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
