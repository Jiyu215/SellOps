import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/api/requireAuth'
import { productUpdateSchema } from '@/features/products/schemas/product.schema'

/**
 * Fetches a product by `id` and returns the product enriched with category name, computed stock availability, and ordered images.
 *
 * @param params - Promise resolving to route parameters; must include `id`
 * @returns A NextResponse JSON containing the product fields plus:
 * - `category_id` (null when absent)
 * - `category_name` (string)
 * - `stock` (object with `product_id`, `total`, `sold`, `available`)
 * - `images` (ordered array)
 * On failure returns an error JSON (404 when not found, 500 on server error).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    // 상품 기본 정보
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: category } = product.category_id
      ? await supabaseAdmin
          .from('categories')
          .select('id, name')
          .eq('id', product.category_id)
          .maybeSingle()
      : { data: null }

    // 재고 조회
    const { data: stock } = await supabaseAdmin
      .from('stocks')
      .select('product_id, total, sold')
      .eq('product_id', id)
      .single()

    // 이미지 조회 (order 기준 정렬)
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('order', { ascending: true })

    return NextResponse.json({
      ...product,
      category_id: product.category_id ?? null,
      category_name: category?.name ?? '',
      stock: stock
        ? { ...stock, available: stock.total - stock.sold }
        : { product_id: id, total: 0, sold: 0, available: 0 },
      images: images ?? [],
    })
  } catch {
    return NextResponse.json(
      { error: '상품 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * Deletes a product and all related storage files and database records by product id.
 *
 * @param _req - Incoming request object (unused).
 * @param params - Route parameters containing `id` of the product to delete.
 * @returns `{ success: true }` when the product and its related records were removed successfully.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    // Storage 이미지 파일 삭제 (DB 삭제 전에)
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', id)

    if (images?.length) {
      const storagePaths = images
        .map((img) => img.url.split('/product-images/')[1])
        .filter(Boolean)
      if (storagePaths.length > 0) {
        await supabaseAdmin.storage.from('product-images').remove(storagePaths)
      }
    }

    // DB 삭제 — RPC 우선, PGRST202(미설치) 시 직접 삭제 폴백
    const { error: rpcError } = await supabaseAdmin.rpc('delete_products', {
      product_ids: [id],
    })

    if (rpcError) {
      if (rpcError.code !== 'PGRST202') throw rpcError

      // RPC 미설치 폴백: 의존성 순서대로 직접 삭제
      await supabaseAdmin.from('stock_histories').delete().eq('product_id', id)
      await supabaseAdmin.from('product_images').delete().eq('product_id', id)
      await supabaseAdmin.from('stocks').delete().eq('product_id', id)

      const { error: productErr } = await supabaseAdmin.from('products').delete().eq('id', id)
      if (productErr) throw productErr
    }

    revalidatePath('/dashboard/products')

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '상품 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * Update fields of a product identified by `id` after validating the request body against `productUpdateSchema`.
 *
 * @returns The updated product row as returned from the database.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const raw = await request.json()

    const parsed = productUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터가 올바르지 않습니다.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: '수정할 필드가 없습니다.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: '상품 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}
