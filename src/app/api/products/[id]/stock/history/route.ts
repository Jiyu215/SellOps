import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

/**
 * Retrieve paginated stock history entries for a specific product.
 *
 * @param request - The incoming HTTP request, used to read query parameters `page` and `limit`
 * @param params - A promise resolving to route parameters; must include `id` as the product identifier
 * @returns A JSON response containing `{ items, total, page, limit }` on success; if authentication fails returns the auth failure response, and on error returns `{ error: '재고 이력 조회에 실패했습니다.' }` with status 500
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
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
