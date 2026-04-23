import type {
  OrderListQuery,
  OrderListResponse,
} from '@/features/orders/types/order.type'

export async function fetchOrderList(
  query: OrderListQuery = {}
): Promise<OrderListResponse> {
  const params = new URLSearchParams()
  if (query.search)         params.set('search', query.search)
  if (query.orderStatus)    params.set('orderStatus', query.orderStatus)
  if (query.paymentStatus)  params.set('paymentStatus', query.paymentStatus)
  if (query.shippingStatus) params.set('shippingStatus', query.shippingStatus)
  if (query.paymentMethod)  params.set('paymentMethod', query.paymentMethod)
  if (query.page)           params.set('page', String(query.page))
  if (query.limit)          params.set('limit', String(query.limit))

  const res = await fetch(`/api/orders?${params.toString()}`, {
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('주문 목록 조회 실패')
  return res.json() as Promise<OrderListResponse>
}
