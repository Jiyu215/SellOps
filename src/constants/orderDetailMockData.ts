import type {
  OrderDetail,
  OrderCoupon,
  OrderShippingInfo,
  OrderMemoEntry,
  MemoAuthorType,
  OrderStatusHistoryEntry,
  OrderPaymentDetail,
} from '@/types/orderDetail';
import { MOCK_ORDERS_PAGE } from '@/constants/ordersMockData';

// ── 택배사 풀 ─────────────────────────────────────────────────────────────
const _CARRIERS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '쿠팡로켓'];

// ── 쿠폰 풀 ──────────────────────────────────────────────────────────────
const _COUPON_CODES = ['SAVE10K', 'VIP20PCT', 'NEWUSER5K', 'SUMMER15PCT', 'FLASH5K'];

// ── 고객 요청사항 풀 ──────────────────────────────────────────────────────
const _REQUESTS = [
  '부재 시 문 앞에 놔주세요.',
  '조심히 다뤄주세요. 선물용입니다.',
  '경비실에 맡겨주세요.',
  '배송 전 연락 부탁드립니다.',
  '',
];

// ── 관리자 메모 풀 ───────────────────────────────────────────────────────
const _ADMIN_NOTES = [
  '고객 요청 사항 확인 완료',
  'VIP 고객 — 빠른 처리 요청',
  '',
];

// ── PG사 맵 ───────────────────────────────────────────────────────────────
const _PG_MAP: Record<string, string> = {
  card:          '토스페이먼츠',
  kakao_pay:     '카카오페이먼츠',
  naver_pay:     '네이버파이낸셜',
  bank_transfer: '은행 직접이체',
};

// ── 상태 이력 생성 ────────────────────────────────────────────────────────

function _buildStatusHistory(
  order: (typeof MOCK_ORDERS_PAGE)[number],
  baseDate: Date,
): OrderStatusHistoryEntry[] {
  const entries: OrderStatusHistoryEntry[] = [];

  const addEntry = (minsOffset: number, label: string, actor: string, reason?: string) => {
    const timestamp = new Date(baseDate.getTime() + minsOffset * 60 * 1000).toISOString();
    entries.push({ timestamp, label, actor, ...(reason ? { reason } : {}) });
  };

  // 항상: 주문 생성
  addEntry(0, '주문 생성', '고객');

  // 결제 실패인 경우 early return
  if (order.paymentStatus === 'payment_failed') {
    addEntry(5, '결제 실패', '시스템', '카드사 승인 거절');
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 결제 완료 이상
  if (
    order.paymentStatus === 'payment_completed' ||
    order.paymentStatus === 'refund_in_progress' ||
    order.paymentStatus === 'refund_completed'
  ) {
    addEntry(1, '결제 완료', '시스템');
  }

  // 주문 확정
  if (order.orderStatus === 'order_confirmed' || order.orderStatus === 'order_completed') {
    addEntry(2, '주문 확정', '관리자');
  }

  // 주문 취소
  if (order.orderStatus === 'order_cancelled') {
    addEntry(30, '주문 취소', '관리자', '고객 요청에 의한 취소');
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 상품 준비
  if (
    order.shippingStatus === 'shipping_ready' ||
    order.shippingStatus === 'shipping_in_progress' ||
    order.shippingStatus === 'shipping_completed' ||
    order.shippingStatus === 'return_completed'
  ) {
    addEntry(60, '상품 준비', '관리자', '재고 확보 완료');
  }

  // 출고 처리
  if (
    order.shippingStatus === 'shipping_in_progress' ||
    order.shippingStatus === 'shipping_completed' ||
    order.shippingStatus === 'return_completed'
  ) {
    addEntry(24 * 60, '출고 처리', '관리자');
  }

  // 배송 완료
  if (
    order.shippingStatus === 'shipping_completed' ||
    order.orderStatus === 'order_completed'
  ) {
    addEntry(72 * 60, '배송 완료', '시스템');
  }

  // 환불 요청
  if (order.paymentStatus === 'refund_in_progress' || order.paymentStatus === 'refund_completed') {
    addEntry(48 * 60, '환불 요청', '고객', '단순 변심');
  }

  // 환불 완료
  if (order.paymentStatus === 'refund_completed') {
    addEntry(54 * 60, '환불 완료', '시스템');
  }

  // 반품
  if (order.shippingStatus === 'return_completed') {
    addEntry(80 * 60, '반품 접수', '고객', '상품 불량');
    addEntry(90 * 60, '반품 완료', '관리자', '상품 상태 확인 완료');
  }

  // 최신순 정렬
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── 결제 상세 생성 ────────────────────────────────────────────────────────

function _buildPaymentDetail(
  order: (typeof MOCK_ORDERS_PAGE)[number],
  baseDate: Date,
  idx: number,
): OrderPaymentDetail | undefined {
  if (
    order.paymentStatus !== 'payment_completed' &&
    order.paymentStatus !== 'refund_in_progress' &&
    order.paymentStatus !== 'refund_completed'
  ) {
    return undefined;
  }

  const paidAt = new Date(baseDate.getTime() + 60 * 1000).toISOString();
  const approvalNumber = `TXN${String(Date.now() + idx * 997).slice(-10)}`;

  return {
    pg:             _PG_MAP[order.paymentMethod] ?? '기타 PG사',
    approvalNumber,
    paidAt,
  };
}

// ── 메모 로그 생성 ────────────────────────────────────────────────────────

function _buildMemoLog(
  order: (typeof MOCK_ORDERS_PAGE)[number],
  idx: number,
  baseDate: Date,
): OrderMemoEntry[] {
  const entries: OrderMemoEntry[] = [];

  const addMemo = (minsOffset: number, author: string, authorType: MemoAuthorType, content: string) => {
    entries.push({
      id:         `${order.id}-memo-${entries.length}`,
      timestamp:  new Date(baseDate.getTime() + minsOffset * 60 * 1000).toISOString(),
      author,
      authorType,
      content,
    });
  };

  // 고객 요청사항 → 고객 메모
  const customerRequest = _REQUESTS[idx % _REQUESTS.length];
  if (customerRequest) {
    addMemo(0, order.customer.name, 'customer', customerRequest);
  }

  // 관리자 메모
  const adminNote = _ADMIN_NOTES[idx % _ADMIN_NOTES.length];
  if (adminNote) {
    addMemo(5, '김운영자', 'admin', adminNote);
  }

  // CS 메모 (일부 주문)
  if (idx % 4 === 0) {
    addMemo(30, '이CS담당', 'cs', '고객 문의 확인 완료. 배송 일정 안내 완료.');
  }

  // 최신순 정렬
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── 주문 상세 빌더 ────────────────────────────────────────────────────────

function _buildDetail(order: (typeof MOCK_ORDERS_PAGE)[number], idx: number): OrderDetail {
  const hasTracking =
    order.shippingStatus === 'shipping_in_progress' ||
    order.shippingStatus === 'shipping_completed'   ||
    order.shippingStatus === 'return_completed';

  const hasCoupon = idx % 5 === 0;
  const hasPoint  = idx % 3 === 1;

  const coupon: OrderCoupon | undefined = hasCoupon
    ? {
        code:           _COUPON_CODES[idx % _COUPON_CODES.length],
        discountAmount: idx % 2 === 0 ? 10000 : 5000,
        type:           idx % 3 === 0 ? 'amount' : idx % 3 === 1 ? 'percent' : 'free_shipping',
        status:         order.orderStatus === 'order_cancelled' ? 'cancelled' : 'applied',
      }
    : undefined;

  const shippingInfo: OrderShippingInfo = {
    carrier:        hasTracking ? _CARRIERS[idx % _CARRIERS.length] : '',
    trackingNumber: hasTracking ? String(1234567890 + idx * 113) : '',
    recipientName:  order.customer.name,
    recipientPhone: order.customer.phone,
  };

  const baseDate      = new Date(order.createdAt);
  const statusHistory = _buildStatusHistory(order, baseDate);
  const paymentDetail = _buildPaymentDetail(order, baseDate, idx);
  const pointDiscount = hasPoint && order.paymentStatus === 'payment_completed' ? 5000 : undefined;
  const memoLog       = _buildMemoLog(order, idx, baseDate);

  return {
    ...order,
    shippingFee: idx % 7 === 0 ? 0 : 3000,
    coupon,
    pointDiscount,
    shippingInfo,
    memoLog,
    statusHistory,
    paymentDetail,
  };
}

/**
 * 주문 ID → OrderDetail 맵 (mock)
 *
 * 실제 서비스에서는 API / DB 쿼리로 대체한다.
 */
export const MOCK_ORDER_DETAIL_MAP: ReadonlyMap<string, OrderDetail> = new Map(
  MOCK_ORDERS_PAGE.map((order, idx) => [order.id, _buildDetail(order, idx)]),
);
