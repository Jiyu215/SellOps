import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { ImageType, ImageFormat } from '@/features/products/types/product.type'
import { requireAuth } from '@/lib/api/requireAuth'
import { createNotification } from '@/lib/notifications'

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_SIZE_MB = 10

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const formData = await request.formData()
    const file     = formData.get('file') as File
    const type     = formData.get('type') as ImageType
    const order    = Number(formData.get('order') ?? 0)

    // 파일 검증
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_FORMATS.includes(ext)) {
      return NextResponse.json(
        { error: 'JPG, PNG, GIF, WebP 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다. (현재: ${sizeMB.toFixed(1)}MB)` },
        { status: 400 }
      )
    }

    // extra 이미지 20장 제한 확인
    if (type === 'extra') {
      const { count } = await supabaseAdmin
        .from('product_images')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('type', 'extra')

      if ((count ?? 0) >= 20) {
        return NextResponse.json(
          { error: '추가 이미지는 최대 20장까지 등록 가능합니다.' },
          { status: 400 }
        )
      }
    }

    // Storage 업로드
    const path = `${id}/${type}_${Date.now()}.${ext}`
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(path, file, { upsert: false })

    if (storageError) {
      void createNotification({
        type:    'system',
        level:   'warning',
        title:   '이미지 업로드 실패',
        message: '이미지 업로드에 실패했습니다. 다시 시도해주세요.',
        link:    `/dashboard/products/${id}`,
      })
      throw storageError
    }

    // Public URL 획득
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(storageData.path)

    // DB 저장
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('product_images')
      .insert({
        product_id: id,
        type,
        url:    publicUrl,
        format: ext === 'jpeg' ? 'jpg' : ext as ImageFormat,
        size_mb: parseFloat(sizeMB.toFixed(2)),
        order,
      })
      .select()
      .single()

    if (dbError) {
      // DB 저장 실패 시 Storage 파일 롤백
      await supabaseAdmin.storage.from('product-images').remove([storageData.path])
      throw dbError
    }

    return NextResponse.json(imageRecord, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
