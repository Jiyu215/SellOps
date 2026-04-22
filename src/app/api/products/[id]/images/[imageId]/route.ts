import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id, imageId } = await params
    const supabaseAdmin = getSupabaseAdmin()

    // DB에서 URL 먼저 조회 (Storage path 추출용)
    const { data: image, error: fetchError } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('id', imageId)
      .eq('product_id', id)
      .single()

    if (fetchError || !image) {
      return NextResponse.json(
        { error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Storage 파일 삭제
    const storagePath = image.url.split('/product-images/')[1]
    if (storagePath) {
      await supabaseAdmin.storage.from('product-images').remove([storagePath])
    }

    // DB 삭제
    const { error: dbError } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: '이미지 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
