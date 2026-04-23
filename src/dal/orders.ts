import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type {
  MemoAuthorType,
  OrderDetail,
  OrderMemoEntry,
  OrderShippingInfo,
  OrderStatusHistoryEntry,
} from '@/types/orderDetail'
import type {
  Order,
  OrderItemRow,
  OrderListQuery,
  OrderListResponse,
  OrderProduct,
  OrderRow,
  OrderStatusHistoryRow,
  PaymentMethod,
} from '@/features/orders/types/order.type'

type OrderSupabaseClient = SupabaseClient<Database>

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'card'

const STATUS_TYPE_LABEL: Record<OrderStatusHistoryRow['status_type'], string> = {
  order_status:    '주문 상태',
  payment_status:  '결제 상태',
  shipping_status: '배송 상태',
}

const STATUS_VALUE_LABEL: Record<string, string> = {
  order_waiting:        '주문대기',
  order_confirmed:      '주문확정',
  order_cancelled:      '주문취소',
  order_completed:      '주문완료',
  payment_pending:      '결제대기',
  payment_completed:    '결제완료',
  payment_failed:       '결제실패',
  payment_cancelled:    '결제취소',
  refund_in_progress:   '환불중',
  refund_completed:     '환불완료',
  shipping_ready:       '배송준비',
  shipping_in_progress: '배송중',
  shipping_completed:   '배송완료',
  shipping_on_hold:     '배송보류',
  return_completed:     '반품완료',
}

const ACTOR_TYPE_LABEL: Record<OrderStatusHistoryRow['actor_type'], string> = {
  admin:    '관리자',
  system:   '시스템',
  customer: '고객',
}

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

function makeTimelineBaseDate(row: OrderRow) {
  return new Date(row.created_at ?? row.updated_at ?? Date.now())
}

function addHistoryEntry(
  entries: OrderStatusHistoryEntry[],
  baseDate: Date,
  minsOffset: number,
  label: string,
  actor: string,
  reason?: string,
) {
  entries.push({
    timestamp: new Date(baseDate.getTime() + minsOffset * 60 * 1000).toISOString(),
    label,
    actor,
    ...(reason ? { reason } : {}),
  })
}

function buildStatusHistory(row: OrderRow): OrderStatusHistoryEntry[] {
  const entries: OrderStatusHistoryEntry[] = []
  const baseDate = makeTimelineBaseDate(row)

  addHistoryEntry(entries, baseDate, 0, '주문 생성', '고객')

  if (
    row.order_status === 'order_cancelled' ||
    row.payment_status === 'payment_cancelled'
  ) {
    addHistoryEntry(entries, baseDate, 30, '주문 취소', '관리자', '고객 요청에 의한 취소')
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  if (row.payment_status === 'payment_failed') {
    addHistoryEntry(entries, baseDate, 5, '결제 실패', '시스템', '결제 승인 거절')
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  if (
    row.payment_status === 'payment_completed' ||
    row.payment_status === 'refund_in_progress' ||
    row.payment_status === 'refund_completed'
  ) {
    addHistoryEntry(entries, baseDate, 1, '결제 완료', '시스템')
  }

  if (row.order_status === 'order_confirmed' || row.order_status === 'order_completed') {
    addHistoryEntry(entries, baseDate, 2, '주문 확정', '관리자')
  }

  if (
    row.shipping_status === 'shipping_ready' ||
    row.shipping_status === 'shipping_in_progress' ||
    row.shipping_status === 'shipping_completed' ||
    row.shipping_status === 'return_completed'
  ) {
    addHistoryEntry(entries, baseDate, 60, '상품 준비', '관리자', '출고 정보 준비 완료')
  }

  if (
    row.shipping_status === 'shipping_in_progress' ||
    row.shipping_status === 'shipping_completed' ||
    row.shipping_status === 'return_completed'
  ) {
    addHistoryEntry(entries, baseDate, 24 * 60, '출고 처리', '관리자')
  }

  if (row.shipping_status === 'shipping_completed' || row.order_status === 'order_completed') {
    addHistoryEntry(entries, baseDate, 72 * 60, '배송 완료', '시스템')
  }

  if (row.payment_status === 'refund_in_progress' || row.payment_status === 'refund_completed') {
    addHistoryEntry(entries, baseDate, 48 * 60, '환불 요청', '고객', '취소/환불 요청')
  }

  if (row.payment_status === 'refund_completed') {
    addHistoryEntry(entries, baseDate, 54 * 60, '환불 완료', '시스템')
  }

  if (row.shipping_status === 'return_completed') {
    addHistoryEntry(entries, baseDate, 80 * 60, '반품 접수', '고객', '상품 불량/변심')
    addHistoryEntry(entries, baseDate, 90 * 60, '반품 완료', '관리자', '반품 처리 완료')
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function buildMemoLog(row: OrderRow): OrderMemoEntry[] {
  if (!row.memo?.trim()) return []

  const timestamp = row.updated_at ?? row.created_at ?? new Date().toISOString()
  return [
    {
      id:         `${row.id}-memo-0`,
      timestamp,
      author:     '관리자',
      authorType: 'admin' as MemoAuthorType,
      content:    row.memo,
    },
  ]
}

function formatStatusValue(value: string | null) {
  if (!value) return ''
  return STATUS_VALUE_LABEL[value] ?? value
}

function toStatusHistoryEntry(row: OrderStatusHistoryRow): OrderStatusHistoryEntry {
  const typeLabel = STATUS_TYPE_LABEL[row.status_type]
  const fromLabel = formatStatusValue(row.from_status)
  const toLabel = formatStatusValue(row.to_status)

  return {
    timestamp: row.created_at,
    label:     fromLabel ? `${typeLabel}: ${fromLabel} → ${toLabel}` : `${typeLabel}: ${toLabel}`,
    actor:     row.actor_name ?? ACTOR_TYPE_LABEL[row.actor_type],
    ...(row.reason ? { reason: row.reason } : {}),
  }
}

function buildShippingInfo(row: OrderRow): OrderShippingInfo {
  return {
    carrier:        '',
    trackingNumber: '',
    recipientName:  row.customer_name,
    recipientPhone: row.customer_phone ?? '',
  }
}

function toOrderDetail(
  row: OrderRow,
  itemRows: OrderItemRow[],
  statusHistoryRows?: OrderStatusHistoryRow[],
): OrderDetail {
  const order = toOrder(row, itemRows)
  const productTotal = order.products.reduce((sum, product) => sum + product.unitPrice * product.quantity, 0)

  return {
    ...order,
    shippingFee:   Math.max(0, row.total_amount - productTotal),
    shippingInfo:   buildShippingInfo(row),
    memoLog:        buildMemoLog(row),
    statusHistory:  statusHistoryRows
      ? statusHistoryRows.map(toStatusHistoryEntry)
      : buildStatusHistory(row),
    paymentDetail:  undefined,
  }
}

function isMissingHistoryTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('order_status_histories'))
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

export async function getOrderDetail(
  supabase: OrderSupabaseClient,
  id: string,
): Promise<OrderDetail | null> {
  const { data: orderRow, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!orderRow) return null

  const { data: itemRows, error: itemError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  if (itemError) throw itemError

  const { data: historyRows, error: historyError } = await supabase
    .from('order_status_histories')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  if (historyError && !isMissingHistoryTableError(historyError)) throw historyError

  return toOrderDetail(
    orderRow as OrderRow,
    (itemRows ?? []) as OrderItemRow[],
    historyError ? undefined : (historyRows ?? []) as OrderStatusHistoryRow[],
  )
}
