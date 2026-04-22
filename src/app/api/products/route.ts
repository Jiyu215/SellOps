import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ProductCreateBody, ProductStatus, SortOption } from '@/features/products/types/product.type'
import { requireAuth } from '@/lib/api/requireAuth'


export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const search  = searchParams.get('search') ?? ''
    const status  = searchParams.get('status') as ProductStatus | ''
    const sort    = (searchParams.get('sort') ?? 'created_at_desc') as SortOption
    const page    = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit   = Number(searchParams.get('limit') ?? 20)
    const from    = (page - 1) * limit
    const to      = from + limit - 1

    const supabase = await createClient()

    // 목록 쿼리 (products_with_stock 뷰 사용)
    let query = supabase
      .from('products_with_stock')
      .select('id, name, price, product_code, status, updated_at, stock_total, stock_sold, stock_available', { count: 'exact' })

    // 검색
    if (search) {
      query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`)
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status)
    }

    // 정렬
    const sortMap: Record<SortOption, { column: string; ascending: boolean }> = {
      created_at_desc:  { column: 'created_at',       ascending: false },
      created_at_asc:   { column: 'created_at',       ascending: true  },
      updated_at_desc:  { column: 'updated_at',        ascending: false },
      name_asc:         { column: 'name',              ascending: true  },
      name_desc:        { column: 'name',              ascending: false },
      price_asc:        { column: 'price',             ascending: true  },
      price_desc:       { column: 'price',             ascending: false },
      available_asc:    { column: 'stock_available',   ascending: true  },
      available_desc:   { column: 'stock_available',   ascending: false },
    }
    const { column, ascending } = sortMap[sort]
    query = query.order(column, { ascending })

    // 페이지네이션
    query = query.range(from, to)

    const { data: items, count, error } = await query

    if (error) throw error

    // 상태별 집계 (필터 무관 전체 기준)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: summaryData } = await supabaseAdmin
      .from('products')
      .select('status')

    const summary = {
      total:    summaryData?.length ?? 0,
      active:   summaryData?.filter(p => p.status === 'active').length   ?? 0,
      hidden:   summaryData?.filter(p => p.status === 'hidden').length   ?? 0,
      sold_out: summaryData?.filter(p => p.status === 'sold_out').length ?? 0,
    }

    // 목록 이미지 URL 조회 (우선순위: list→thumbnail→small→main)
    const IMAGE_TYPE_PRIORITY = ['list', 'thumbnail', 'small', 'main'] as const
    const ids = (items ?? []).map(p => p.id).filter((id): id is string => id !== null)
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('product_id, type, url')
      .in('product_id', ids)
      .in('type', IMAGE_TYPE_PRIORITY)

    const imageMap: Record<string, string> = {}
    for (const priority of IMAGE_TYPE_PRIORITY) {
      for (const img of images ?? []) {
        if (img.type === priority && img.product_id && !(img.product_id in imageMap)) {
          imageMap[img.product_id] = img.url
        }
      }
    }

    const result = (items ?? []).map(item => ({
      ...item,
      list_image_url: item.id ? (imageMap[item.id] ?? null) : null,
    }))

    return NextResponse.json({
      items: result,
      total: count ?? 0,
      page,
      limit,
      summary,
    })
  } catch {
    return NextResponse.json(
      { error: '상품 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json() as ProductCreateBody
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name:              body.name,
        price:             body.price,
        product_code:      body.product_code,
        summary:           body.summary,
        short_description: body.short_description ?? null,
        description:       body.description,
        status:            body.status,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 사용 중인 상품코드입니다.' },
          { status: 409 }
        )
      }
      throw error
    }

    // stocks 레코드 생성 (트리거 없을 경우 직접 처리)
    await supabaseAdmin
      .from('stocks')
      .upsert({ product_id: data.id, total: 0, sold: 0 }, { onConflict: 'product_id' })

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: '상품 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}
