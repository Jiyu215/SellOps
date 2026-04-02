import type { OrderStatusType, PaymentStatusType, ShippingStatusType } from '@/types/dashboard';

// ── 액션 키 ───────────────────────────────────────────────────────────────────

export type ActionKey =
  | 'confirm_order'      // 주문확정
  | 'cancel_order'       // 주문취소
  | 'confirm_payment'    // 결제확인
  | 'start_shipping'     // 배송시작
  | 'complete_delivery'  // 배송완료
  | 'accept_return'      // 반품접수
  | 'process_refund';    // 환불처리

// ── 버튼 스타일 변형 ──────────────────────────────────────────────────────────

export type ActionVariant = 'primary' | 'danger';

// ── 액션 설정 (UI 라벨, 모달 텍스트, 버튼 스타일) ────────────────────────────

export interface ActionConfig {
  label: string;
  modalTitle: string;
  modalMessage: string;
  confirmLabel: string;
  buttonVariant: ActionVariant;
}

// ── 상태 전이 결과 ────────────────────────────────────────────────────────────

export interface OrderTransition {
  orderStatus?: OrderStatusType;
  paymentStatus?: PaymentStatusType;
  shippingStatus?: ShippingStatusType;
}
