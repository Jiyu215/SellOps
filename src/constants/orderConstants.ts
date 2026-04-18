import type { OrderStatusType, PaymentStatusType, ShippingStatusType } from '@/types/dashboard';

// ── 주문 상태 UI 설정 ──────────────────────────────────────────────────────

export const ORDER_STATUS_MAP: Record<
  OrderStatusType,
  { label: string; dotColor: string; badgeClass: string }
> = {
  order_waiting:   { label: '주문대기', dotColor: 'bg-light-warning dark:bg-dark-warning',              badgeClass: 'text-light-warning dark:text-dark-warning'                          },
  order_confirmed: { label: '주문확정', dotColor: 'bg-light-info dark:bg-dark-info',                    badgeClass: 'text-light-info dark:text-dark-info'                                },
  order_cancelled: { label: '주문취소', dotColor: 'bg-light-error dark:bg-dark-error',                  badgeClass: 'text-light-error dark:text-dark-error font-bold'                    },
  order_completed: { label: '주문완료', dotColor: 'bg-light-success dark:bg-dark-success',              badgeClass: 'text-light-success dark:text-dark-success'                          },
};

export const PAYMENT_STATUS_MAP: Record<
  PaymentStatusType,
  { label: string; dotColor: string; badgeClass: string }
> = {
  payment_pending:    { label: '결제대기', dotColor: 'bg-light-warning dark:bg-dark-warning',              badgeClass: 'text-light-warning dark:text-dark-warning'                          },
  payment_completed:  { label: '결제완료', dotColor: 'bg-light-primary dark:bg-dark-primary',             badgeClass: 'text-light-primary dark:text-dark-primary'                          },
  payment_failed:     { label: '결제실패', dotColor: 'bg-light-error dark:bg-dark-error',                 badgeClass: 'text-light-error dark:text-dark-error font-bold'                    },
  payment_cancelled:  { label: '결제취소', dotColor: 'bg-light-textSecondary dark:bg-dark-textSecondary', badgeClass: 'text-light-textSecondary dark:text-dark-textSecondary'              },
  refund_in_progress: { label: '환불중',   dotColor: 'bg-light-warning dark:bg-dark-warning',             badgeClass: 'text-light-warning dark:text-dark-warning'                          },
  refund_completed:   { label: '환불완료', dotColor: 'bg-light-textSecondary dark:bg-dark-textSecondary', badgeClass: 'text-light-textSecondary dark:text-dark-textSecondary'              },
};

export const SHIPPING_STATUS_MAP: Record<
  ShippingStatusType,
  { label: string; dotColor: string; badgeClass: string }
> = {
  shipping_ready:       { label: '배송준비', dotColor: 'bg-purple-500',                              badgeClass: 'text-purple-600 dark:text-purple-400'                               },
  shipping_in_progress: { label: '배송중',   dotColor: 'bg-indigo-500',                              badgeClass: 'text-indigo-600 dark:text-indigo-400'                               },
  shipping_completed:   { label: '배송완료', dotColor: 'bg-light-success dark:bg-dark-success',      badgeClass: 'text-light-success dark:text-dark-success'                          },
  shipping_on_hold:     { label: '배송보류', dotColor: 'bg-light-warning dark:bg-dark-warning',      badgeClass: 'text-light-warning dark:text-dark-warning'                          },
  return_completed:     { label: '반품완료', dotColor: 'bg-light-textSecondary dark:bg-dark-textSecondary', badgeClass: 'text-light-textSecondary dark:text-dark-textSecondary'       },
};

/** 주문 상태별 차트 색상 */
export const ORDER_STATUS_COLORS: Record<OrderStatusType, string> = {
  order_waiting:   '#FFC107',
  order_confirmed: '#17A2B8',
  order_cancelled: '#DC3545',
  order_completed: '#28A745',
};

// ── 결제 방식 UI 설정 ─────────────────────────────────────────────────────

export const PAYMENT_BADGE: Record<string, { label: string; badgeClass: string }> = {
  card: {
    label: '신용카드',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  bank_transfer: {
    label: '계좌이체',
    badgeClass: 'bg-gray-100 dark:bg-gray-800/50 text-light-textSecondary dark:text-dark-textSecondary',
  },
  kakao_pay: {
    label: '카카오페이',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  },
  naver_pay: {
    label: '네이버페이',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
};

// ── 회원 등급 배지 ────────────────────────────────────────────────────────

export const TIER_BADGE: Record<string, string> = {
  VIP:    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  Gold:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Silver: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300',
  일반:   'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary',
};

// ── 필터 옵션 ────────────────────────────────────────────────────────────

export const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatusType | 'all'; label: string }> = [
  { value: 'all',             label: '전체 주문상태' },
  { value: 'order_waiting',   label: '주문대기'      },
  { value: 'order_confirmed', label: '주문확정'      },
  { value: 'order_cancelled', label: '주문취소'      },
  { value: 'order_completed', label: '주문완료'      },
];

export const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatusType | 'all'; label: string }> = [
  { value: 'all',                label: '전체 결제상태' },
  { value: 'payment_pending',    label: '결제대기'      },
  { value: 'payment_completed',  label: '결제완료'      },
  { value: 'payment_failed',     label: '결제실패'      },
  { value: 'payment_cancelled',  label: '결제취소'      },
  { value: 'refund_in_progress', label: '환불중'        },
  { value: 'refund_completed',   label: '환불완료'      },
];

export const SHIPPING_STATUS_OPTIONS: Array<{ value: ShippingStatusType | 'all'; label: string }> = [
  { value: 'all',                  label: '전체 배송상태' },
  { value: 'shipping_ready',       label: '배송준비'      },
  { value: 'shipping_in_progress', label: '배송중'        },
  { value: 'shipping_completed',   label: '배송완료'      },
  { value: 'shipping_on_hold',     label: '배송보류'      },
  { value: 'return_completed',     label: '반품완료'      },
];

export const PAYMENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all',           label: '전체 결제'  },
  { value: 'card',          label: '신용카드'  },
  { value: 'kakao_pay',     label: '카카오페이' },
  { value: 'naver_pay',     label: '네이버페이' },
  { value: 'bank_transfer', label: '계좌이체'  },
];

// ── 유틸리티 ────────────────────────────────────────────────────────────

const SEOUL_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** ISO 날짜 문자열을 'YYYY.MM.DD HH:mm' 형식으로 포맷 */
export const formatOrderDate = (iso: string): string => {
  const parts = SEOUL_FORMATTER.formatToParts(new Date(iso));
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
};
