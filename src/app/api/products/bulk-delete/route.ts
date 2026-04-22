import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

/** Storage에서 product_images 버킷의 파일들을 일괄 삭제 */
async function deleteStorageImages(productIds: string[]): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('url')
    .in('product_id', productIds)

  if (!images?.length) return

  const storagePaths = images
    .map((img) => img.url.split('/product-images/')[1])
    .filter(Boolean)

  if (storagePaths.length > 0) {
    await supabaseAdmin.storage.from('product-images').remove(storagePaths)
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { ids } = await request.json() as { ids: string[] }

    const supabaseAdmin = getSupabaseAdmin()

    if (!ids?.length) {
      return NextResponse.json(
        { error: '선택된 상품이 없습니다.' },
        { status: 400 }
      )
    }

    // Storage 이미지 먼저 삭제 (DB 삭제 전에)
    await deleteStorageImages(ids)

    // 1차 시도: delete_products RPC 함수 (stock_histories replica identity 문제 우회)
    const { error: rpcError } = await supabaseAdmin.rpc('delete_products', {
      product_ids: ids,
    })

    if (!rpcError) {
      return NextResponse.json({ success: true })
    }

    // RPC 함수 미설치(PGRST202) 시 직접 삭제 폴백
    if (rpcError.code !== 'PGRST202') {
      throw rpcError
    }

    // 2차 시도: 직접 삭제 (의존성 순서대로)
    await supabaseAdmin.from('stock_histories').delete().in('product_id', ids)
    await supabaseAdmin.from('product_images').delete().in('product_id', ids)
    await supabaseAdmin.from('stocks').delete().in('product_id', ids)

    const { error } = await supabaseAdmin
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
