import type { Order, OrderStatusType, PaymentStatusType, ShippingStatusType, PaymentMethod } from '@/types/dashboard';
import type { OrderKPI, OrderTrendPoint, OrderStatusStat } from '@/types/orders';
import {
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_WARNING,
  COLOR_ERROR,
} from '@/constants/config';

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────
const _now = new Date();

const _isoAt = (daysAgo: number, hour: number, minute: number): string => {
  const d = new Date(_now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ── 고객 풀 ──────────────────────────────────────────────────────────────
const _C: Record<string, { name: string; email: string; phone: string; tier: string }> = {
  민준: { name: '김민준', email: 'minjun@mail.com',   phone: '010-1111-2222', tier: 'VIP'    },
  서연: { name: '이서연', email: 'seoyeon@mail.com',  phone: '010-2222-3333', tier: 'Gold'   },
  민서: { name: '박민서', email: 'minseo@mail.com',   phone: '010-3333-4444', tier: 'Silver' },
  서윤: { name: '최서윤', email: 'seoyun@mail.com',   phone: '010-4444-5555', tier: '일반'   },
  민기: { name: '장민기', email: 'minki@mail.com',    phone: '010-5555-6666', tier: '일반'   },
  수진: { name: '한수진', email: 'sujin@mail.com',    phone: '010-6666-7777', tier: 'Silver' },
  지호: { name: '송지호', email: 'jiho@mail.com',     phone: '010-7777-8888', tier: '일반'   },
  채원: { name: '임채원', email: 'chaewon@mail.com',  phone: '010-8888-9999', tier: 'Gold'   },
  현서: { name: '권현서', email: 'hyeonseo@mail.com', phone: '010-9999-0000', tier: 'VIP'    },
  지우: { name: '오지우', email: 'jiwoo@mail.com',    phone: '010-1234-5678', tier: '일반'   },
  예은: { name: '윤예은', email: 'yeeun@mail.com',    phone: '010-2345-6789', tier: 'Silver' },
  지훈: { name: '류지훈', email: 'jihun@mail.com',    phone: '010-3456-7890', tier: '일반'   },
  서은: { name: '노서은', email: 'seoeun@mail.com',   phone: '010-4567-8901', tier: 'Gold'   },
  현우: { name: '마현우', email: 'hyeonwoo@mail.com', phone: '010-5678-9012', tier: '일반'   },
  다인: { name: '강다인', email: 'dain@mail.com',     phone: '010-6789-0123', tier: 'Silver' },
};

// ── 상품 생성 헬퍼 ────────────────────────────────────────────────────────
type P = Array<{ name: string; sku: string; quantity: number; unitPrice: number }>;

const _kb  = (q = 1): P => [{ name: 'MX Keys S 키보드',       sku: 'KB-MXS-BLK', quantity: q, unitPrice: 139000 }];
const _ms  = (q = 1): P => [{ name: 'G502 X Plus 마우스',      sku: 'MS-G502-WHT', quantity: q, unitPrice: 89000  }];
const _kc  = (q = 1): P => [{ name: 'Keychron Q1 Pro',         sku: 'KB-KCQ1-GRY', quantity: q, unitPrice: 249000 }];
const _hub = (q = 1): P => [{ name: 'USB-C Hub 7-in-1',        sku: 'HB-UC7-SLV',  quantity: q, unitPrice: 59000  }];
const _mag = (q = 1): P => [{ name: 'MagSafe 충전 케이블',     sku: 'CB-MAG-WHT',  quantity: q, unitPrice: 39000  }];
const _ma  = (q = 1): P => [{ name: '모니터 암 듀얼',           sku: 'MA-DU-BLK',   quantity: q, unitPrice: 79000  }];
const _mxm = (q = 1): P => [{ name: 'Logitech MX Master 3S',   sku: 'MS-MXM-GRY',  quantity: q, unitPrice: 129000 }];
const _k8  = (q = 1): P => [{ name: 'Keychron K8 Pro',         sku: 'KB-K8P-WHT',  quantity: q, unitPrice: 179000 }];

// ── 배송 주소 풀 ──────────────────────────────────────────────────────────
const _A: Record<string, string> = {
  강남:  '서울시 강남구 테헤란로 123',
  판교:  '경기도 성남시 분당구 판교로 456',
  해운대: '부산시 해운대구 마린시티 789',
  인천:  '인천시 남동구 구월동 101',
  대구:  '대구시 중구 동성로 202',
  홍대:  '서울시 마포구 홍대입구 303',
  서초:  '서울시 서초구 반포동 505',
  수원:  '경기도 수원시 팔달구 인계동 404',
};

// ── 구 상태 → 신 3-상태 매핑 ─────────────────────────────────────────────
type _OldStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
const _STATUS_MAP: Record<_OldStatus, {
  orderStatus: OrderStatusType;
  paymentStatus: PaymentStatusType;
  shippingStatus: ShippingStatusType;
}> = {
  pending:   { orderStatus: 'order_waiting',   paymentStatus: 'payment_pending',    shippingStatus: 'shipping_ready'       },
  paid:      { orderStatus: 'order_confirmed',  paymentStatus: 'payment_completed',  shippingStatus: 'shipping_ready'       },
  preparing: { orderStatus: 'order_confirmed',  paymentStatus: 'payment_completed',  shippingStatus: 'shipping_ready'       },
  shipped:   { orderStatus: 'order_confirmed',  paymentStatus: 'payment_completed',  shippingStatus: 'shipping_in_progress' },
  delivered: { orderStatus: 'order_completed',  paymentStatus: 'payment_completed',  shippingStatus: 'shipping_completed'   },
  cancelled: { orderStatus: 'order_cancelled',  paymentStatus: 'payment_cancelled',  shippingStatus: 'shipping_on_hold'     },
  refunded:  { orderStatus: 'order_cancelled',  paymentStatus: 'refund_completed',   shippingStatus: 'return_completed'     },
};

// ── 주문 생성 헬퍼 ────────────────────────────────────────────────────────
function _mkOrder(
  idx: number,
  customer: { name: string; email: string; phone: string; tier: string },
  products: P,
  oldStatus: _OldStatus,
  paymentMethod: PaymentMethod,
  daysAgo: number,
  hour: number,
  minute: number,
  shippingAddress?: string,
): Order {
  return {
    id: `ord-p-${String(idx + 1).padStart(3, '0')}`,
    orderNumber: `SO-2026-${String(1200 + idx).padStart(6, '0')}`,
    customer,
    products,
    totalAmount: products.reduce((s, p) => s + p.unitPrice * p.quantity, 0),
    paymentMethod,
    ..._STATUS_MAP[oldStatus],
    createdAt: _isoAt(daysAgo, hour, minute),
    shippingAddress,
  };
}

// ── 50건 주문 목록 ────────────────────────────────────────────────────────
// status 분포: pending×2, paid×6, preparing×6, shipped×10, delivered×19, cancelled×5, refunded×2 = 50
export const MOCK_ORDERS_PAGE: Order[] = [
  // ── 오늘 daysAgo=0 (8건) ─────────────────────────────────────
  _mkOrder( 0, _C.민준, _kb(),               'paid',      'card',          0,  9, 12, _A.강남  ),
  _mkOrder( 1, _C.서연, _ms(),               'pending',   'kakao_pay',     0, 10, 33, _A.판교  ),
  _mkOrder( 2, _C.민서, _kc(),               'paid',      'card',          0, 11,  5, _A.해운대),
  _mkOrder( 3, _C.서윤, [..._hub(2),..._mag()], 'preparing','naver_pay',   0, 12, 22, _A.인천  ),
  _mkOrder( 4, _C.민기, _mxm(),              'pending',   'card',          0, 13, 47, _A.대구  ),
  _mkOrder( 5, _C.수진, _k8(),               'paid',      'bank_transfer', 0, 14,  8, _A.홍대  ),
  _mkOrder( 6, _C.지호, _ma(),               'preparing', 'card',          0, 15, 31, _A.서초  ),
  _mkOrder( 7, _C.채원, [..._kb(),..._ms()], 'paid',      'kakao_pay',     0, 17, 55, _A.수원  ),

  // ── 어제 daysAgo=1 (7건) ─────────────────────────────────────
  _mkOrder( 8, _C.현서, _kc(),               'paid',      'card',          1,  8, 44, _A.강남  ),
  _mkOrder( 9, _C.지우, _hub(3),             'preparing', 'naver_pay',     1,  9, 20, _A.판교  ),
  _mkOrder(10, _C.예은, _ms(),               'preparing', 'kakao_pay',     1, 11, 15, _A.서초  ),
  _mkOrder(11, _C.지훈, _k8(),               'shipped',   'card',          1, 13,  0, _A.홍대  ),
  _mkOrder(12, _C.서은, _mag(2),             'preparing', 'card',          1, 14, 30, _A.수원  ),
  _mkOrder(13, _C.현우, _mxm(),              'paid',      'bank_transfer', 1, 16, 10, _A.인천  ),
  _mkOrder(14, _C.다인, [..._kc(),..._ma()], 'shipped',   'card',          1, 18, 45, _A.해운대),

  // ── 2일 전 (5건) ──────────────────────────────────────────────
  _mkOrder(15, _C.민준, _ms(2),              'shipped',   'kakao_pay',     2, 10, 15, _A.강남  ),
  _mkOrder(16, _C.서연, _k8(),               'preparing', 'card',          2, 12, 40, _A.판교  ),
  _mkOrder(17, _C.민서, _hub(),              'shipped',   'naver_pay',     2, 14, 20, _A.대구  ),
  _mkOrder(18, _C.서윤, _kb(),               'shipped',   'card',          2, 15, 55, _A.서초  ),
  _mkOrder(19, _C.민기, _mag(4),             'shipped',   'kakao_pay',     2, 17, 30, _A.인천  ),

  // ── 3일 전 (5건) ──────────────────────────────────────────────
  _mkOrder(20, _C.수진, _kc(),               'delivered', 'card',          3,  9,  0, _A.강남  ),
  _mkOrder(21, _C.지호, _ms(),               'shipped',   'card',          3, 10, 30, _A.판교  ),
  _mkOrder(22, _C.채원, [..._kb(),..._hub()],'delivered', 'bank_transfer', 3, 12,  0, _A.홍대  ),
  _mkOrder(23, _C.현서, _mxm(),              'shipped',   'naver_pay',     3, 14,  0, _A.서초  ),
  _mkOrder(24, _C.지우, _k8(),               'delivered', 'card',          3, 16,  0, _A.수원  ),

  // ── 4-5일 전 (4건) ────────────────────────────────────────────
  _mkOrder(25, _C.예은, _mag(2),             'delivered', 'kakao_pay',     4, 11,  0, _A.해운대),
  _mkOrder(26, _C.지훈, _kb(),               'cancelled', 'card',          4, 13,  0, _A.대구  ),
  _mkOrder(27, _C.서은, _kc(),               'delivered', 'card',          5, 10,  0, _A.강남  ),
  _mkOrder(28, _C.현우, _hub(2),             'shipped',   'naver_pay',     5, 14,  0, _A.인천  ),

  // ── 6-7일 전 (4건) ────────────────────────────────────────────
  _mkOrder(29, _C.다인, _ms(),               'delivered', 'card',          6,  9,  0, _A.판교  ),
  _mkOrder(30, _C.민준, _k8(),               'cancelled', 'card',          6, 11,  0, _A.홍대  ),
  _mkOrder(31, _C.서연, [..._kc(),..._ms()],'delivered', 'kakao_pay',      7, 10,  0, _A.강남  ),
  _mkOrder(32, _C.민서, _mxm(),              'cancelled', 'bank_transfer', 7, 13,  0, _A.서초  ),

  // ── 8-14일 전 (7건) ───────────────────────────────────────────
  _mkOrder(33, _C.서윤, _kb(),               'delivered', 'card',          8, 10,  0, _A.인천  ),
  _mkOrder(34, _C.민기, _mag(3),             'delivered', 'card',          9, 11,  0, _A.판교  ),
  _mkOrder(35, _C.수진, _hub(),              'shipped',   'naver_pay',    10,  9,  0, _A.강남  ),
  _mkOrder(36, _C.지호, _k8(),               'delivered', 'kakao_pay',    11, 10,  0, _A.해운대),
  _mkOrder(37, _C.채원, _kc(),               'cancelled', 'card',         12, 11,  0, _A.수원  ),
  _mkOrder(38, _C.현서, _ms(2),              'delivered', 'card',         13, 14,  0, _A.대구  ),
  _mkOrder(39, _C.지우, _kb(),               'cancelled', 'card',         14, 10,  0, _A.홍대  ),

  // ── 15-29일 전 (10건) ─────────────────────────────────────────
  _mkOrder(40, _C.예은, _mxm(),              'delivered', 'card',         15, 10,  0, _A.강남  ),
  _mkOrder(41, _C.지훈, _k8(),               'delivered', 'naver_pay',    17, 11,  0, _A.판교  ),
  _mkOrder(42, _C.서은, [..._kb(),..._hub()],'refunded',  'card',         19,  9,  0, _A.서초  ),
  _mkOrder(43, _C.현우, _mag(2),             'delivered', 'kakao_pay',    20, 10,  0, _A.인천  ),
  _mkOrder(44, _C.다인, _kc(),               'delivered', 'card',         21, 11,  0, _A.해운대),
  _mkOrder(45, _C.민준, _ms(),               'delivered', 'bank_transfer',23, 14,  0, _A.강남  ),
  _mkOrder(46, _C.서연, _hub(3),             'refunded',  'card',         24, 10,  0, _A.판교  ),
  _mkOrder(47, _C.민서, _k8(),               'delivered', 'naver_pay',    26,  9,  0, _A.홍대  ),
  _mkOrder(48, _C.서윤, _kc(),               'delivered', 'card',         28, 11,  0, _A.서초  ),
  _mkOrder(49, _C.민기, _ms(2),              'delivered', 'card',         29, 10,  0, _A.수원  ),
];

// ── KPI 데이터 ────────────────────────────────────────────────────────────
// 오늘(daysAgo=0) 주문: idx 0-7 = 8건
// 처리 대기(pending+paid): pending×2 + paid×6 = 8건
// 이달 매출: 전체 50건 합산 (모두 최근 30일)
const _monthRevenue = MOCK_ORDERS_PAGE.reduce((sum, o) => sum + o.totalAmount, 0);

// ── 30일 일별 추이 ────────────────────────────────────────────────────────────
const _trendNow = new Date();
export const MOCK_ORDERS_TREND: OrderTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(_trendNow);
  d.setDate(d.getDate() - (29 - i));
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  // 주문 수: 2~12 랜덤 (seed-like 패턴으로 재현 가능하도록 고정)
  const orders = [4, 7, 5, 9, 6, 3, 8, 11, 5, 7, 9, 4, 6, 8, 10, 5, 7, 3, 9, 12, 6, 8, 5, 7, 4, 9, 11, 6, 8, 8][i];
  const revenue = orders * [139000, 89000, 249000, 59000, 129000, 179000, 79000][i % 7];
  return { date: `${mm}/${dd}`, orders, revenue };
});

// ── 주문 상태별 통계 (주문 상태 기준 집계) ────────────────────────────────────
// 구 상태 분포: pending×2, paid×6, preparing×6, shipped×10, delivered×19, cancelled×5, refunded×2
// → order_waiting:2  order_confirmed:22(paid+preparing+shipped)  order_completed:19  order_cancelled:7(cancelled+refunded)
export const MOCK_ORDERS_STATUS_STATS: OrderStatusStat[] = [
  { status: 'order_completed',  label: '주문완료', count: 19, color: COLOR_SUCCESS  },
  { status: 'order_confirmed',  label: '주문확정', count: 22, color: COLOR_PRIMARY  },
  { status: 'order_cancelled',  label: '주문취소', count: 7,  color: COLOR_ERROR    },
  { status: 'order_waiting',    label: '주문대기', count: 2,  color: COLOR_WARNING  },
];

export const MOCK_ORDERS_KPI: OrderKPI = {
  totalOrders:          50,
  totalOrdersChange:    12.3,
  todayOrders:          8,
  todayOrdersChange:    -5.6,
  pendingOrders:        8,   // pending(2) + paid(6)
  pendingOrdersChange:  14.2,
  monthRevenue:         _monthRevenue,
  monthRevenueChange:   7.8,
};
