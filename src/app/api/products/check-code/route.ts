import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

/**
 * Checks whether a product code is available, optionally excluding a specific product ID.
 *
 * If authentication fails, the authentication response is returned. When `code` is missing the response is `{ available: false }`.
 *
 * @returns A JSON response with `{ available: true }` when no product with the given `code` exists (excluding the optional `excludeId`), `{ available: false }` when a matching product exists, or on failure `{ error: '중복 확인에 실패했습니다.' }` with HTTP status 500.
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const code      = searchParams.get('code') ?? ''
    const excludeId = searchParams.get('excludeId')  // 수정 시 자기 자신 제외

    const supabaseAdmin = getSupabaseAdmin()

    if (!code) {
      return NextResponse.json({ available: false })
    }

    let query = supabaseAdmin
      .from('products')
      .select('id')
      .eq('product_code', code)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query

    return NextResponse.json({ available: !data?.length })
  } catch {
    return NextResponse.json(
      { error: '중복 확인에 실패했습니다.' },
      { status: 500 }
    )
  }
}
