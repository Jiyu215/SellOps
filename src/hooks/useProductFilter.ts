'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { ProductStatus, SortOption, ProductPageLimit } from '@/types/products';
import { DEFAULT_SORT, DEFAULT_LIMIT } from '@/constants/productConstants';

// ── URL 파라미터 키 (namespace prefix로 다른 쿼리와 충돌 방지) ─────────────
const KEY_SEARCH = 'p_search';
const KEY_STATUS = 'p_status';
const KEY_SORT   = 'p_sort';
const KEY_PAGE   = 'p_page';
const KEY_LIMIT  = 'p_limit';

// ── 유효값 집합 ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>(['', 'active', 'hidden', 'sold_out']);

const VALID_SORTS = new Set<string>([
  'createdAt_desc', 'createdAt_asc', 'updatedAt_desc',
  'name_asc', 'name_desc', 'price_asc', 'price_desc',
  'available_asc', 'available_desc',
]);

const VALID_LIMITS = new Set<number>([10, 20, 50, 100]);

// ── 파서 ──────────────────────────────────────────────────────────────────────

function parseStatus(raw: string | null): ProductStatus | '' {
  if (raw !== null && VALID_STATUSES.has(raw)) return raw as ProductStatus | '';
  return '';
}

function parseSort(raw: string | null): SortOption {
  if (raw && VALID_SORTS.has(raw)) return raw as SortOption;
  return DEFAULT_SORT;
}

function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parseLimit(raw: string | null): ProductPageLimit {
  const n = parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  return VALID_LIMITS.has(n) ? (n as ProductPageLimit) : DEFAULT_LIMIT;
}

// ── 훅 ────────────────────────────────────────────────────────────────────────

/**
 * 상품 목록 필터/정렬/페이지 상태를 URL 쿼리 파라미터와 동기화하는 훅
 *
 * - router.replace + scroll:false: 히스토리 스택 오염 없이 URL만 교체
 * - 기본값은 URL에서 제거하여 URL을 깔끔하게 유지
 * - 필터/정렬 변경 시 페이지 자동 1로 초기화
 * - useSearchParams 사용 → 부모 컴포넌트에서 Suspense 바운더리 필요
 */
export function useProductFilter() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // URL에서 현재 상태 읽기
  const search  = searchParams.get(KEY_SEARCH) ?? '';
  const status  = parseStatus(searchParams.get(KEY_STATUS));
  const sort    = parseSort(searchParams.get(KEY_SORT));
  const page    = parsePage(searchParams.get(KEY_PAGE));
  const limit   = parseLimit(searchParams.get(KEY_LIMIT));

  /** URL 파라미터를 일괄 업데이트 — 기본값은 키 자체를 삭제 */
  const updateParams = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const isDefault =
          value === null ||
          value === '' ||
          (key === KEY_SORT  && value === DEFAULT_SORT) ||
          (key === KEY_LIMIT && value === String(DEFAULT_LIMIT)) ||
          (key === KEY_PAGE  && value === '1');

        if (isDefault) {
          params.delete(key);
        } else if (value !== undefined) {
          params.set(key, value);
        }
      });

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleSearch = useCallback(
    (value: string) => updateParams({ [KEY_SEARCH]: value, [KEY_PAGE]: null }),
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      if (!VALID_STATUSES.has(value)) return;
      updateParams({ [KEY_STATUS]: value, [KEY_PAGE]: null })
    },
    [updateParams],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (!VALID_SORTS.has(value)) return;
      updateParams({ [KEY_SORT]: value, [KEY_PAGE]: null })
    },
    [updateParams],
  );

  const handlePageChange = useCallback(
    (newPage: number | ((prev: number) => number)) => {
      const raw = typeof newPage === 'function' ? newPage(page) : newPage;
      const next = Number.isFinite(raw) ? Math.max(1, Math.trunc(raw)) : 1;
      updateParams({ [KEY_PAGE]: String(next) });
    },
    [page, updateParams],
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => updateParams({ [KEY_LIMIT]: String(newLimit), [KEY_PAGE]: null }),
    [updateParams],
  );

  /** 모든 필터·정렬을 기본값으로 초기화 */
  const handleReset = useCallback(() => {
    updateParams({
      [KEY_SEARCH]: null,
      [KEY_STATUS]: null,
      [KEY_SORT]:   null,
      [KEY_PAGE]:   null,
      [KEY_LIMIT]:  null,
    });
  }, [updateParams]);

  /** 현재 필터가 기본값인지 여부 (초기화 버튼 활성화 판단) */
  const isFiltered =
    search !== '' ||
    status !== '' ||
    sort !== DEFAULT_SORT ||
    limit !== DEFAULT_LIMIT;

  return {
    filter: { search, status, sort, page, limit },
    isFiltered,
    handleSearch,
    handleStatusChange,
    handleSortChange,
    handlePageChange,
    handleLimitChange,
    handleReset,
  };
}
