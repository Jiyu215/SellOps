/**
 * @jest-environment node
 */

jest.mock('server-only', () => ({}), { virtual: true })

import { getOrders } from './orders'
import type { OrderItemRow, OrderRow } from '@/features/orders/types/order.type'

const ORDER_ROW: OrderRow = {
  id:               'order-001',
  order_number:     'SO-2026-000001',
  customer_name:    '홍길동',
  customer_email:   'hong@example.com',
  customer_phone:   '010-1111-2222',
  total_amount:     139000,
  status:           'paid',
  memo:             null,
  created_at:       '2026-04-23T00:00:00.000Z',
  updated_at:       '2026-04-23T00:10:00.000Z',
  order_status:     'order_confirmed',
  payment_status:   'payment_completed',
  shipping_status:  'shipping_ready',
  payment_method:   'card',
  shipping_address: '서울시 강남구',
  stock_status:     'none',
}

const ITEM_ROW: OrderItemRow = {
  order_id:     'order-001',
  product_id:   'product-001',
  product_name: 'MX Keys S',
  price:        139000,
  quantity:     1,
  product_code: 'KB-MXS-BLK',
  created_at:   '2026-04-23T00:00:00.000Z',
}

function makeSupabaseMock(
  orderRows: OrderRow[] = [ORDER_ROW],
  itemRows: OrderItemRow[] = [ITEM_ROW]
) {
  const ordersChain = {
    select: jest.fn(),
    or:     jest.fn(),
    eq:     jest.fn(),
    order:  jest.fn(),
    range:  jest.fn().mockResolvedValue({
      data:  orderRows,
      count: orderRows.length,
      error: null,
    }),
  }
  ordersChain.select.mockReturnValue(ordersChain)
  ordersChain.or.mockReturnValue(ordersChain)
  ordersChain.eq.mockReturnValue(ordersChain)
  ordersChain.order.mockReturnValue(ordersChain)

  const itemIn = jest.fn().mockResolvedValue({
    data:  itemRows,
    error: null,
  })
  const itemChain = {
    select: jest.fn().mockReturnValue({ in: itemIn }),
  }

  const from = jest.fn((table: string) => {
    if (table === 'orders') return ordersChain
    if (table === 'order_items') return itemChain
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    supabase: { from },
    from,
    ordersChain,
    itemChain,
    itemIn,
  }
}

describe('getOrders', () => {
  test('orders와 order_items를 UI Order 목록으로 변환한다', async () => {
    const { supabase } = makeSupabaseMock()

    const result = await getOrders(supabase as never)

    expect(result).toEqual({
      items: [
        {
          id:          'order-001',
          orderNumber: 'SO-2026-000001',
          customer:    {
            name:  '홍길동',
            email: 'hong@example.com',
            phone: '010-1111-2222',
          },
          products: [
            {
              name:      'MX Keys S',
              sku:       'KB-MXS-BLK',
              quantity:  1,
              unitPrice: 139000,
            },
          ],
          totalAmount:     139000,
          paymentMethod:   'card',
          orderStatus:     'order_confirmed',
          paymentStatus:   'payment_completed',
          shippingStatus:  'shipping_ready',
          createdAt:       '2026-04-23T00:00:00.000Z',
          shippingAddress: '서울시 강남구',
        },
      ],
      total: 1,
      page:  1,
      limit: 20,
    })
  })

  test('검색어와 상태 필터를 Supabase query에 적용한다', async () => {
    const { supabase, ordersChain } = makeSupabaseMock()

    await getOrders(supabase as never, {
      search:         '홍길동',
      orderStatus:    'order_confirmed',
      paymentStatus:  'payment_completed',
      shippingStatus: 'shipping_ready',
      paymentMethod:  'card',
      page:           2,
      limit:          50,
    })

    expect(ordersChain.or).toHaveBeenCalledWith(
      'order_number.ilike.%홍길동%,customer_name.ilike.%홍길동%,customer_email.ilike.%홍길동%'
    )
    expect(ordersChain.eq).toHaveBeenCalledWith('order_status', 'order_confirmed')
    expect(ordersChain.eq).toHaveBeenCalledWith('payment_status', 'payment_completed')
    expect(ordersChain.eq).toHaveBeenCalledWith('shipping_status', 'shipping_ready')
    expect(ordersChain.eq).toHaveBeenCalledWith('payment_method', 'card')
    expect(ordersChain.range).toHaveBeenCalledWith(50, 99)
  })

  test('주문이 없으면 order_items를 조회하지 않는다', async () => {
    const { supabase, itemChain } = makeSupabaseMock([], [])

    const result = await getOrders(supabase as never)

    expect(result.items).toEqual([])
    expect(itemChain.select).not.toHaveBeenCalled()
  })
})
