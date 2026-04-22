import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/api/requireAuth'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...body, updated_at: new Date().toISOString() })
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
