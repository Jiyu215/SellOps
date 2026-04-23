import { fetchOrderList, updateOrderStatus } from './order.api'

const mockFetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = mockFetch
})

describe('fetchOrderList', () => {
  test('query를 /api/orders 검색 파라미터로 전달한다', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 }),
    })

    await fetchOrderList({
      search:         'SO-2026',
      orderStatus:    'order_confirmed',
      paymentStatus:  'payment_completed',
      shippingStatus: 'shipping_ready',
      paymentMethod:  'card',
      page:           1,
      limit:          100,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/orders?search=SO-2026&orderStatus=order_confirmed&paymentStatus=payment_completed&shippingStatus=shipping_ready&paymentMethod=card&page=1&limit=100',
      { cache: 'no-store' },
    )
  })
})

describe('updateOrderStatus', () => {
  test('camelCase 상태 partial을 snake_case body로 변환해 PATCH 요청한다', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: jest.fn(),
    })

    await updateOrderStatus('order-001', {
      orderStatus:    'order_confirmed',
      paymentStatus:  'payment_completed',
      shippingStatus: 'shipping_in_progress',
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/order-001/status', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        order_status:    'order_confirmed',
        payment_status:  'payment_completed',
        shipping_status: 'shipping_in_progress',
      }),
    })
  })

  test('실패 응답이면 API 에러 메시지를 throw한다', async () => {
    mockFetch.mockResolvedValue({
      ok:   false,
      json: jest.fn().mockResolvedValue({ error: '주문 상태 변경에 실패했습니다.' }),
    })

    await expect(
      updateOrderStatus('order-001', { shippingStatus: 'shipping_ready' })
    ).rejects.toThrow('주문 상태 변경에 실패했습니다.')
  })
})
