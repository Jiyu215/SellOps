import {
  ORDER_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  SHIPPING_STATUS_MAP,
  ORDER_STATUS_COLORS,
  PAYMENT_BADGE,
  TIER_BADGE,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SHIPPING_STATUS_OPTIONS,
  PAYMENT_OPTIONS,
  formatOrderDate,
} from './orderConstants';
import type { OrderStatusType, PaymentStatusType, ShippingStatusType } from '@/types/dashboard';

// ── ORDER_STATUS_MAP ──────────────────────────────────────────────────────────

describe('ORDER_STATUS_MAP', () => {
  const ORDER_STATUS_KEYS: OrderStatusType[] = [
    'order_waiting',
    'order_confirmed',
    'order_cancelled',
    'order_completed',
  ];

  test.each(ORDER_STATUS_KEYS)('%s 키를 포함한다', (key) => {
    expect(ORDER_STATUS_MAP[key]).toBeDefined();
  });

  test.each(ORDER_STATUS_KEYS)('%s는 label, dotColor, badgeClass를 가진다', (key) => {
    const entry = ORDER_STATUS_MAP[key];
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
    expect(typeof entry.dotColor).toBe('string');
    expect(typeof entry.badgeClass).toBe('string');
  });

  test('order_waiting 라벨은 "주문대기"이다', () => {
    expect(ORDER_STATUS_MAP.order_waiting.label).toBe('주문대기');
  });

  test('order_confirmed 라벨은 "주문확정"이다', () => {
    expect(ORDER_STATUS_MAP.order_confirmed.label).toBe('주문확정');
  });

  test('order_cancelled 라벨은 "주문취소"이다', () => {
    expect(ORDER_STATUS_MAP.order_cancelled.label).toBe('주문취소');
  });

  test('order_completed 라벨은 "주문완료"이다', () => {
    expect(ORDER_STATUS_MAP.order_completed.label).toBe('주문완료');
  });

  test('4개의 키만 존재한다', () => {
    expect(Object.keys(ORDER_STATUS_MAP)).toHaveLength(4);
  });
});

// ── PAYMENT_STATUS_MAP ────────────────────────────────────────────────────────

describe('PAYMENT_STATUS_MAP', () => {
  const PAYMENT_STATUS_KEYS: PaymentStatusType[] = [
    'payment_pending',
    'payment_completed',
    'payment_failed',
    'payment_cancelled',
    'refund_in_progress',
    'refund_completed',
  ];

  test.each(PAYMENT_STATUS_KEYS)('%s 키를 포함한다', (key) => {
    expect(PAYMENT_STATUS_MAP[key]).toBeDefined();
  });

  test.each(PAYMENT_STATUS_KEYS)('%s는 label, dotColor, badgeClass를 가진다', (key) => {
    const entry = PAYMENT_STATUS_MAP[key];
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
    expect(typeof entry.dotColor).toBe('string');
    expect(typeof entry.badgeClass).toBe('string');
  });

  test('6개의 키만 존재한다', () => {
    expect(Object.keys(PAYMENT_STATUS_MAP)).toHaveLength(6);
  });

  test('payment_pending 라벨은 "결제대기"이다', () => {
    expect(PAYMENT_STATUS_MAP.payment_pending.label).toBe('결제대기');
  });

  test('refund_completed 라벨은 "환불완료"이다', () => {
    expect(PAYMENT_STATUS_MAP.refund_completed.label).toBe('환불완료');
  });
});

// ── SHIPPING_STATUS_MAP ───────────────────────────────────────────────────────

describe('SHIPPING_STATUS_MAP', () => {
  const SHIPPING_STATUS_KEYS: ShippingStatusType[] = [
    'shipping_ready',
    'shipping_in_progress',
    'shipping_completed',
    'shipping_on_hold',
    'return_completed',
  ];

  test.each(SHIPPING_STATUS_KEYS)('%s 키를 포함한다', (key) => {
    expect(SHIPPING_STATUS_MAP[key]).toBeDefined();
  });

  test('5개의 키만 존재한다', () => {
    expect(Object.keys(SHIPPING_STATUS_MAP)).toHaveLength(5);
  });

  test('shipping_ready 라벨은 "배송준비"이다', () => {
    expect(SHIPPING_STATUS_MAP.shipping_ready.label).toBe('배송준비');
  });

  test('return_completed 라벨은 "반품완료"이다', () => {
    expect(SHIPPING_STATUS_MAP.return_completed.label).toBe('반품완료');
  });
});

// ── ORDER_STATUS_COLORS ───────────────────────────────────────────────────────

describe('ORDER_STATUS_COLORS', () => {
  test('모든 OrderStatusType 키를 포함한다', () => {
    expect(ORDER_STATUS_COLORS.order_waiting).toBeDefined();
    expect(ORDER_STATUS_COLORS.order_confirmed).toBeDefined();
    expect(ORDER_STATUS_COLORS.order_cancelled).toBeDefined();
    expect(ORDER_STATUS_COLORS.order_completed).toBeDefined();
  });

  test('각 색상은 hex 문자열이다', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    Object.values(ORDER_STATUS_COLORS).forEach((color) => {
      expect(color).toMatch(hexPattern);
    });
  });
});

// ── PAYMENT_BADGE ─────────────────────────────────────────────────────────────

describe('PAYMENT_BADGE', () => {
  test('card 결제 수단이 정의되어 있다', () => {
    expect(PAYMENT_BADGE.card).toBeDefined();
    expect(PAYMENT_BADGE.card.label).toBe('신용카드');
  });

  test('kakao_pay 결제 수단이 정의되어 있다', () => {
    expect(PAYMENT_BADGE.kakao_pay).toBeDefined();
    expect(PAYMENT_BADGE.kakao_pay.label).toBe('카카오페이');
  });

  test('naver_pay 결제 수단이 정의되어 있다', () => {
    expect(PAYMENT_BADGE.naver_pay).toBeDefined();
    expect(PAYMENT_BADGE.naver_pay.label).toBe('네이버페이');
  });

  test('bank_transfer 결제 수단이 정의되어 있다', () => {
    expect(PAYMENT_BADGE.bank_transfer).toBeDefined();
    expect(PAYMENT_BADGE.bank_transfer.label).toBe('계좌이체');
  });

  test('각 항목은 label과 badgeClass를 가진다', () => {
    Object.values(PAYMENT_BADGE).forEach((entry) => {
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.badgeClass).toBe('string');
    });
  });
});

// ── TIER_BADGE ────────────────────────────────────────────────────────────────

describe('TIER_BADGE', () => {
  test('VIP 등급 스타일이 정의되어 있다', () => {
    expect(TIER_BADGE.VIP).toBeDefined();
    expect(typeof TIER_BADGE.VIP).toBe('string');
  });

  test('Gold, Silver, 일반 등급 스타일이 정의되어 있다', () => {
    expect(TIER_BADGE.Gold).toBeDefined();
    expect(TIER_BADGE.Silver).toBeDefined();
    expect(TIER_BADGE['일반']).toBeDefined();
  });
});

// ── 필터 옵션 ─────────────────────────────────────────────────────────────────

describe('ORDER_STATUS_OPTIONS', () => {
  test('"all" 옵션이 첫 번째로 포함된다', () => {
    expect(ORDER_STATUS_OPTIONS[0].value).toBe('all');
  });

  test('4가지 주문 상태 + all = 5개 옵션이 있다', () => {
    expect(ORDER_STATUS_OPTIONS).toHaveLength(5);
  });

  test('각 옵션은 value와 label을 가진다', () => {
    ORDER_STATUS_OPTIONS.forEach((opt) => {
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
    });
  });
});

describe('PAYMENT_STATUS_OPTIONS', () => {
  test('"all" 옵션이 첫 번째로 포함된다', () => {
    expect(PAYMENT_STATUS_OPTIONS[0].value).toBe('all');
  });

  test('6가지 결제 상태 + all = 7개 옵션이 있다', () => {
    expect(PAYMENT_STATUS_OPTIONS).toHaveLength(7);
  });
});

describe('SHIPPING_STATUS_OPTIONS', () => {
  test('"all" 옵션이 첫 번째로 포함된다', () => {
    expect(SHIPPING_STATUS_OPTIONS[0].value).toBe('all');
  });

  test('5가지 배송 상태 + all = 6개 옵션이 있다', () => {
    expect(SHIPPING_STATUS_OPTIONS).toHaveLength(6);
  });
});

describe('PAYMENT_OPTIONS', () => {
  test('"all" 옵션이 첫 번째로 포함된다', () => {
    expect(PAYMENT_OPTIONS[0].value).toBe('all');
  });

  test('4가지 결제 수단 + all = 5개 옵션이 있다', () => {
    expect(PAYMENT_OPTIONS).toHaveLength(5);
  });
});

// ── formatOrderDate ───────────────────────────────────────────────────────────

describe('formatOrderDate', () => {
  test('ISO 날짜를 YYYY.MM.DD HH:mm 형식으로 변환한다', () => {
    // 시간대 독립적 테스트를 위해 로컬 시간 기준 Date 생성
    const isoString = new Date(2026, 0, 5, 14, 30).toISOString(); // 로컬 Jan 5 2026 14:30
    const result = formatOrderDate(isoString);
    // 기대값도 동일 Date 객체로부터 추출
    const d = new Date(isoString);
    const expected = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });

  test('월과 일이 한 자리면 앞에 0을 붙인다', () => {
    const isoString = new Date(2026, 0, 5, 9, 3).toISOString(); // 로컬 Jan 5 09:03
    const result = formatOrderDate(isoString);
    const d = new Date(isoString);
    const expected = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });

  test('12월 31일 23시 59분을 올바르게 포맷한다', () => {
    const isoString = new Date(2026, 11, 31, 23, 59).toISOString(); // 로컬 Dec 31 23:59
    const result = formatOrderDate(isoString);
    const d = new Date(isoString);
    const expected = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });

  test('출력 형식이 "YYYY.MM.DD HH:mm" 패턴을 따른다', () => {
    const isoString = new Date(2026, 5, 15, 10, 30).toISOString();
    const result = formatOrderDate(isoString);
    expect(result).toMatch(/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/);
  });

  test('자정(00:00)을 올바르게 포맷한다', () => {
    const isoString = new Date(2026, 2, 20, 0, 0).toISOString(); // 로컬 Mar 20 00:00
    const result = formatOrderDate(isoString);
    const d = new Date(isoString);
    const expected = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});