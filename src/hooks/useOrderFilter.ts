'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { OrderFilter, OrderStatusType, PaymentStatusType, ShippingStatusType } from '@/types/dashboard';

// URL 파라미터 키 (네임스페이스 접두사로 다른 쿼리와 충돌 방지)
const KEY_SEARCH          = 'order_search';
const KEY_ORDER_STATUS    = 'order_status';
const KEY_PAYMENT_STATUS  = 'payment_status';
const KEY_SHIPPING_STATUS = 'shipping_status';
const KEY_PAYMENT         = 'order_payment';
const KEY_PAGE            = 'order_page';

const VALID_ORDER_STATUSES = new Set<string>([
  'all', 'order_waiting', 'order_confirmed', 'order_cancelled', 'order_completed',
]);

const VALID_PAYMENT_STATUSES = new Set<string>([
  'all', 'payment_pending', 'payment_completed', 'payment_failed',
  'payment_cancelled', 'refund_in_progress', 'refund_completed',
]);

const VALID_SHIPPING_STATUSES = new Set<string>([
  'all', 'shipping_ready', 'shipping_in_progress', 'shipping_completed',
  'shipping_on_hold', 'return_completed',
]);

const VALID_PAYMENT_METHODS = new Set<string>([
  'all', 'card', 'bank_transfer', 'kakao_pay', 'naver_pay',
]);

function parseOrderStatus(raw: string | null): OrderFilter['orderStatus'] {
  return raw && VALID_ORDER_STATUSES.has(raw) ? (raw as OrderStatusType | 'all') : 'all';
}

function parsePaymentStatus(raw: string | null): OrderFilter['paymentStatus'] {
  return raw && VALID_PAYMENT_STATUSES.has(raw) ? (raw as PaymentStatusType | 'all') : 'all';
}

function parseShippingStatus(raw: string | null): OrderFilter['shippingStatus'] {
  return raw && VALID_SHIPPING_STATUSES.has(raw) ? (raw as ShippingStatusType | 'all') : 'all';
}

function parsePayment(raw: string | null): OrderFilter['paymentMethod'] {
  return raw && VALID_PAYMENT_METHODS.has(raw)
    ? (raw as OrderFilter['paymentMethod'])
    : 'all';
}

function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * 주문 테이블 필터 상태를 URL 쿼리 파라미터와 동기화하는 훅
 *
 * - router.replace + scroll:false: 히스토리 스택 오염 없이 URL만 교체
 * - 기본값(all, 1, '')은 URL에서 제거하여 URL 깔끔하게 유지
 * - useSearchParams 사용으로 Suspense 바운더리 필요
 */
export function useOrderFilter() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // URL에서 현재 상태 읽기
  const search         = searchParams.get(KEY_SEARCH) ?? '';
  const orderStatus    = parseOrderStatus(searchParams.get(KEY_ORDER_STATUS));
  const paymentStatus  = parsePaymentStatus(searchParams.get(KEY_PAYMENT_STATUS));
  const shippingStatus = parseShippingStatus(searchParams.get(KEY_SHIPPING_STATUS));
  const paymentMethod  = parsePayment(searchParams.get(KEY_PAYMENT));
  const currentPage    = parsePage(searchParams.get(KEY_PAGE));

  /** URL 파라미터를 일괄 업데이트 — 기본값은 키 자체를 삭제해 URL을 깔끔하게 유지 */
  const updateParams = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const shouldDelete = 
          value === null ||
          value === '' ||
          (key !== KEY_SEARCH && value === 'all') ||
          (key === KEY_PAGE && value === '1');

        if (shouldDelete){
          params.delete(key);
        }else if(value!==undefined){
          params.set(key,value);
        }
      });

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleSearch = useCallback(
    (value: string) => {
      updateParams({ [KEY_SEARCH]: value, [KEY_PAGE]: null });
    },
    [updateParams],
  );

  const handleOrderStatusChange = useCallback(
    (value: string) => {
      updateParams({ [KEY_ORDER_STATUS]: value, [KEY_PAGE]: null });
    },
    [updateParams],
  );

  const handlePaymentStatusChange = useCallback(
    (value: string) => {
      updateParams({ [KEY_PAYMENT_STATUS]: value, [KEY_PAGE]: null });
    },
    [updateParams],
  );

  const handleShippingStatusChange = useCallback(
    (value: string) => {
      updateParams({ [KEY_SHIPPING_STATUS]: value, [KEY_PAGE]: null });
    },
    [updateParams],
  );

  const handlePaymentChange = useCallback(
    (value: string) => {
      updateParams({ [KEY_PAYMENT]: value, [KEY_PAGE]: null });
    },
    [updateParams],
  );

  const setCurrentPage = useCallback(
    (page: number | ((prev: number) => number)) => {
      const next = typeof page === 'function' ? page(currentPage) : page;
      updateParams({ [KEY_PAGE]: String(next) });
    },
    [currentPage, updateParams],
  );

  return {
    filter: {
      search,
      orderStatus,
      paymentStatus,
      shippingStatus,
      paymentMethod,
    } satisfies OrderFilter,
    currentPage,
    handleSearch,
    handleOrderStatusChange,
    handlePaymentStatusChange,
    handleShippingStatusChange,
    handlePaymentChange,
    setCurrentPage,
  };
}
