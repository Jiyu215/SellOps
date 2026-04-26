import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { ProductStatus } from '@/features/products/types/product.type'
import { requireAuth } from '@/lib/api/requireAuth'
import { createNotification } from '@/lib/notifications'

/**
 * Exports product records as a UTF-8 CSV file attachment.
 *
 * Reads optional `search` and `status` query parameters from the request URL, queries the `products_with_stock`
 * view with the specified filters, converts the results into a BOM-prefixed CSV (Korean status labels applied),
 * emits a system info notification indicating export completion, and returns the CSV as a downloadable response.
 *
 * @param request - Incoming request; `search` and `status` may be provided as URL query parameters.
 * @returns A Response containing the CSV data with `Content-Type: text/csv; charset=utf-8` and a `Content-Disposition`
 * header naming the file `products_YYYYMMDD.csv`. On failure, returns a JSON response `{ error: 'CSV 내보내기에 실패했습니다.' }`
 * with HTTP status 500.
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') as ProductStatus | ''

    const supabaseAdmin = getSupabaseAdmin()
    let query = supabaseAdmin
      .from('products_with_stock')
      .select('product_code, name, price, stock_total, stock_sold, stock_available, status, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    const statusLabel: Record<string, string> = {
      active:   '판매중',
      hidden:   '숨김',
      sold_out: '품절',
    }

    const header = '상품코드,상품명,판매가,전체재고,판매수량,가용재고,상태,등록일,수정일'
    const rows = (data ?? []).map(p =>
      [
        p.product_code,
        `"${p.name}"`,
        p.price,
        p.stock_total,
        p.stock_sold,
        p.stock_available,
        statusLabel[p.status ?? ''] ?? p.status ?? '',
        p.created_at?.slice(0, 10) ?? '',
        p.updated_at?.slice(0, 10) ?? '',
      ].join(',')
    )

    const csv = '\uFEFF' + [header, ...rows].join('\n') // BOM for 한글 깨짐 방지

    void createNotification({
      type:    'system',
      level:   'info',
      title:   'CSV Export 완료',
      message: 'CSV 파일 내보내기가 완료되었습니다.',
      link:    null,
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv"`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'CSV 내보내기에 실패했습니다.' },
      { status: 500 }
    )
  }
}