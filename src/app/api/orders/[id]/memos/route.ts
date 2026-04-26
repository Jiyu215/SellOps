import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { orderMemoCreateSchema } from '@/features/orders/schemas/order.schema'

/**
 * Create a new admin-authored order memo for the order identified by the route `id`.
 *
 * Validates the request body against `orderMemoCreateSchema` and inserts a row into the `order_memos` table with `author_type` set to `'admin'` and `author_name` derived from the authenticated user.
 *
 * @param request - HTTP request whose JSON body must conform to `orderMemoCreateSchema` (contains `content`)
 * @param params - Route parameters promise resolving to an object with `id`, the target order's identifier
 * @returns The newly created `order_memos` row
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const raw = await request.json()

    const parsed = orderMemoCreateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터가 올바르지 않습니다.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { data, error } = await getSupabaseAdmin()
      .from('order_memos')
      .insert({
        order_id: id,
        author_type: 'admin',
        author_name: auth.user.email ?? auth.user.id,
        content: parsed.data.content,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: '주문 메모 등록에 실패했습니다.' },
      { status: 500 },
    )
  }
}
