import type {
  Order,
  OrderListQuery,
  OrderListResponse,
} from '@/features/orders/types/order.type'
import type { OrderDetail } from '@/types/orderDetail'

type OrderStatusPartial = Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>

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

export async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' })

  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? '주문 상세 조회에 실패했습니다.')
  }

  return res.json() as Promise<OrderDetail>
}

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
