import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { createNotification } from '@/lib/notifications'

/**
 * Deletes files from the Supabase `product-images` storage bucket for the given product IDs.
 *
 * @param productIds - Product IDs whose associated storage files (as recorded in `product_images.url`) will be removed
 */
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

/**
 * Handles bulk deletion of products and their associated storage images using provided product IDs.
 *
 * Authenticates the caller, removes related files from the `product-images` storage bucket, then attempts to delete products via the `delete_products` RPC. If the RPC is unavailable (`PGRST202`), performs direct deletions in dependency order (`stock_histories`, `product_images`, `stocks`, then `products`). Emits a notification on successful deletion.
 *
 * @param request - HTTP request whose JSON body must include `{ ids: string[] }`
 * @returns A JSON HTTP response:
 *  - `200` with `{ success: true }` when deletion succeeds,
 *  - `400` with `{ error: '선택된 상품이 없습니다.' }` when `ids` is missing or empty,
 *  - `500` with `{ error: '삭제에 실패했습니다.' }` on unexpected errors.
 *  If authentication fails, returns the response provided by `requireAuth()`.
 */
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
      void createNotification({
        type:    'product',
        level:   'warning',
        title:   '상품 일괄 삭제',
        message: `${ids.length}개 상품이 삭제되었습니다.`,
        link:    '/dashboard/products',
      })
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

    void createNotification({
      type:    'product',
      level:   'warning',
      title:   '상품 일괄 삭제',
      message: `${ids.length}개 상품이 삭제되었습니다.`,
      link:    '/dashboard/products',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
