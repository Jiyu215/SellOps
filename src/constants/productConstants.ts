import type { ProductStatus, SortOption, ProductPageLimit } from '@/types/products';

// ── 상품 상태 UI 맵 ──────────────────────────────────────────────────────────

export interface ProductStatusConfig {
  label:     string;
  dotColor:  string;  // Tailwind bg-* class
  badgeClass: string;  // Tailwind text-* class
  ariaLabel: string;
}

export const PRODUCT_STATUS_MAP: Record<ProductStatus, ProductStatusConfig> = {
  active: {
    label:     '판매중',
    dotColor:  'bg-light-success dark:bg-dark-success',
    badgeClass: 'text-light-success dark:text-dark-success',
    ariaLabel: '판매 중 상태',
  },
  hidden: {
    label:     '숨김',
    dotColor:  'bg-light-textSecondary dark:bg-dark-textSecondary',
    badgeClass: 'text-light-textSecondary dark:text-dark-textSecondary',
    ariaLabel: '숨김 상태',
  },
  sold_out: {
    label:     '품절',
    dotColor:  'bg-light-error dark:bg-dark-error',
    badgeClass: 'text-light-error dark:text-dark-error',
    ariaLabel: '품절 상태',
  },
};

// ── 상태 필터 옵션 ───────────────────────────────────────────────────────────

export const PRODUCT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',         label: '전체 상태' },
  { value: 'active',   label: '판매중' },
  { value: 'hidden',   label: '숨김' },
  { value: 'sold_out', label: '품절' },
];

// ── 정렬 옵션 ────────────────────────────────────────────────────────────────

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'createdAt_desc',  label: '최신 등록순' },
  { value: 'createdAt_asc',   label: '오래된 등록순' },
  { value: 'updatedAt_desc',  label: '최근 수정순' },
  { value: 'name_asc',        label: '상품명 오름차순' },
  { value: 'name_desc',       label: '상품명 내림차순' },
  { value: 'price_asc',       label: '낮은 가격순' },
  { value: 'price_desc',      label: '높은 가격순' },
  { value: 'available_asc',   label: '재고 적은 순' },
  { value: 'available_desc',  label: '재고 많은 순' },
];

// ── 일괄 상태 변경 옵션 ──────────────────────────────────────────────────────

export const BULK_STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: 'active',   label: '판매중으로 변경' },
  { value: 'hidden',   label: '숨김으로 변경' },
  { value: 'sold_out', label: '품절로 변경' },
];

// ── 재고 표시 기준 ───────────────────────────────────────────────────────────

/** 가용 재고 위험 기준 */
export const STOCK_CRITICAL_THRESHOLD = 0;
/** 가용 재고 주의 기준 */
export const STOCK_WARNING_THRESHOLD  = 9;

/**
 * 가용 재고에 따른 표시 클래스 반환
 * critical(0): 빨강 / warning(1-9): 주황 / normal(10+): 기본
 */
export function getStockClass(available: number): string {
  if (available === STOCK_CRITICAL_THRESHOLD) {
    return 'text-light-error dark:text-dark-error font-semibold';
  }
  if (available <= STOCK_WARNING_THRESHOLD) {
    return 'text-light-warning dark:text-dark-warning font-semibold';
  }
  return 'text-light-textPrimary dark:text-dark-textPrimary';
}

// ── 페이지네이션 ─────────────────────────────────────────────────────────────

export const PAGE_LIMIT_OPTIONS: ProductPageLimit[] = [10, 20, 50, 100];
export const DEFAULT_SORT:  SortOption      = 'createdAt_desc';
export const DEFAULT_LIMIT: ProductPageLimit = 20;

// ── 재고 표시 레이블 ─────────────────────────────────────────────────────────

export function getStockAriaLabel(available: number, total: number): string {
  if (available === 0) return `재고 없음 (전체 ${total}개)`;
  if (available <= STOCK_WARNING_THRESHOLD) return `재고 주의: 가용 ${available}개 / 전체 ${total}개`;
  return `가용 재고 ${available}개 / 전체 ${total}개`;
}
