import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { orderStatusUpdateSchema } from '@/features/orders/schemas/order.schema'
import type { OrderStatusUpdateInput } from '@/features/orders/schemas/order.schema'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { Tables } from '@/types/supabase'
import { createNotifications } from '@/lib/notifications'
import type { CreateNotificationParams } from '@/lib/notifications'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>
type OrderRow = Tables<'orders'>
type OrderStatusSnapshot = Pick<
  OrderRow,
  'order_number' | 'order_status' | 'payment_status' | 'shipping_status' | 'stock_status'
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

/**
 * Determines whether an error indicates the `order_status_histories` table is missing.
 *
 * Checks common Postgres/PostgREST/Supabase error signals (error codes or message content) to decide.
 *
 * @param error - Error object that may include `code` and/or `message` properties from the database layer
 * @returns `true` if the error corresponds to a missing `order_status_histories` table, `false` otherwise
 */
function isMissingHistoryTableError(error: { code?: string; message?: string }) {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('order_status_histories'))
  )
}

/**
 * Determines the stock operation required for an order based on the current order snapshot and the requested status update.
 *
 * @param current - Current order status snapshot (includes `order_status`, `payment_status`, `shipping_status`, `stock_status`, and `order_number`)
 * @param next - Partial status update payload specifying any of `order_status`, `payment_status`, or `shipping_status`
 * @returns `'reserve'` when stock should be reserved for an order; `'finalize'` when reserved stock should be finalized (permanently deducted); `'restock'` when stock should be returned to inventory; `'none'` when no stock-related action is required
 */
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

/**
 * Map a stock action to the resulting order `stock_status`.
 *
 * @param action - The computed stock action (`'none' | 'reserve' | 'finalize' | 'restock'`)
 * @returns `'applied'` when `action` is `'reserve'` or `'finalize'`, `'released'` when `action` is `'restock'`, `'none'` otherwise
 */
function getDesiredStockStatus(action: StockAction) {
  if (action === 'reserve') return 'applied'
  if (action === 'finalize') return 'applied'
  if (action === 'restock') return 'released'
  return 'none'
}

/**
 * Fetches the current status snapshot for an order.
 *
 * @param id - The order id to fetch (typically a UUID)
 * @returns An OrderStatusSnapshot containing `order_number`, `order_status`, `payment_status`, `shipping_status`, and `stock_status`
 */
async function getCurrentOrderStatus(supabaseAdmin: SupabaseAdmin, id: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('order_number, order_status, payment_status, shipping_status, stock_status')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as OrderStatusSnapshot
}

/**
 * Fetches order items (product ID and quantity) for a given order.
 *
 * @returns An array of order item snapshots, each containing `product_id` and `quantity`.
 * @throws When the database query fails; throws `OrderStockError(400, '주문 상품 정보를 찾을 수 없습니다.')` if no items are found for the order.
 */
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

/**
 * Aggregate order items by product ID into total quantities.
 *
 * @param items - Array of order item snapshots containing `product_id` and `quantity`
 * @returns A Map where each key is a `product_id` and each value is the summed quantity for that product
 */
function groupItemsByProduct(items: OrderItemSnapshot[]) {
  const grouped = new Map<string, number>()

  for (const item of items) {
    grouped.set(item.product_id, (grouped.get(item.product_id) ?? 0) + item.quantity)
  }

  return grouped
}

/**
 * Fetches the stock snapshot for a product by its ID.
 *
 * @param productId - The product identifier to look up in the `stocks` table
 * @returns The stock snapshot containing `product_id`, `total`, and `sold`
 * @throws OrderStockError with status 404 when the stock row is not found
 * @throws Propagates other database errors encountered during the query
 */
async function readStockRow(supabaseAdmin: SupabaseAdmin, productId: string) {
  const { data, error } = await supabaseAdmin
    .from('stocks')
    .select('product_id, total, sold')
    .eq('product_id', productId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new OrderStockError(404, '상품 재고 정보를 찾을 수 없습니다.')
    }
    throw error
  }
  return data as StockSnapshot
}

/**
 * Update the stock record for a product by setting its `total` and `sold` counts.
 *
 * @param productId - The ID of the product whose stock row will be updated
 * @param total - The new total inventory quantity for the product
 * @param sold - The new sold quantity for the product
 * @throws OrderStockError with status 404 when the stock row for `productId` does not exist
 * @throws Any error returned by the database client for other failure cases
 */
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

  if (error) {
    if (error.code === 'PGRST116') {
      throw new OrderStockError(404, '상품 재고 정보를 찾을 수 없습니다.')
    }
    throw error
  }
}

/**
 * Inserts a stock history record for the given product.
 *
 * @param productId - The product's ID to which the history entry applies
 * @param type - The history type (commonly `'in'` for restock or `'out'` for deduction)
 * @param quantity - The quantity to record (positive integer)
 * @param reason - A brief reason or reference for the change (e.g., an order number)
 * @throws The database error returned by the insert operation if the insert fails
 */
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

/**
 * Ensures each ordered item's quantity does not exceed the current available stock.
 *
 * Validates grouped order items against the `stocks` table and throws if any product
 * lacks sufficient available quantity (total - sold).
 *
 * @param items - Order item snapshots to validate (each contains `product_id` and `quantity`)
 * @throws {OrderStockError} When a product's available stock is less than the requested quantity; the error has status `400` and a message including the available count.
 */
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

/**
 * Apply stock mutations for an order and record corresponding stock history entries according to the requested stock action.
 *
 * The function groups order items by product, adjusts `stocks.total` and `stocks.sold` and inserts `stock_histories`
 * entries for each product based on the `action` (`reserve`, `finalize`, or `restock`), then updates the order's
 * `stock_status`.
 *
 * @returns The resulting `stock_status` after applying the action (`'applied'` or `'released'`).
 * @throws OrderStockError - When requested quantities exceed available or total stock.
 * @throws Error - Propagates errors from Supabase reads/updates/inserts when operations fail.
 */
async function applyStockAction(
  supabaseAdmin: SupabaseAdmin,
  orderId: string,
  items: OrderItemSnapshot[],
  action: Exclude<StockAction, 'none'>,
  currentStatus: OrderStatusSnapshot,
) {
  const grouped = groupItemsByProduct(items)
  const nextStockStatus = getDesiredStockStatus(action)
  const orderCode = currentStatus.order_number

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
      await insertStockHistory(supabaseAdmin, productId, 'out', quantity, orderCode)
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

      await insertStockHistory(supabaseAdmin, productId, 'out', quantity, orderCode)
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

    await insertStockHistory(supabaseAdmin, productId, 'in', quantity, orderCode)
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

/**
 * Updates an order row with the provided status fields and creates per-field status history entries for any changed statuses.
 *
 * @param supabaseAdmin - Supabase admin client used to perform the update and history inserts
 * @param id - ID of the order to update
 * @param data - Partial status fields to apply (e.g., `order_status`, `payment_status`, `shipping_status`)
 * @param actorName - Actor name to record on created history entries (actor_type is `'admin'`)
 * @param currentStatus - Current order status snapshot used to detect which status fields changed
 * @returns The updated order row
 * @throws If updating the order or inserting history rows fails; if the `order_status_histories` table is missing, history insertion is ignored and the updated order is still returned
 */
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

/**
 * Build notifications for notable order status transitions.
 *
 * @param update - Incoming status fields to apply to the order.
 * @param current - Current order status snapshot used to detect changes.
 * @param orderId - Order identifier used to construct notification links.
 * @returns An array of notification objects: includes a warning when `order_status` changes to `order_cancelled` and an info notification when `payment_status` changes to `refund_completed`.
 */
function buildOrderStatusNotifications(
  update: OrderStatusUpdateInput,
  current: OrderStatusSnapshot,
  orderId: string,
): CreateNotificationParams[] {
  const notifications: CreateNotificationParams[] = []

  if (
    update.order_status === 'order_cancelled' &&
    current.order_status !== 'order_cancelled'
  ) {
    notifications.push({
      type:    'order',
      level:   'warning',
      title:   '주문 취소 요청',
      message: `주문 ${current.order_number} 취소 요청이 접수되었습니다.`,
      link:    `/dashboard/orders/${orderId}`,
    })
  }

  if (
    update.payment_status === 'refund_completed' &&
    current.payment_status !== 'refund_completed'
  ) {
    notifications.push({
      type:    'order',
      level:   'info',
      title:   '환불 처리 완료',
      message: `주문 ${current.order_number} 환불이 완료되었습니다.`,
      link:    `/dashboard/orders/${orderId}`,
    })
  }

  return notifications
}

/**
 * Handle a PATCH request to update an order's status, performing stock reservation/finalization/restock when required.
 *
 * @param request - Incoming Request whose JSON body must conform to `orderStatusUpdateSchema` and contain one or more status fields to change.
 * @param params - Route params promise resolving to an object with `id`, the order ID to update.
 * @returns The updated order row as JSON on success. On validation errors returns 400 with details; on stock-related errors returns the status code and message from `OrderStockError`; on other failures returns 500 with a generic error message.
 */
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

      const notifications = buildOrderStatusNotifications(parsed.data, currentStatus, id)
      if (notifications.length > 0) void createNotifications(notifications)

      return NextResponse.json(updatedOrder)
    }

    const { data, error } = await supabaseAdmin.rpc('update_order_status_with_stock', {
      p_order_id: id,
      p_order_status: parsed.data.order_status ?? null,
      p_payment_status: parsed.data.payment_status ?? null,
      p_shipping_status: parsed.data.shipping_status ?? null,
      p_actor_type: 'admin',
      p_actor_name: actorName,
      p_reason: currentStatus.order_number,
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

      const notifications = buildOrderStatusNotifications(parsed.data, currentStatus, id)
      if (notifications.length > 0) void createNotifications(notifications)

      return NextResponse.json({
        ...updatedOrder,
        stock_status: stockStatus,
      })
    }

    const notifications = buildOrderStatusNotifications(parsed.data, currentStatus, id)
    if (notifications.length > 0) void createNotifications(notifications)

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
