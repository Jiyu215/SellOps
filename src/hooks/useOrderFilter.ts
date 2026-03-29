'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { OrderFilter } from '@/types/dashboard';

// URL 파라미터 키 (네임스페이스 접두사로 다른 쿼리와 충돌 방지)
const KEY_SEARCH = 'order_search';
const KEY_STATUS = 'order_status';
const KEY_PAGE   = 'order_page';

const VALID_STATUSES = new Set<string>([
  'all', 'pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded',
]);

function parseStatus(raw: string | null): OrderFilter['status'] {
  return raw && VALID_STATUSES.has(raw)
    ? (raw as OrderFilter['status'])
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
 * - useSearchParams 사용으로 Suspense 바운더리 필요 (DashboardContent에서 처리)
 */
export function useOrderFilter() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  // URL에서 현재 상태 읽기
  const search      = searchParams.get(KEY_SEARCH) ?? '';
  const status      = parseStatus(searchParams.get(KEY_STATUS));
  const currentPage = parsePage(searchParams.get(KEY_PAGE));

  /** URL 파라미터를 일괄 업데이트 — 기본값은 키 자체를 삭제해 URL을 깔끔하게 유지 */
  const updateParams = useCallback(
    (updates: Partial<Record<typeof KEY_SEARCH | typeof KEY_STATUS | typeof KEY_PAGE, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        // 빈 값·기본값은 URL에서 제거
        if (value === null || value === '' || value === 'all' || value === '1') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleSearch = useCallback(
    (value: string) => {
      // 검색어 변경 시 페이지 초기화
      updateParams({ [KEY_SEARCH]: value, [KEY_PAGE]: null });
    },
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      // 상태 필터 변경 시 페이지 초기화
      updateParams({ [KEY_STATUS]: value, [KEY_PAGE]: null });
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
      status,
      paymentMethod: 'all' as OrderFilter['paymentMethod'],
    } satisfies OrderFilter,
    currentPage,
    handleSearch,
    handleStatusChange,
    setCurrentPage,
  };
}
