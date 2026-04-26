import type { Order } from '@/types/dashboard'
import type { ActionConfig, ActionKey, OrderTransition } from '@/types/orderActions'

export const ACTION_CONFIG: Record<ActionKey, ActionConfig> = {
  confirm_order: {
    label: '주문확정',
    modalTitle: '주문을 확정하시겠습니까?',
    modalMessage: '주문 대기 상태를 주문확정으로 전환합니다.',
    confirmLabel: '주문확정',
    buttonVariant: 'primary',
  },
  cancel_order: {
    label: '주문취소',
    modalTitle: '주문을 취소하시겠습니까?',
    modalMessage: '취소된 주문은 복구할 수 없습니다.',
    confirmLabel: '주문취소',
    buttonVariant: 'danger',
  },
  confirm_payment: {
    label: '결제확인',
    modalTitle: '결제를 확인하시겠습니까?',
    modalMessage: '결제 완료 상태로 전환합니다.',
    confirmLabel: '결제확인',
    buttonVariant: 'primary',
  },
  start_shipping: {
    label: '배송시작',
    modalTitle: '배송을 시작하시겠습니까?',
    modalMessage: '배송 준비 상태를 배송중으로 전환합니다.',
    confirmLabel: '배송시작',
    buttonVariant: 'primary',
  },
  complete_delivery: {
    label: '배송완료',
    modalTitle: '배송을 완료 처리하시겠습니까?',
    modalMessage: '배송완료 상태로 전환하며 주문을 완료합니다.',
    confirmLabel: '배송완료',
    buttonVariant: 'primary',
  },
  accept_return: {
    label: '반품접수',
    modalTitle: '반품을 접수하시겠습니까?',
    modalMessage: '반품 완료 상태로 전환합니다.',
    confirmLabel: '반품접수',
    buttonVariant: 'danger',
  },
  process_refund: {
    label: '환불처리',
    modalTitle: '환불을 처리하시겠습니까?',
    modalMessage: '환불 완료 상태로 전환합니다.',
    confirmLabel: '환불처리',
    buttonVariant: 'danger',
  },
}

const TRANSITIONS: Record<ActionKey, OrderTransition> = {
  confirm_order: { orderStatus: 'order_confirmed' },
  cancel_order: { orderStatus: 'order_cancelled', paymentStatus: 'payment_cancelled' },
  confirm_payment: { paymentStatus: 'payment_completed' },
  start_shipping: { shippingStatus: 'shipping_in_progress' },
  complete_delivery: { orderStatus: 'order_completed', shippingStatus: 'shipping_completed' },
  accept_return: { shippingStatus: 'return_completed' },
  process_refund: { paymentStatus: 'refund_completed', shippingStatus: 'return_completed' },
}

export interface ActionGroup {
  primaryActions: ActionKey[]
  menuActions: ActionKey[]
}

/**
 * Determine whether an order is in a terminal state.
 *
 * An order is terminal when any of the following is true: `orderStatus` is `'order_cancelled'`, `paymentStatus` is `'payment_cancelled'` or `'refund_completed'`, or `shippingStatus` is `'return_completed'`.
 *
 * @param order - The order to evaluate
 * @returns `true` if the order is terminal, `false` otherwise
 */
function isTerminalOrder(order: Order) {
  return (
    order.orderStatus === 'order_cancelled' ||
    order.paymentStatus === 'payment_cancelled' ||
    order.paymentStatus === 'refund_completed' ||
    order.shippingStatus === 'return_completed'
  )
}

/**
 * Determines which primary and menu actions are available for an order based on its statuses.
 *
 * Evaluates the order's `orderStatus`, `paymentStatus`, and `shippingStatus` to produce the set
 * of actionable `ActionKey`s. Returns empty action arrays for terminal orders or when no rule matches.
 *
 * @param order - The order whose `orderStatus`, `paymentStatus`, and `shippingStatus` are used to select actions
 * @returns An `ActionGroup` containing `primaryActions` (main action keys shown prominently) and `menuActions` (secondary action keys shown in a menu)
 */
export function getActionsForOrder(order: Order): ActionGroup {
  const { orderStatus, paymentStatus, shippingStatus } = order

  if (isTerminalOrder(order)) {
    return { primaryActions: [], menuActions: [] }
  }

  if (
    orderStatus === 'order_waiting' &&
    paymentStatus === 'payment_pending' &&
    shippingStatus === 'shipping_ready'
  ) {
    return { primaryActions: ['confirm_order', 'cancel_order'], menuActions: [] }
  }

  if (
    orderStatus === 'order_confirmed' &&
    paymentStatus === 'payment_pending' &&
    shippingStatus === 'shipping_ready'
  ) {
    return { primaryActions: ['confirm_payment', 'cancel_order'], menuActions: [] }
  }

  if (
    orderStatus === 'order_confirmed' &&
    paymentStatus === 'payment_completed' &&
    shippingStatus === 'shipping_ready'
  ) {
    return { primaryActions: ['start_shipping'], menuActions: ['cancel_order'] }
  }

  if (
    orderStatus === 'order_confirmed' &&
    paymentStatus === 'payment_completed' &&
    shippingStatus === 'shipping_in_progress'
  ) {
    return { primaryActions: ['complete_delivery'], menuActions: ['accept_return'] }
  }

  if (
    orderStatus === 'order_completed' &&
    paymentStatus === 'payment_completed' &&
    shippingStatus === 'shipping_completed'
  ) {
    return { primaryActions: ['process_refund'], menuActions: [] }
  }

  return { primaryActions: [], menuActions: [] }
}

/**
 * Retrieve the order state transition payload associated with an action key.
 *
 * @param actionKey - The action identifier whose transition mapping to fetch
 * @returns The `OrderTransition` object that specifies status fields to update for `actionKey`
 */
export function getTransitionForAction(actionKey: ActionKey): OrderTransition {
  return TRANSITIONS[actionKey]
}
