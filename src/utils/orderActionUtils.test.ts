import type { Order } from '@/types/dashboard';
import {
  ACTION_CONFIG,
  getActionsForOrder,
  getTransitionForAction,
} from './orderActionUtils';

// ── 헬퍼: 최소한의 Order 객체 생성 ──────────────────────────────────────────

function mkOrder(
  overrides: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>,
): Order {
  return {
    id: 'o-001',
    orderNumber: 'ORD-001',
    customer: { name: '홍길동', email: 'hong@example.com', phone: '010-0000-0000' },
    products: [{ name: '테스트 상품', sku: 'TST-001', quantity: 1, unitPrice: 10000 }],
    totalAmount: 10000,
    paymentMethod: 'card',
    orderStatus:   'order_waiting',
    paymentStatus: 'payment_pending',
    shippingStatus: 'shipping_ready',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Order;
}

// ── ACTION_CONFIG ─────────────────────────────────────────────────────────────

describe('ACTION_CONFIG', () => {
  const EXPECTED_KEYS = [
    'confirm_order',
    'cancel_order',
    'confirm_payment',
    'start_shipping',
    'complete_delivery',
    'accept_return',
    'process_refund',
  ] as const;

  test('7개의 액션 키를 모두 포함한다', () => {
    expect(Object.keys(ACTION_CONFIG)).toHaveLength(7);
  });

  test.each(EXPECTED_KEYS)('%s 액션이 정의되어 있다', (key) => {
    expect(ACTION_CONFIG[key]).toBeDefined();
  });

  test.each(EXPECTED_KEYS)('%s 액션은 label, modalTitle, modalMessage, confirmLabel, buttonVariant를 가진다', (key) => {
    const cfg = ACTION_CONFIG[key];
    expect(typeof cfg.label).toBe('string');
    expect(typeof cfg.modalTitle).toBe('string');
    expect(typeof cfg.modalMessage).toBe('string');
    expect(typeof cfg.confirmLabel).toBe('string');
    expect(['primary', 'danger']).toContain(cfg.buttonVariant);
  });

  test('cancel_order와 accept_return, process_refund는 danger 버튼 변형이다', () => {
    expect(ACTION_CONFIG.cancel_order.buttonVariant).toBe('danger');
    expect(ACTION_CONFIG.accept_return.buttonVariant).toBe('danger');
    expect(ACTION_CONFIG.process_refund.buttonVariant).toBe('danger');
  });

  test('confirm_order, confirm_payment, start_shipping, complete_delivery는 primary 버튼 변형이다', () => {
    expect(ACTION_CONFIG.confirm_order.buttonVariant).toBe('primary');
    expect(ACTION_CONFIG.confirm_payment.buttonVariant).toBe('primary');
    expect(ACTION_CONFIG.start_shipping.buttonVariant).toBe('primary');
    expect(ACTION_CONFIG.complete_delivery.buttonVariant).toBe('primary');
  });
});

// ── getActionsForOrder ────────────────────────────────────────────────────────

describe('getActionsForOrder', () => {
  describe('종료 상태 — 액션 없음', () => {
    test('orderStatus가 order_cancelled이면 빈 그룹 반환', () => {
      const result = getActionsForOrder(mkOrder({ orderStatus: 'order_cancelled', paymentStatus: 'payment_cancelled' }));
      expect(result.primaryActions).toHaveLength(0);
      expect(result.menuActions).toHaveLength(0);
    });

    test('orderStatus가 order_completed이면 빈 그룹 반환', () => {
      const result = getActionsForOrder(mkOrder({ orderStatus: 'order_completed', shippingStatus: 'shipping_completed' }));
      expect(result.primaryActions).toHaveLength(0);
      expect(result.menuActions).toHaveLength(0);
    });

    test('paymentStatus가 refund_completed이면 빈 그룹 반환', () => {
      const result = getActionsForOrder(mkOrder({ paymentStatus: 'refund_completed', shippingStatus: 'return_completed' }));
      expect(result.primaryActions).toHaveLength(0);
      expect(result.menuActions).toHaveLength(0);
    });

    test('shippingStatus가 return_completed이면 빈 그룹 반환', () => {
      const result = getActionsForOrder(mkOrder({ shippingStatus: 'return_completed' }));
      expect(result.primaryActions).toHaveLength(0);
      expect(result.menuActions).toHaveLength(0);
    });
  });

  describe('주문대기 (order_waiting)', () => {
    test('primaryActions에 confirm_order와 cancel_order가 포함된다', () => {
      const result = getActionsForOrder(mkOrder({ orderStatus: 'order_waiting', paymentStatus: 'payment_pending' }));
      expect(result.primaryActions).toEqual(['confirm_order', 'cancel_order']);
      expect(result.menuActions).toHaveLength(0);
    });
  });

  describe('결제대기 (order_confirmed + payment_pending)', () => {
    test('primaryActions에 confirm_payment와 cancel_order가 포함된다', () => {
      const result = getActionsForOrder(mkOrder({
        orderStatus:    'order_confirmed',
        paymentStatus:  'payment_pending',
        shippingStatus: 'shipping_ready',
      }));
      expect(result.primaryActions).toEqual(['confirm_payment', 'cancel_order']);
      expect(result.menuActions).toHaveLength(0);
    });
  });

  describe('배송준비 (order_confirmed + payment_completed + shipping_ready)', () => {
    test('primaryActions에 start_shipping, menuActions에 cancel_order가 포함된다', () => {
      const result = getActionsForOrder(mkOrder({
        orderStatus:    'order_confirmed',
        paymentStatus:  'payment_completed',
        shippingStatus: 'shipping_ready',
      }));
      expect(result.primaryActions).toEqual(['start_shipping']);
      expect(result.menuActions).toEqual(['cancel_order']);
    });
  });

  describe('배송중 (shipping_in_progress)', () => {
    test('primaryActions에 complete_delivery, menuActions에 accept_return이 포함된다', () => {
      const result = getActionsForOrder(mkOrder({
        orderStatus:    'order_confirmed',
        paymentStatus:  'payment_completed',
        shippingStatus: 'shipping_in_progress',
      }));
      expect(result.primaryActions).toEqual(['complete_delivery']);
      expect(result.menuActions).toEqual(['accept_return']);
    });
  });

  describe('배송완료 (shipping_completed)', () => {
    test('primaryActions에 process_refund가 포함된다', () => {
      const result = getActionsForOrder(mkOrder({
        orderStatus:    'order_confirmed',
        paymentStatus:  'payment_completed',
        shippingStatus: 'shipping_completed',
      }));
      expect(result.primaryActions).toEqual(['process_refund']);
      expect(result.menuActions).toHaveLength(0);
    });
  });

  describe('기타 상태 — 빈 그룹 반환', () => {
    test('shipping_on_hold 상태는 액션 없음', () => {
      const result = getActionsForOrder(mkOrder({
        orderStatus:    'order_confirmed',
        paymentStatus:  'payment_completed',
        shippingStatus: 'shipping_on_hold',
      }));
      expect(result.primaryActions).toHaveLength(0);
      expect(result.menuActions).toHaveLength(0);
    });
  });
});

// ── getTransitionForAction ────────────────────────────────────────────────────

describe('getTransitionForAction', () => {
  test('confirm_order → order_confirmed만 변경', () => {
    const transition = getTransitionForAction('confirm_order');
    expect(transition.orderStatus).toBe('order_confirmed');
    expect(transition.shippingStatus).toBeUndefined();
    expect(transition.paymentStatus).toBeUndefined();
  });

  test('cancel_order → order_cancelled + payment_cancelled', () => {
    const transition = getTransitionForAction('cancel_order');
    expect(transition.orderStatus).toBe('order_cancelled');
    expect(transition.paymentStatus).toBe('payment_cancelled');
    expect(transition.shippingStatus).toBeUndefined();
  });

  test('confirm_payment → payment_completed만 변경', () => {
    const transition = getTransitionForAction('confirm_payment');
    expect(transition.paymentStatus).toBe('payment_completed');
    expect(transition.orderStatus).toBeUndefined();
    expect(transition.shippingStatus).toBeUndefined();
  });

  test('start_shipping → shipping_in_progress만 변경', () => {
    const transition = getTransitionForAction('start_shipping');
    expect(transition.shippingStatus).toBe('shipping_in_progress');
    expect(transition.orderStatus).toBeUndefined();
    expect(transition.paymentStatus).toBeUndefined();
  });

  test('complete_delivery → order_completed + shipping_completed', () => {
    const transition = getTransitionForAction('complete_delivery');
    expect(transition.orderStatus).toBe('order_completed');
    expect(transition.shippingStatus).toBe('shipping_completed');
    expect(transition.paymentStatus).toBeUndefined();
  });

  test('accept_return → return_completed만 변경', () => {
    const transition = getTransitionForAction('accept_return');
    expect(transition.shippingStatus).toBe('return_completed');
    expect(transition.orderStatus).toBeUndefined();
    expect(transition.paymentStatus).toBeUndefined();
  });

  test('process_refund → refund_completed + return_completed', () => {
    const transition = getTransitionForAction('process_refund');
    expect(transition.paymentStatus).toBe('refund_completed');
    expect(transition.shippingStatus).toBe('return_completed');
    expect(transition.orderStatus).toBeUndefined();
  });

  test('모든 ActionKey에 대해 객체를 반환한다 (누락 없음)', () => {
    const keys = [
      'confirm_order', 'cancel_order', 'confirm_payment',
      'start_shipping', 'complete_delivery', 'accept_return', 'process_refund',
    ] as const;
    keys.forEach((key) => {
      expect(getTransitionForAction(key)).toBeDefined();
      expect(typeof getTransitionForAction(key)).toBe('object');
    });
  });
});
