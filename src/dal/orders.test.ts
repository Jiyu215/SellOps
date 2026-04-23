/**
 * @jest-environment node
 */

jest.mock('server-only', () => ({}), { virtual: true })

import { getOrderDetail, getOrders } from './orders'
import type { OrderItemRow, OrderRow } from '@/features/orders/types/order.type'

const ORDER_ROW: OrderRow = {
  id:               'order-001',
  order_number:     'SO-2026-000001',
  customer_name:    'Hong Gil Dong',
  customer_email:   'hong@example.com',
  customer_phone:   '010-1111-2222',
  total_amount:     139000,
  status:           'paid',
  memo:             '검수 완료',
  created_at:       '2026-04-23T00:00:00.000Z',
  updated_at:       '2026-04-23T00:10:00.000Z',
  order_status:     'order_confirmed',
  payment_status:   'payment_completed',
  shipping_status:  'shipping_ready',
  payment_method:   'card',
  shipping_address: '서울특별시 강남구',
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

function makeListSupabaseMock(
  orderRows: OrderRow[] = [ORDER_ROW],
  itemRows: OrderItemRow[] = [ITEM_ROW],
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
    ordersChain,
    itemChain,
  }
}

function makeDetailSupabaseMock(
  orderRow: OrderRow | null = ORDER_ROW,
  itemRows: OrderItemRow[] = [ITEM_ROW],
) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data:  orderRow,
    error: null,
  })
  const orderEq = jest.fn().mockReturnValue({ maybeSingle })
  const orderSelect = jest.fn().mockReturnValue({ eq: orderEq })
  const orderChain = {
    select: orderSelect,
    eq:     orderEq,
  }

  const itemEq = jest.fn().mockResolvedValue({
    data:  itemRows,
    error: null,
  })
  const itemChain = {
    select: jest.fn().mockReturnValue({ eq: itemEq }),
  }

  const from = jest.fn((table: string) => {
    if (table === 'orders') return orderChain
    if (table === 'order_items') return itemChain
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    supabase: { from },
    orderChain,
    itemChain,
  }
}

describe('getOrders', () => {
  test('maps orders + order_items to UI orders', async () => {
    const { supabase } = makeListSupabaseMock()

    const result = await getOrders(supabase as never)

    expect(result).toEqual({
      items: [
        {
          id:          'order-001',
          orderNumber: 'SO-2026-000001',
          customer:    {
            name:  'Hong Gil Dong',
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
          shippingAddress: '서울특별시 강남구',
        },
      ],
      total: 1,
      page:  1,
      limit: 20,
    })
  })

  test('applies query filters and pagination to Supabase query', async () => {
    const { supabase, ordersChain } = makeListSupabaseMock()

    await getOrders(supabase as never, {
      search:         'Hong',
      orderStatus:    'order_confirmed',
      paymentStatus:  'payment_completed',
      shippingStatus: 'shipping_ready',
      paymentMethod:  'card',
      page:           2,
      limit:          50,
    })

    expect(ordersChain.or).toHaveBeenCalledWith(
      'order_number.ilike.%Hong%,customer_name.ilike.%Hong%,customer_email.ilike.%Hong%',
    )
    expect(ordersChain.eq).toHaveBeenCalledWith('order_status', 'order_confirmed')
    expect(ordersChain.eq).toHaveBeenCalledWith('payment_status', 'payment_completed')
    expect(ordersChain.eq).toHaveBeenCalledWith('shipping_status', 'shipping_ready')
    expect(ordersChain.eq).toHaveBeenCalledWith('payment_method', 'card')
    expect(ordersChain.range).toHaveBeenCalledWith(50, 99)
  })

  test('does not query order_items when there are no orders', async () => {
    const { supabase, itemChain } = makeListSupabaseMock([], [])

    const result = await getOrders(supabase as never)

    expect(result.items).toEqual([])
    expect(itemChain.select).not.toHaveBeenCalled()
  })
})

describe('getOrderDetail', () => {
  test('maps orders + order_items to OrderDetail', async () => {
    const { supabase } = makeDetailSupabaseMock()

    const result = await getOrderDetail(supabase as never, 'order-001')

    expect(result).toEqual(
      expect.objectContaining({
        id:            'order-001',
        orderNumber:    'SO-2026-000001',
        totalAmount:    139000,
        shippingFee:    0,
        paymentMethod:  'card',
        orderStatus:    'order_confirmed',
        paymentStatus:  'payment_completed',
        shippingStatus: 'shipping_ready',
        shippingInfo:   expect.objectContaining({
          recipientName:  'Hong Gil Dong',
          recipientPhone: '010-1111-2222',
        }),
        memoLog: [
          expect.objectContaining({
            id:         'order-001-memo-0',
            author:     '관리자',
            authorType: 'admin',
            content:    '검수 완료',
          }),
        ],
        statusHistory: expect.arrayContaining([
          expect.objectContaining({ label: '주문 생성' }),
          expect.objectContaining({ label: '결제 완료' }),
          expect.objectContaining({ label: '주문 확정' }),
        ]),
      }),
    )
  })

  test('returns null when order does not exist', async () => {
    const { supabase } = makeDetailSupabaseMock(null)

    const result = await getOrderDetail(supabase as never, 'missing')

    expect(result).toBeNull()
  })
})
