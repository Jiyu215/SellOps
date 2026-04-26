import type { Order } from '@/types/dashboard'
import {
  ACTION_CONFIG,
  getActionsForOrder,
  getTransitionForAction,
} from './orderActionUtils'

function mkOrder(
  overrides: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>,
): Order {
  return {
    id: 'o-001',
    orderNumber: 'ORD-001',
    customer: { name: '테스트 고객', email: 'hong@example.com', phone: '010-0000-0000' },
    products: [{ name: '테스트 상품', sku: 'TST-001', quantity: 1, unitPrice: 10000 }],
    totalAmount: 10000,
    paymentMethod: 'card',
    orderStatus: 'order_waiting',
    paymentStatus: 'payment_pending',
    shippingStatus: 'shipping_ready',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Order
}

describe('ACTION_CONFIG', () => {
  test('all order actions are defined', () => {
    expect(Object.keys(ACTION_CONFIG)).toHaveLength(7)
  })
})

describe('getActionsForOrder', () => {
  test('order waiting flow exposes confirm and cancel', () => {
    const result = getActionsForOrder(mkOrder({
      orderStatus: 'order_waiting',
      paymentStatus: 'payment_pending',
      shippingStatus: 'shipping_ready',
    }))

    expect(result.primaryActions).toEqual(['confirm_order', 'cancel_order'])
  })

  test('payment pending flow exposes confirm payment and cancel', () => {
    const result = getActionsForOrder(mkOrder({
      orderStatus: 'order_confirmed',
      paymentStatus: 'payment_pending',
      shippingStatus: 'shipping_ready',
    }))

    expect(result.primaryActions).toEqual(['confirm_payment', 'cancel_order'])
  })

  test('shipping ready flow exposes start shipping', () => {
    const result = getActionsForOrder(mkOrder({
      orderStatus: 'order_confirmed',
      paymentStatus: 'payment_completed',
      shippingStatus: 'shipping_ready',
    }))

    expect(result.primaryActions).toEqual(['start_shipping'])
    expect(result.menuActions).toEqual(['cancel_order'])
  })

  test('shipping in progress flow exposes complete delivery and return', () => {
    const result = getActionsForOrder(mkOrder({
      orderStatus: 'order_confirmed',
      paymentStatus: 'payment_completed',
      shippingStatus: 'shipping_in_progress',
    }))

    expect(result.primaryActions).toEqual(['complete_delivery'])
    expect(result.menuActions).toEqual(['accept_return'])
  })

  test('completed flow exposes refund processing', () => {
    const result = getActionsForOrder(mkOrder({
      orderStatus: 'order_completed',
      paymentStatus: 'payment_completed',
      shippingStatus: 'shipping_completed',
    }))

    expect(result.primaryActions).toEqual(['process_refund'])
    expect(result.menuActions).toEqual([])
  })

  test('invalid mixed states expose no actions', () => {
    const result = getActionsForOrder(mkOrder({
      orderStatus: 'order_waiting',
      paymentStatus: 'refund_in_progress',
      shippingStatus: 'shipping_in_progress',
    }))

    expect(result.primaryActions).toEqual([])
    expect(result.menuActions).toEqual([])
  })
})

describe('getTransitionForAction', () => {
  test('confirm_order only updates order status', () => {
    const transition = getTransitionForAction('confirm_order')

    expect(transition).toEqual({ orderStatus: 'order_confirmed' })
  })

  test('complete_delivery updates order and shipping status', () => {
    const transition = getTransitionForAction('complete_delivery')

    expect(transition).toEqual({
      orderStatus: 'order_completed',
      shippingStatus: 'shipping_completed',
    })
  })
})
