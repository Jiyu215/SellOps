import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { orderStatusUpdateSchema } from '@/features/orders/schemas/order.schema'
import type { OrderStatusUpdateInput } from '@/features/orders/schemas/order.schema'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>
type OrderStatusSnapshot = {
  order_status: string
  payment_status: string
  shipping_status: string
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || error.message?.includes('update_order_status_with_history')
}

function isMissingHistoryTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('order_status_histories'))
}

async function updateOrderStatusDirectly(
  supabaseAdmin: SupabaseAdmin,
  id: string,
  data: OrderStatusUpdateInput,
  actorName: string,
) {
  const { data: current, error: currentError } = await supabaseAdmin
    .from('orders')
    .select('order_status, payment_status, shipping_status')
    .eq('id', id)
    .single()

  if (currentError) throw currentError

  const updatedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ ...data, updated_at: updatedAt })
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw updateError

  const currentStatus = current as OrderStatusSnapshot
  const histories = [
    data.order_status && data.order_status !== currentStatus.order_status
      ? {
        order_id: id,
        status_type: 'order_status',
        from_status: currentStatus.order_status,
        to_status: data.order_status,
        actor_type: 'admin',
        actor_name: actorName,
        reason: null,
        created_at: updatedAt,
      }
      : null,
    data.payment_status && data.payment_status !== currentStatus.payment_status
      ? {
        order_id: id,
        status_type: 'payment_status',
        from_status: currentStatus.payment_status,
        to_status: data.payment_status,
        actor_type: 'admin',
        actor_name: actorName,
        reason: null,
        created_at: updatedAt,
      }
      : null,
    data.shipping_status && data.shipping_status !== currentStatus.shipping_status
      ? {
        order_id: id,
        status_type: 'shipping_status',
        from_status: currentStatus.shipping_status,
        to_status: data.shipping_status,
        actor_type: 'admin',
        actor_name: actorName,
        reason: null,
        created_at: updatedAt,
      }
      : null,
  ].filter((history) => history !== null)

  if (histories.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from('order_status_histories')
      .insert(histories)

    if (historyError && isMissingHistoryTableError(historyError)) return updated
    if (historyError) throw historyError
  }

  return updated
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const raw = await request.json()

    const parsed = orderStatusUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터가 올바르지 않습니다.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: '수정할 상태 필드가 없습니다.' },
        { status: 400 },
      )
    }

    const actorName = auth.user.email ?? auth.user.id
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.rpc('update_order_status_with_history', {
      p_order_id:        id,
      p_order_status:    parsed.data.order_status ?? null,
      p_payment_status:  parsed.data.payment_status ?? null,
      p_shipping_status: parsed.data.shipping_status ?? null,
      p_actor_type:      'admin',
      p_actor_name:      actorName,
      p_reason:          null,
    })

    if (error) {
      if (!isMissingRpcError(error)) throw error

      const updated = await updateOrderStatusDirectly(
        supabaseAdmin,
        id,
        parsed.data,
        actorName,
      )

      return NextResponse.json(updated)
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: '주문 상태 변경에 실패했습니다.' },
      { status: 500 },
    )
  }
}
