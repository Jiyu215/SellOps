import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { orderStatusUpdateSchema } from '@/features/orders/schemas/order.schema'
import type { OrderStatusUpdateInput } from '@/features/orders/schemas/order.schema'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { Tables } from '@/types/supabase'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>
type OrderRow = Tables<'orders'>
type OrderStatusSnapshot = Pick<
  OrderRow,
  'order_status' | 'payment_status' | 'shipping_status' | 'stock_status'
>
type OrderItemSnapshot = Pick<Tables<'order_items'>, 'product_id' | 'quantity'>
type StockSnapshot = Pick<Tables<'stocks'>, 'product_id' | 'total' | 'sold'>

type StockAction = 'none' | 'reserve' | 'finalize' | 'restock'

class OrderStockError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'OrderStockError'
    this.status = status
  }
}

function isMissingHistoryTableError(error: { code?: string; message?: string }) {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('order_status_histories'))
  )
}

function getStockAction(
  current: OrderStatusSnapshot,
  next: OrderStatusUpdateInput,
): StockAction {
  const hasOrderStatus = Object.prototype.hasOwnProperty.call(next, 'order_status')
  const hasPaymentStatus = Object.prototype.hasOwnProperty.call(next, 'payment_status')
  const hasShippingStatus = Object.prototype.hasOwnProperty.call(next, 'shipping_status')

  if (
    current.stock_status === 'none' &&
    hasShippingStatus &&
    next.shipping_status === 'shipping_in_progress'
  ) {
    return 'reserve'
  }

  if (
    (
      current.stock_status === 'none' ||
      (current.stock_status === 'applied' && current.shipping_status === 'shipping_in_progress')
    ) &&
    (
      (hasShippingStatus && next.shipping_status === 'shipping_completed') ||
      (hasOrderStatus && next.order_status === 'order_completed')
    )
  ) {
    return 'finalize'
  }

  if (
    current.stock_status === 'applied' &&
    (
      (hasShippingStatus && next.shipping_status === 'return_completed') ||
      (hasPaymentStatus && next.payment_status === 'refund_completed')
    )
  ) {
    return 'restock'
  }

  return 'none'
}

function getDesiredStockStatus(action: StockAction) {
  if (action === 'reserve') return 'applied'
  if (action === 'finalize') return 'applied'
  if (action === 'restock') return 'released'
  return 'none'
}

async function getCurrentOrderStatus(supabaseAdmin: SupabaseAdmin, id: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('order_status, payment_status, shipping_status, stock_status')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as OrderStatusSnapshot
}

async function getOrderItems(supabaseAdmin: SupabaseAdmin, id: string) {
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', id)

  if (error) throw error

  const items = (data ?? []) as OrderItemSnapshot[]
  if (items.length === 0) {
    throw new OrderStockError(400, '주문 상품 정보를 찾을 수 없습니다.')
  }

  return items
}

function groupItemsByProduct(items: OrderItemSnapshot[]) {
  const grouped = new Map<string, number>()

  for (const item of items) {
    grouped.set(item.product_id, (grouped.get(item.product_id) ?? 0) + item.quantity)
  }

  return grouped
}

async function readStockRow(supabaseAdmin: SupabaseAdmin, productId: string) {
  const { data, error } = await supabaseAdmin
    .from('stocks')
    .select('product_id, total, sold')
    .eq('product_id', productId)
    .single()

  if (error) throw error
  return data as StockSnapshot
}

async function updateStockRow(
  supabaseAdmin: SupabaseAdmin,
  productId: string,
  total: number,
  sold: number,
) {
  const { error } = await supabaseAdmin
    .from('stocks')
    .update({ total, sold })
    .eq('product_id', productId)
    .select('product_id')
    .single()

  if (error) throw error
}

async function insertStockHistory(
  supabaseAdmin: SupabaseAdmin,
  productId: string,
  type: string,
  quantity: number,
  reason: string,
) {
  const { error } = await supabaseAdmin
    .from('stock_histories')
    .insert({
      product_id: productId,
      type,
      quantity,
      reason,
    })

  if (error) throw error
}

async function validateStockAvailability(
  supabaseAdmin: SupabaseAdmin,
  items: OrderItemSnapshot[],
) {
  const grouped = groupItemsByProduct(items)

  for (const [productId, quantity] of grouped) {
    const stock = await readStockRow(supabaseAdmin, productId)
    const available = stock.total - stock.sold

    if (available < quantity) {
      throw new OrderStockError(
        400,
        `가용 재고보다 많은 수량입니다. (가용: ${available}개)`,
      )
    }
  }
}

async function applyStockAction(
  supabaseAdmin: SupabaseAdmin,
  orderId: string,
  items: OrderItemSnapshot[],
  action: Exclude<StockAction, 'none'>,
  currentStatus: OrderStatusSnapshot,
) {
  const grouped = groupItemsByProduct(items)
  const nextStockStatus = getDesiredStockStatus(action)

  for (const [productId, quantity] of grouped) {
    const stock = await readStockRow(supabaseAdmin, productId)

    if (action === 'reserve') {
      const available = stock.total - stock.sold

      if (available < quantity) {
        throw new OrderStockError(
          400,
          `가용 재고보다 많은 수량입니다. (가용: ${available}개)`,
        )
      }

      await updateStockRow(supabaseAdmin, productId, stock.total, stock.sold + quantity)
      await insertStockHistory(supabaseAdmin, productId, 'out', quantity, `주문 예약: ${orderId}`)
      continue
    }

    if (action === 'finalize') {
      if (stock.total < quantity) {
        throw new OrderStockError(
          400,
          `전체 재고보다 많은 수량입니다. (전체: ${stock.total}개)`,
        )
      }

      if (
        currentStatus.stock_status === 'applied' &&
        currentStatus.shipping_status === 'shipping_in_progress'
      ) {
        await updateStockRow(
          supabaseAdmin,
          productId,
          stock.total - quantity,
          Math.max(stock.sold - quantity, 0),
        )
      } else {
        await updateStockRow(supabaseAdmin, productId, stock.total - quantity, stock.sold)
      }

      await insertStockHistory(supabaseAdmin, productId, 'out', quantity, `주문 출고: ${orderId}`)
      continue
    }

    if (
      currentStatus.stock_status === 'applied' &&
      currentStatus.shipping_status === 'shipping_in_progress'
    ) {
      await updateStockRow(
        supabaseAdmin,
        productId,
        stock.total,
        Math.max(stock.sold - quantity, 0),
      )
    } else {
      await updateStockRow(supabaseAdmin, productId, stock.total + quantity, stock.sold)
    }

    await insertStockHistory(supabaseAdmin, productId, 'in', quantity, `주문 반품 완료: ${orderId}`)
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      stock_status: nextStockStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('stock_status')
    .single()

  if (error) throw error

  return nextStockStatus
}

async function updateOrderStatusDirectly(
  supabaseAdmin: SupabaseAdmin,
  id: string,
  data: OrderStatusUpdateInput,
  actorName: string,
  currentStatus: OrderStatusSnapshot,
) {
  const updatedAt = new Date().toISOString()

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ ...data, updated_at: updatedAt })
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw updateError

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
    const currentStatus = await getCurrentOrderStatus(supabaseAdmin, id)
    const stockAction = getStockAction(currentStatus, parsed.data)
    const orderItems = stockAction === 'none' ? [] : await getOrderItems(supabaseAdmin, id)

    if (stockAction === 'reserve') {
      await validateStockAvailability(supabaseAdmin, orderItems)
    }

    if (stockAction === 'none') {
      const updatedOrder = await updateOrderStatusDirectly(
        supabaseAdmin,
        id,
        parsed.data,
        actorName,
        currentStatus,
      )

      return NextResponse.json(updatedOrder)
    }

    const { data, error } = await supabaseAdmin.rpc('update_order_status_with_stock', {
      p_order_id: id,
      p_order_status: parsed.data.order_status ?? null,
      p_payment_status: parsed.data.payment_status ?? null,
      p_shipping_status: parsed.data.shipping_status ?? null,
      p_actor_type: 'admin',
      p_actor_name: actorName,
      p_reason: null,
    })

    if (error) {
      const updatedOrder = await updateOrderStatusDirectly(
        supabaseAdmin,
        id,
        parsed.data,
        actorName,
        currentStatus,
      ) as OrderRow

      const stockStatus = await applyStockAction(
        supabaseAdmin,
        id,
        orderItems,
        stockAction,
        currentStatus,
      )

      return NextResponse.json({
        ...updatedOrder,
        stock_status: stockStatus,
      })
    }

    return NextResponse.json(data as OrderRow)
  } catch (error) {
    if (error instanceof OrderStockError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: '주문 상태 변경에 실패했습니다.' },
      { status: 500 },
    )
  }
}
