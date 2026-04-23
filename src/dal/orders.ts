import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type {
  Order,
  OrderItemRow,
  OrderListQuery,
  OrderListResponse,
  OrderProduct,
  OrderRow,
  PaymentMethod,
} from '@/features/orders/types/order.type'

type OrderSupabaseClient = SupabaseClient<Database>

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'card'

function toOrderProduct(row: OrderItemRow): OrderProduct {
  return {
    name:      row.product_name,
    sku:       row.product_code ?? row.product_id,
    quantity:  row.quantity,
    unitPrice: row.price,
  }
}

function toOrder(row: OrderRow, itemRows: OrderItemRow[]): Order {
  return {
    id:          row.id,
    orderNumber: row.order_number,
    customer:    {
      name:  row.customer_name,
      email: row.customer_email ?? '',
      phone: row.customer_phone ?? '',
    },
    products:        itemRows.map(toOrderProduct),
    totalAmount:     row.total_amount,
    paymentMethod:   row.payment_method ?? DEFAULT_PAYMENT_METHOD,
    orderStatus:     row.order_status,
    paymentStatus:   row.payment_status,
    shippingStatus:  row.shipping_status,
    createdAt:       row.created_at ?? row.updated_at ?? '',
    shippingAddress: row.shipping_address ?? undefined,
  }
}

function groupItemsByOrderId(itemRows: OrderItemRow[]) {
  const itemsByOrderId = new Map<string, OrderItemRow[]>()

  for (const item of itemRows) {
    const items = itemsByOrderId.get(item.order_id) ?? []
    items.push(item)
    itemsByOrderId.set(item.order_id, items)
  }

  return itemsByOrderId
}

export async function getOrders(
  supabase: OrderSupabaseClient,
  query: OrderListQuery = {}
): Promise<OrderListResponse> {
  const page  = Math.max(1, query.page ?? 1)
  const limit = query.limit ?? 20
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  let ordersQuery = supabase
    .from('orders')
    .select('*', { count: 'exact' })

  if (query.search) {
    ordersQuery = ordersQuery.or(
      `order_number.ilike.%${query.search}%,customer_name.ilike.%${query.search}%,customer_email.ilike.%${query.search}%`
    )
  }

  if (query.orderStatus) {
    ordersQuery = ordersQuery.eq('order_status', query.orderStatus)
  }
  if (query.paymentStatus) {
    ordersQuery = ordersQuery.eq('payment_status', query.paymentStatus)
  }
  if (query.shippingStatus) {
    ordersQuery = ordersQuery.eq('shipping_status', query.shippingStatus)
  }
  if (query.paymentMethod) {
    ordersQuery = ordersQuery.eq('payment_method', query.paymentMethod)
  }

  const { data: orderRows, count, error } = await ordersQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const ids = (orderRows ?? []).map((order) => order.id)
  let itemRows: OrderItemRow[] = []

  if (ids.length > 0) {
    const { data, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', ids)

    if (itemError) throw itemError
    itemRows = (data ?? []) as OrderItemRow[]
  }

  const itemsByOrderId = groupItemsByOrderId(itemRows)
  const items = ((orderRows ?? []) as OrderRow[]).map((order) =>
    toOrder(order, itemsByOrderId.get(order.id) ?? [])
  )

  return {
    items,
    total: count ?? 0,
    page,
    limit,
  }
}
