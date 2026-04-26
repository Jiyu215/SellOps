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
  OrderMemoRow,
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

const MEMO_AUTHOR_LABEL: Record<MemoAuthorType, string> = {
  admin: '관리자',
  cs: 'CS',
  customer: '고객',
}

/**
 * Convert a single order item database row into an OrderProduct domain object.
 *
 * @param row - The order item row from the database
 * @returns An OrderProduct with `name`, `sku` (uses `product_code` or falls back to `product_id`), `quantity`, and `unitPrice`
 */
function toOrderProduct(row: OrderItemRow): OrderProduct {
  return {
    name:      row.product_name,
    sku:       row.product_code ?? row.product_id,
    quantity:  row.quantity,
    unitPrice: row.price,
  }
}

/**
 * Builds an Order domain object from a database order row and its item rows.
 *
 * @param row - The order database row containing order-level fields
 * @param itemRows - The order item rows to be converted into `products`
 * @returns An Order object with customer info, mapped products, payment/status fields, `createdAt` (falls back to `updated_at` or empty string), `paymentMethod` defaulting to `'card'` when absent, and `shippingAddress` set to `undefined` when not provided
 */
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

/**
 * Group order item rows by their `order_id`.
 *
 * @param itemRows - Array of order item rows to group
 * @returns A Map where each key is an order ID and each value is an array of `OrderItemRow` belonging to that order
 */
function groupItemsByOrderId(itemRows: OrderItemRow[]) {
  const itemsByOrderId = new Map<string, OrderItemRow[]>()

  for (const item of itemRows) {
    const items = itemsByOrderId.get(item.order_id) ?? []
    items.push(item)
    itemsByOrderId.set(item.order_id, items)
  }

  return itemsByOrderId
}

/**
 * Establishes the base timestamp for synthetic order timeline entries.
 *
 * @param row - Order row; `created_at` is preferred and `updated_at` is used if `created_at` is missing
 * @returns A Date used as the base timestamp: `created_at` if present, otherwise `updated_at`, otherwise the current time
 */
function makeTimelineBaseDate(row: OrderRow) {
  return new Date(row.created_at ?? row.updated_at ?? Date.now())
}

/**
 * Appends a status history entry computed from a base date and minute offset.
 *
 * @param entries - The array that will receive the new history entry.
 * @param baseDate - Reference date used to compute the entry's timestamp.
 * @param minsOffset - Minutes to add to `baseDate` to create the entry timestamp.
 * @param label - Display label for the history entry.
 * @param actor - Actor name associated with the entry.
 * @param reason - Optional reason text to include on the entry.
 */
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

/**
 * Builds a chronological status timeline for an order by synthesizing history entries from the order's current status fields.
 *
 * @param row - Order row used to derive timeline entries when persisted history is absent
 * @returns An array of OrderStatusHistoryEntry objects representing the order's status timeline, sorted newest-first by timestamp
 */
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

/**
 * Creates a memo log entry from an order row when a memo is present.
 *
 * @param row - The order row that may contain `memo`, `created_at`, and `updated_at` fields
 * @returns An array containing a single `OrderMemoEntry` for the order's memo, or an empty array if the memo is missing or blank
 */
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

/**
 * Convert a persisted memo row into an OrderMemoEntry.
 *
 * @returns An OrderMemoEntry containing `id`, `timestamp`, `author` (uses `row.author_name` when present; otherwise a localized label for `row.author_type`), `authorType`, and `content`.
 */
function toMemoEntry(row: OrderMemoRow): OrderMemoEntry {
  return {
    id:         row.id,
    timestamp:  row.created_at,
    author:     row.author_name ?? MEMO_AUTHOR_LABEL[row.author_type],
    authorType: row.author_type,
    content:    row.content,
  }
}

/**
 * Map a status key to its user-facing label for display; return an empty string for null/empty input.
 *
 * @param value - The status key to format (e.g., `payment_completed`) or `null`
 * @returns The mapped display label when available, the original `value` when no mapping exists, or `''` when `value` is null/empty
 */
function formatStatusValue(value: string | null) {
  if (!value) return ''
  return STATUS_VALUE_LABEL[value] ?? value
}

/**
 * Convert a persisted order status history row into a display-ready status history entry.
 *
 * @param row - The status history row from the database to convert
 * @returns An OrderStatusHistoryEntry with:
 *  - `timestamp` taken from the row's `created_at`
 *  - `label` combining the status type and `from → to` when `from` exists, otherwise `type: to`
 *  - `actor` using `actor_name` when present, otherwise a localized label for `actor_type`
 *  - `reason` included when present on the row
 */
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

/**
 * Build shipping information from an order's customer fields.
 *
 * @param row - The order row to extract recipient name and phone from
 * @returns Shipping info with `carrier` and `trackingNumber` set to empty strings, `recipientName` set to the order's `customer_name`, and `recipientPhone` set to the order's `customer_phone` or an empty string if absent
 */
function buildShippingInfo(row: OrderRow): OrderShippingInfo {
  return {
    carrier:        '',
    trackingNumber: '',
    recipientName:  row.customer_name,
    recipientPhone: row.customer_phone ?? '',
  }
}

/**
 * Builds a complete OrderDetail object from an order row and its related rows.
 *
 * @param row - The primary order row used as the source of truth for order fields.
 * @param itemRows - Order item rows associated with the order; used to populate products and compute totals.
 * @param memoRows - Optional persisted memo rows; when provided and non-empty they are converted into the memo log, otherwise a synthesized memo log is produced from `row`.
 * @param statusHistoryRows - Optional persisted status history rows; when provided they are converted into the status history, otherwise a synthesized status history is produced from `row`.
 * @returns The assembled OrderDetail including products, shipping info, shippingFee (derived from totals), memoLog, statusHistory, and other order fields.
 */
function toOrderDetail(
  row: OrderRow,
  itemRows: OrderItemRow[],
  memoRows?: OrderMemoRow[],
  statusHistoryRows?: OrderStatusHistoryRow[],
): OrderDetail {
  const order = toOrder(row, itemRows)
  const productTotal = order.products.reduce((sum, product) => sum + product.unitPrice * product.quantity, 0)

  return {
    ...order,
    shippingFee:   Math.max(0, row.total_amount - productTotal),
    shippingInfo:   buildShippingInfo(row),
    memoLog:        memoRows && memoRows.length > 0
      ? memoRows.map(toMemoEntry)
      : buildMemoLog(row),
    statusHistory:  statusHistoryRows
      ? statusHistoryRows.map(toStatusHistoryEntry)
      : buildStatusHistory(row),
    paymentDetail:  undefined,
  }
}

/**
 * Detects whether an error corresponds to a missing `order_status_histories` table.
 *
 * @param error - Error-like object potentially containing `code` and `message` fields
 * @returns `true` if the error indicates the `order_status_histories` table is missing, `false` otherwise
 */
function isMissingHistoryTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('order_status_histories'))
}

/**
 * Detects whether an error indicates the `order_memos` table is missing.
 *
 * @param error - Error object returned by Supabase/PostgREST
 * @returns `true` if the error represents a missing `order_memos` table, `false` otherwise.
 */
function isMissingMemoTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('order_memos'))
}

/**
 * Fetches a paginated list of orders, attaches their products, and returns the total count.
 *
 * @param query - Optional filters and pagination: `page` (1-based), `limit`, `search` (matches order number, customer name, or email), `orderStatus`, `paymentStatus`, `shippingStatus`, and `paymentMethod`.
 * @returns An object with:
 *  - `items`: Array of `Order` objects (each includes its products),
 *  - `total`: Total number of orders matching the filters,
 *  - `page`: Resolved page number,
 *  - `limit`: Resolved page size
 */
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

/**
 * Fetches full details for a single order, including items, memo log, and status history.
 *
 * If memo or status-history tables are missing, their logs are treated as absent and the function falls back to synthesized memo/status entries. Throws when required queries fail.
 *
 * @param id - The order's unique identifier
 * @returns An OrderDetail for the specified order, or `null` if no order with the given id exists
 * @throws When the orders or order_items queries fail, or when memo/status queries fail for reasons other than a missing table
 */
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

  const { data: memoRows, error: memoError } = await supabase
    .from('order_memos')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  if (memoError && !isMissingMemoTableError(memoError)) throw memoError

  const { data: historyRows, error: historyError } = await supabase
    .from('order_status_histories')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  if (historyError && !isMissingHistoryTableError(historyError)) throw historyError

  return toOrderDetail(
    orderRow as OrderRow,
    (itemRows ?? []) as OrderItemRow[],
    memoError ? undefined : (memoRows ?? []) as OrderMemoRow[],
    historyError ? undefined : (historyRows ?? []) as OrderStatusHistoryRow[],
  )
}
