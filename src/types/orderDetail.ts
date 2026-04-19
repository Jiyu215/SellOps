import type { Order } from '@/types/dashboard';

export type CouponType = 'amount' | 'percent' | 'free_shipping';
export type CouponStatus = 'applied' | 'unused' | 'cancelled';

export interface OrderCoupon {
  code:           string;
  discountAmount: number;
  type:           CouponType;
  status:         CouponStatus;
}

export interface OrderShippingInfo {
  carrier:        string;
  trackingNumber: string;
  recipientName:  string;
  recipientPhone: string;
}

/** 메모 작성자 유형 */
export type MemoAuthorType = 'customer' | 'admin' | 'cs';

/** 주문 메모 로그 항목 (append-only, 최신순 정렬) */
export interface OrderMemoEntry {
  id:         string;
  timestamp:  string;         // ISO 8601
  author:     string;         // 작성자 이름
  authorType: MemoAuthorType;
  content:    string;
}

/** 주문 상태 이력 항목 (최신순 정렬) */
export interface OrderStatusHistoryEntry {
  timestamp: string;  // ISO 8601
  label:     string;  // 표시 텍스트 (예: '결제 완료')
  actor:     string;  // 처리 주체 (예: '관리자', '시스템', '고객')
  reason?:   string;  // 선택적 사유
}

/** 결제 상세 정보 */
export interface OrderPaymentDetail {
  pg:             string; // PG사 (예: '토스페이먼츠')
  approvalNumber: string; // 승인번호
  paidAt:         string; // 결제 완료 시각 ISO 8601
}

export interface OrderDetail extends Order {
  shippingFee:    number;
  coupon?:        OrderCoupon;
  pointDiscount?: number;        // 적립금 할인
  shippingInfo?:  OrderShippingInfo;
  memoLog:        OrderMemoEntry[];
  statusHistory:  OrderStatusHistoryEntry[];
  paymentDetail?: OrderPaymentDetail;
}
