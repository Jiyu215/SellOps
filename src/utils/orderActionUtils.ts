import type { Order } from '@/types/dashboard';
import type { ActionKey, ActionConfig, OrderTransition } from '@/types/orderActions';

// ── 액션 설정 (라벨, 모달 텍스트, 버튼 스타일) ────────────────────────────

export const ACTION_CONFIG: Record<ActionKey, ActionConfig> = {
  confirm_order: {
    label:         '주문확정',
    modalTitle:    '주문을 확정하시겠습니까?',
    modalMessage:  '주문을 확정하면 배송 준비 단계로 전환됩니다.',
    confirmLabel:  '주문확정',
    buttonVariant: 'primary',
  },
  cancel_order: {
    label:         '주문취소',
    modalTitle:    '주문을 취소하시겠습니까?',
    modalMessage:  '취소된 주문은 복구할 수 없습니다.',
    confirmLabel:  '주문취소',
    buttonVariant: 'danger',
  },
  confirm_payment: {
    label:         '결제확인',
    modalTitle:    '결제를 확인하시겠습니까?',
    modalMessage:  '결제 완료 상태로 전환됩니다.',
    confirmLabel:  '결제확인',
    buttonVariant: 'primary',
  },
  start_shipping: {
    label:         '배송시작',
    modalTitle:    '배송을 시작하시겠습니까?',
    modalMessage:  '배송 중 상태로 전환됩니다.',
    confirmLabel:  '배송시작',
    buttonVariant: 'primary',
  },
  complete_delivery: {
    label:         '배송완료',
    modalTitle:    '배송을 완료 처리하시겠습니까?',
    modalMessage:  '배송 완료 상태로 전환되며 주문이 완료됩니다.',
    confirmLabel:  '배송완료',
    buttonVariant: 'primary',
  },
  accept_return: {
    label:         '반품접수',
    modalTitle:    '반품을 접수하시겠습니까?',
    modalMessage:  '반품이 접수되면 반품 완료 상태로 전환됩니다.',
    confirmLabel:  '반품접수',
    buttonVariant: 'danger',
  },
  process_refund: {
    label:         '환불처리',
    modalTitle:    '환불을 처리하시겠습니까?',
    modalMessage:  '환불이 처리되면 환불 완료 상태로 전환됩니다.',
    confirmLabel:  '환불처리',
    buttonVariant: 'danger',
  },
};

// ── 상태 전이 맵 ──────────────────────────────────────────────────────────

const TRANSITIONS: Record<ActionKey, OrderTransition> = {
  confirm_order:     { orderStatus: 'order_confirmed',  shippingStatus: 'shipping_ready'       },
  cancel_order:      { orderStatus: 'order_cancelled',  paymentStatus:  'payment_cancelled'    },
  confirm_payment:   { paymentStatus: 'payment_completed'                                      },
  start_shipping:    { shippingStatus: 'shipping_in_progress'                                  },
  complete_delivery: { orderStatus: 'order_completed',  shippingStatus: 'shipping_completed'   },
  accept_return:     { shippingStatus: 'return_completed'                                      },
  process_refund:    { paymentStatus:  'refund_completed', shippingStatus: 'return_completed'  },
};

// ── 액션 그룹 ─────────────────────────────────────────────────────────────

export interface ActionGroup {
  primaryActions: ActionKey[];
  menuActions:    ActionKey[];
}

/**
 * 현재 주문 상태에 따라 가용 액션 그룹을 반환한다.
 * 종료 상태 (cancelled / completed / refunded / returned) 는 빈 그룹 반환.
 */
export function getActionsForOrder(order: Order): ActionGroup {
  const { orderStatus, paymentStatus, shippingStatus } = order;

  // 종료 상태 → 버튼 없음
  if (
    orderStatus   === 'order_cancelled' ||
    orderStatus   === 'order_completed' ||
    paymentStatus === 'refund_completed' ||
    shippingStatus === 'return_completed'
  ) {
    return { primaryActions: [], menuActions: [] };
  }

  // 주문대기
  if (orderStatus === 'order_waiting') {
    return { primaryActions: ['confirm_order', 'cancel_order'], menuActions: [] };
  }

  // 결제대기 (주문확정 + 결제 미완료)
  if (orderStatus === 'order_confirmed' && paymentStatus === 'payment_pending') {
    return { primaryActions: ['confirm_payment', 'cancel_order'], menuActions: [] };
  }

  // 배송준비 그룹 (주문확정 + 결제완료 + 배송준비)
  if (
    orderStatus   === 'order_confirmed'    &&
    paymentStatus  === 'payment_completed' &&
    shippingStatus === 'shipping_ready'
  ) {
    return { primaryActions: ['start_shipping'], menuActions: ['cancel_order'] };
  }

  // 배송중
  if (shippingStatus === 'shipping_in_progress') {
    return { primaryActions: ['complete_delivery'], menuActions: ['accept_return'] };
  }

  // 배송완료
  if (shippingStatus === 'shipping_completed') {
    return { primaryActions: ['process_refund'], menuActions: [] };
  }

  return { primaryActions: [], menuActions: [] };
}

/**
 * 액션에 대한 상태 전이 객체를 반환한다.
 */
export function getTransitionForAction(actionKey: ActionKey): OrderTransition {
  return TRANSITIONS[actionKey];
}
