import type {
  Order,
  OrderListQuery,
  OrderListResponse,
} from '@/features/orders/types/order.type'
import type { OrderDetail } from '@/types/orderDetail'

type OrderStatusPartial = Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>

/**
 * Fetches a paginated list of orders using optional filter and pagination parameters.
 *
 * @param query - Optional filters and pagination: `search`, `orderStatus`, `paymentStatus`, `shippingStatus`, `paymentMethod`, `page`, and `limit`
 * @returns An OrderListResponse containing the matching orders and pagination metadata
 * @throws Error if the server responds with a non-ok status
 */
export async function fetchOrderList(
  query: OrderListQuery = {},
): Promise<OrderListResponse> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.orderStatus) params.set('orderStatus', query.orderStatus)
  if (query.paymentStatus) params.set('paymentStatus', query.paymentStatus)
  if (query.shippingStatus) params.set('shippingStatus', query.shippingStatus)
  if (query.paymentMethod) params.set('paymentMethod', query.paymentMethod)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))

  const res = await fetch(`/api/orders?${params.toString()}`, {
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('주문 목록 조회에 실패했습니다.')
  return res.json() as Promise<OrderListResponse>
}

/**
 * Create a memo for the specified order.
 *
 * @param id - The order identifier
 * @param content - The memo text to attach to the order
 * @throws Error - When the API request fails; message will be the server-provided error if available, otherwise `"주문 메모 등록에 실패했습니다."`
 */
export async function createOrderMemo(
  id: string,
  content: string,
): Promise<void> {
  const res = await fetch(`/api/orders/${id}/memos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? '주문 메모 등록에 실패했습니다.')
  }
}

/**
 * Retrieve detailed information for a specific order.
 *
 * @param id - The order identifier
 * @returns The order's detail data as an `OrderDetail` object
 * @throws Error('NOT_FOUND') when the order does not exist (HTTP 404)
 * @throws Error with the server-provided message, or `'주문 상세 조회에 실패했습니다.'` if the request fails for other reasons
 */
export async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' })

  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? '주문 상세 조회에 실패했습니다.')
  }

  return res.json() as Promise<OrderDetail>
}

/**
 * Update one or more status fields for an order on the server.
 *
 * @param id - The identifier of the order to update
 * @param partial - An object containing any of `orderStatus`, `paymentStatus`, and `shippingStatus` to be updated
 * @throws Error - If the HTTP request fails; the error message is the server-provided message when available, otherwise "주문 상태 변경에 실패했습니다."
 */
export async function updateOrderStatus(
  id: string,
  partial: OrderStatusPartial,
): Promise<void> {
  const body: Record<string, string> = {}
  if (partial.orderStatus) body.order_status = partial.orderStatus
  if (partial.paymentStatus) body.payment_status = partial.paymentStatus
  if (partial.shippingStatus) body.shipping_status = partial.shippingStatus

  const res = await fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? '주문 상태 변경에 실패했습니다.')
  }
}
