'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  InboxOutlined,
  FileSearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ProductListItem, ProductStatus, ProductStatusSummary } from '@/types/products';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useSearchInput } from '@/hooks/useSearchInput';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  PRODUCT_STATUS_MAP,
  PRODUCT_STATUS_OPTIONS,
  SORT_OPTIONS,
  BULK_STATUS_OPTIONS,
  PAGE_LIMIT_OPTIONS,
  getStockClass,
  getStockAriaLabel,
} from '@/constants/productConstants';
import {
  filterProductsBySearch,
  sortProducts,
  computeStatusSummary,
  exportProductsToCSV,
  formatPrice,
  formatProductDate,
  formatCompactNumber,
} from '@/utils/productUtils';

// ── Props ────────────────────────────────────────────────────────────────────

interface ProductTableProps {
  products:            ProductListItem[];
  onBulkStatusChange:  (ids: string[], status: ProductStatus) => Promise<void>;
  onBulkDelete:        (ids: string[]) => Promise<void>;
  /** 단일 상품 삭제 */
  onSingleDelete:      (id: string) => Promise<void>;
  /** CSV 내보내기 성공/실패 콜백 */
  onExportResult?:     (result: 'success' | 'error') => void;
  /** 내보내기 로딩 상태 외부 제어 */
  exportLoading?:      boolean;
  onExportLoadingChange?: (loading: boolean) => void;
}

// ── 확인 모달 ─────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title:        string;
  message:      string;
  confirmLabel: string;
  isDanger:     boolean;
  loading?:     boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}

/**
 * 반응형 확인 모달
 * createPortal로 document.body에 마운트 → 부모 transform 영향 없음
 * 모바일: 하단 시트 / 태블릿+: 중앙 다이얼로그
 */
const ConfirmModal = ({
  title, message, confirmLabel, isDanger, loading = false, onConfirm, onCancel,
}: ConfirmModalProps) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
    };
  }, [onCancel, loading]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-confirm-title"
      onClick={() => { if (!loading) onCancel(); }}
    >
      <div className="absolute inset-0 bg-black/50 animate-modal-backdrop" aria-hidden="true" />
      <div
        className={[
          'relative w-full bg-light-surface dark:bg-dark-surface shadow-xl z-10 overflow-y-auto',
          'rounded-t-lg animate-modal-slide-up max-h-[85vh] px-md pt-xs pb-xl',
          'md:rounded-lg md:animate-modal-fade-scale md:w-[420px]',
          'md:max-w-[calc(100vw-2rem)] md:max-h-[80vh] md:px-lg md:pt-lg md:pb-lg',
          'lg:w-[440px] xl:w-[460px]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들바 (모바일 전용) */}
        <div className="flex justify-center pt-sm pb-md md:hidden" aria-hidden="true">
          <div className="w-9 h-1 rounded-full bg-light-border dark:bg-dark-border" />
        </div>

        {/* X 버튼 (태블릿+) */}
        {!loading && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="모달 닫기"
            className="hidden md:flex absolute top-md right-md p-xs rounded-md text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary md:transition-colors"
          >
            <CloseOutlined aria-hidden="true" />
          </button>
        )}

        <h3 id="product-confirm-title" className="text-bodyLg font-bold text-light-textPrimary dark:text-dark-textPrimary mb-sm text-center">
          {title}
        </h3>
        <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary mb-lg text-center">
          {message}
        </p>

        <div className="flex flex-col-reverse gap-sm items-center md:flex-row md:justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full md:w-auto px-md rounded-md text-bodySm font-medium py-sm md:py-xs border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary md:transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              'w-full md:w-auto px-md rounded-md text-bodySm font-semibold text-white py-sm md:py-xs md:transition-opacity disabled:opacity-70',
              isDanger
                ? 'bg-light-error dark:bg-dark-error md:hover:opacity-90'
                : 'bg-light-primary dark:bg-dark-primary md:hover:opacity-90',
            ].join(' ')}
          >
            {loading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// ── 상태 뱃지 ─────────────────────────────────────────────────────────────────

const ProductStatusBadge = ({ status }: { status: ProductStatus }) => {
  const cfg = PRODUCT_STATUS_MAP[status];
  return (
    <span
      className="inline-flex items-center gap-xs"
      aria-label={cfg.ariaLabel}
    >
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} aria-hidden="true" />
      <span className={`text-caption whitespace-nowrap ${cfg.badgeClass}`}>{cfg.label}</span>
    </span>
  );
};

// ── 이미지 플레이스홀더 ───────────────────────────────────────────────────────

const ProductImagePlaceholder = ({ name, className = '' }: { name: string; className?: string }) => (
  <div
    className={`bg-light-secondary dark:bg-dark-secondary rounded-md flex items-center justify-center flex-shrink-0 ${className}`}
    aria-label={`${name} 썸네일 없음`}
  >
    <InboxOutlined
      className="text-light-textSecondary dark:text-dark-textSecondary"
      style={{ fontSize: '1rem' }}
      aria-hidden="true"
    />
  </div>
);

// ── StatSummaryBar ────────────────────────────────────────────────────────────

interface StatSummaryBarProps {
  summary:        ProductStatusSummary;
  activeStatus:   string;
  onStatusChange: (status: string) => void;
}

const StatSummaryBar = ({ summary, activeStatus, onStatusChange }: StatSummaryBarProps) => {
  const STATS = [
    { key: '',         label: '전체',  value: summary.total,    tooltip: summary.total.toLocaleString() },
    { key: 'active',   label: '판매중', value: summary.active,   tooltip: summary.active.toLocaleString() },
    { key: 'hidden',   label: '숨김',   value: summary.hidden,   tooltip: summary.hidden.toLocaleString() },
    { key: 'sold_out', label: '품절',   value: summary.sold_out, tooltip: summary.sold_out.toLocaleString() },
  ] as const;

  return (
    <div
      className="grid grid-cols-4 gap-xs mb-md"
      role="group"
      aria-label="상품 상태별 집계"
    >
      {STATS.map(({ key, label, value, tooltip }) => {
        const isActive = activeStatus === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onStatusChange(key)}
            title={`${label}: ${tooltip}건`}
            aria-pressed={isActive}
            className={[
              'flex flex-col items-center justify-center py-sm px-xs rounded-md border transition-colors text-center',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary',
              isActive
                ? 'border-light-primary dark:border-dark-primary bg-light-secondary dark:bg-dark-secondary'
                : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary',
            ].join(' ')}
          >
            <span className={`text-h5 font-bold ${isActive ? 'text-light-primary dark:text-dark-primary' : 'text-light-textPrimary dark:text-dark-textPrimary'}`}>
              {formatCompactNumber(value)}
            </span>
            <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ── BulkActionBar ─────────────────────────────────────────────────────────────

interface BulkActionBarProps {
  selectedCount:    number;
  onStatusChange:   (status: ProductStatus) => void;
  onDelete:         () => void;
  onClearSelection: () => void;
}

const BulkActionBar = ({ selectedCount, onStatusChange, onDelete, onClearSelection }: BulkActionBarProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-sm py-sm px-md rounded-md bg-light-secondary dark:bg-dark-secondary border border-light-border dark:border-dark-border mb-md">
      {/* 선택 카운트 */}
      <span className="text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary flex-1 min-w-0">
        <span className="text-light-primary dark:text-dark-primary">{selectedCount}개</span>
        {' '}선택됨
      </span>

      {/* 상태 변경 드롭다운 */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex items-center gap-xs text-bodySm font-medium px-sm py-xs rounded-md border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-textPrimary dark:text-dark-textPrimary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary md:transition-colors"
        >
          <SwapOutlined aria-hidden="true" />
          상태 변경
          <span className="text-caption" aria-hidden="true">▾</span>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-xs z-20 min-w-[140px] bg-light-surface dark:bg-dark-surface rounded-md shadow-lg border border-light-border dark:border-dark-border py-xs"
          >
            {BULK_STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onStatusChange(value); }}
                className="w-full text-left px-md py-xs text-bodySm text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary md:transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 선택 삭제 */}
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-xs text-bodySm font-medium px-sm py-xs rounded-md border border-red-200 dark:border-red-900/30 text-light-error dark:text-dark-error bg-red-50 dark:bg-red-900/10 md:hover:bg-red-100 dark:md:hover:bg-red-900/20 md:transition-colors"
      >
        <DeleteOutlined aria-hidden="true" />
        선택 삭제
      </button>

      {/* 선택 취소 */}
      <button
        type="button"
        onClick={onClearSelection}
        className="inline-flex items-center gap-xs text-bodySm text-light-textSecondary dark:text-dark-textSecondary md:hover:text-light-textPrimary dark:md:hover:text-dark-textPrimary md:transition-colors"
        aria-label="선택 취소"
      >
        <CloseOutlined aria-hidden="true" />
        <span className="hidden sm:inline">선택 취소</span>
      </button>
    </div>
  );
};

// ── 페이지네이션 ──────────────────────────────────────────────────────────────

interface PaginationProps {
  page:          number;
  totalPages:    number;
  total:         number;
  limit:         number;
  onPageChange:  (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/**
 * 페이지당 항목 수 선택 + 페이지 번호 + 총 건수
 * 번호 표시: 최대 5개 + 줄임표
 */
const Pagination = ({ page, totalPages, total, limit, onPageChange, onLimitChange }: PaginationProps) => {
  /**
   * 항상 최대 5슬롯 고정 (개수 불변)
   *
   * totalPages ≤ 5  → 전체 표시 (줄임표 없음)
   * totalPages > 5  → 항상 5슬롯:
   *   앞쪽  (page ≤ 3)        : [1][2][3][…][N]
   *   뒤쪽  (page ≥ N-2)      : [1][…][N-2][N-1][N]
   *   중간  (otherwise)       : [1][…][page][…][N]
   */
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (page >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page, '...', totalPages];
  }, [page, totalPages]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-sm mt-md pt-md border-t border-light-border dark:border-dark-border">
      {/* 페이지당 항목 수 */}
      <div className="flex items-center gap-xs">
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          aria-label="페이지당 항목 수"
          className="bg-light-secondary dark:bg-dark-secondary border border-light-border dark:border-dark-border rounded-md text-caption text-light-textPrimary dark:text-dark-textPrimary px-xs py-xs outline-none cursor-pointer"
        >
          {PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n} className="bg-light-surface dark:bg-dark-surface">
              {n}개
            </option>
          ))}
        </select>
        <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
          총{' '}
          <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">
            {total.toLocaleString()}
          </span>
          건
        </span>
      </div>

      {/* 페이지 번호 */}
      <div className="flex items-center gap-xs" role="navigation" aria-label="페이지 탐색">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="이전 페이지"
          className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed md:transition-colors"
        >
          <LeftOutlined aria-hidden="true" />
          <span className="hidden sm:inline">이전</span>
        </button>

        {pageNumbers.map((n, i) =>
          n === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-xs text-caption text-light-textSecondary dark:text-dark-textSecondary"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-label={`${n}페이지`}
              aria-current={page === n ? 'page' : undefined}
              className={[
                'w-7 h-7 rounded-md text-caption font-semibold transition-colors',
                page === n
                  ? 'bg-light-primary dark:bg-dark-primary text-white'
                  : 'text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary',
              ].join(' ')}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="다음 페이지"
          className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed md:transition-colors"
        >
          <span className="hidden sm:inline">다음</span>
          <RightOutlined aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

// ── 빈 상태 ───────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  isFiltered: boolean;
  onReset:    () => void;
}

const EmptyState = ({ isFiltered, onReset }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-xxxl gap-md text-center">
    {isFiltered ? (
      <>
        <FileSearchOutlined
          className="text-light-textSecondary dark:text-dark-textSecondary"
          style={{ fontSize: '3rem' }}
          aria-hidden="true"
        />
        <div>
          <p className="text-bodyLg font-semibold text-light-textPrimary dark:text-dark-textPrimary">
            검색 결과가 없습니다.
          </p>
          <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            조건을 변경하여 다시 검색해보세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-xs text-bodySm font-medium px-md py-xs rounded-md bg-light-secondary dark:bg-dark-secondary text-light-primary dark:text-dark-primary md:hover:bg-blue-100 dark:md:hover:bg-blue-900/30 md:transition-colors"
        >
          <ReloadOutlined aria-hidden="true" />
          필터 초기화
        </button>
      </>
    ) : (
      <>
        <InboxOutlined
          className="text-light-textSecondary dark:text-dark-textSecondary"
          style={{ fontSize: '3rem' }}
          aria-hidden="true"
        />
        <div>
          <p className="text-bodyLg font-semibold text-light-textPrimary dark:text-dark-textPrimary">
            등록된 상품이 없습니다.
          </p>
          <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            첫 번째 상품을 등록해보세요.
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-xs text-bodySm font-semibold px-md py-sm rounded-md bg-light-primary dark:bg-dark-primary text-white md:hover:opacity-90 md:transition-opacity"
        >
          <PlusOutlined aria-hidden="true" />
          상품 등록
        </Link>
      </>
    )}
  </div>
);

// ── 테이블 컬럼 ───────────────────────────────────────────────────────────────

const TABLE_COLS = [
  { key: 'checkbox',  label: '',      thClass: 'w-10'                          },
  { key: 'image',     label: '',      thClass: 'w-12'                          },
  { key: 'name',      label: '상품명 / 코드', thClass: ''                     },
  { key: 'price',     label: '판매가', thClass: ''                             },
  { key: 'stock',     label: '재고',   thClass: 'hidden lg:table-cell'         }, // 태블릿 숨김
  { key: 'status',    label: '상태',   thClass: ''                             },
  { key: 'updatedAt', label: '수정일', thClass: 'hidden lg:table-cell'         }, // 태블릿 숨김
  { key: 'action',    label: '관리',   thClass: 'text-right'                   },
] as const;

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

/**
 * 상품 관리 테이블
 *
 * ### 레이아웃
 * - PageHeader: 타이틀 + CSV Export + 상품 등록 버튼
 * - StatSummaryBar: 상태별 집계 (클릭 시 필터 적용)
 * - FilterBar: 검색 + 상태 필터 + 정렬 + 초기화
 * - BulkActionBar: 1개 이상 선택 시 FilterBar를 대체
 * - ProductTable: 체크박스 + 이미지 + 상품명/코드 + 가격 + 재고 + 상태 + 수정일 + 관리
 * - Pagination: 페이지당 항목 수 + 번호 + 총 건수
 *
 * ### 반응형
 * - PC (≥1280px): 전체 컬럼
 * - 태블릿 (768~1279px): 재고·수정일 컬럼 숨김
 * - 모바일 (<768px): 카드형 리스트
 */
export const ProductTable = ({
  products,
  onBulkStatusChange,
  onBulkDelete,
  onSingleDelete,
  onExportResult,
  exportLoading = false,
  onExportLoadingChange,
}: ProductTableProps) => {
  const {
    filter,
    isFiltered,
    handleSearch,
    handleStatusChange,
    handleSortChange,
    handlePageChange,
    handleLimitChange,
    handleReset,
  } = useProductFilter();

  const isMobile = useMediaQuery('(max-width: 767px)');

  // ── 검색 입력 ─────────────────────────────────────────────────────────────
  const { inputValue, onInputChange, onCompositionStart, onCompositionEnd } =
    useSearchInput({ initialValue: filter.search, onSearch: handleSearch });

  // ── 체크박스 선택 ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 필터 변경 시 선택 초기화
  const prevFilterKey = useRef('');
  const filterKey = `${filter.search}|${filter.status}|${filter.sort}|${filter.page}|${filter.limit}`;
  if (prevFilterKey.current !== filterKey) {
    prevFilterKey.current = filterKey;
    if (selectedIds.size > 0) setSelectedIds(new Set());
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── 모달 상태 ─────────────────────────────────────────────────────────────
  type ModalState =
    | { type: 'bulk_status'; status: ProductStatus }
    | { type: 'bulk_delete' }
    | { type: 'single_delete'; productId: string; productName: string }
    | null;

  const [modal, setModal]       = useState<ModalState>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── 집계 (전체 상품 기준) ──────────────────────────────────────────────────
  const summary: ProductStatusSummary = useMemo(
    () => computeStatusSummary(products),
    [products],
  );

  // ── 필터링 + 정렬 ──────────────────────────────────────────────────────────
  const processedProducts = useMemo(() => {
    let result = products;
    if (filter.status) result = result.filter((p) => p.status === filter.status);
    result = filterProductsBySearch(result, filter.search);
    return sortProducts(result, filter.sort);
  }, [products, filter.search, filter.status, filter.sort]);

  // ── 페이지네이션 ───────────────────────────────────────────────────────────
  const total      = processedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / filter.limit));
  const safePage   = Math.min(filter.page, totalPages);
  const paginatedProducts = processedProducts.slice(
    (safePage - 1) * filter.limit,
    safePage * filter.limit,
  );

  // ── 헤더 체크박스 상태 ────────────────────────────────────────────────────
  const currentPageIds = paginatedProducts.map((p) => p.id);
  const allCurrentSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.has(id));
  const someCurrentSelected =
    !allCurrentSelected && currentPageIds.some((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allCurrentSelected, currentPageIds]);

  // ── 일괄 처리 핸들러 ──────────────────────────────────────────────────────
  const handleBulkStatusConfirm = useCallback(async () => {
    if (modal?.type !== 'bulk_status') return;
    setActionLoading(true);
    try {
      await onBulkStatusChange([...selectedIds], modal.status);
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
      setModal(null);
    }
  }, [modal, selectedIds, onBulkStatusChange]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (modal?.type !== 'bulk_delete') return;
    setActionLoading(true);
    try {
      await onBulkDelete([...selectedIds]);
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
      setModal(null);
    }
  }, [modal, selectedIds, onBulkDelete]);

  const handleSingleDeleteConfirm = useCallback(async () => {
    if (modal?.type !== 'single_delete') return;
    setActionLoading(true);
    try {
      await onSingleDelete(modal.productId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(modal.productId);
        return next;
      });
    } finally {
      setActionLoading(false);
      setModal(null);
    }
  }, [modal, onSingleDelete]);

  // ── CSV 내보내기 ──────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    onExportLoadingChange?.(true);
    try {
      const result = exportProductsToCSV(processedProducts);
      onExportResult?.(result);
    } finally {
      onExportLoadingChange?.(false);
    }
  }, [processedProducts, onExportResult, onExportLoadingChange]);

  // ── 헬퍼: StatSummaryBar 클릭 처리 ────────────────────────────────────────
  const handleStatClick = useCallback((status: string) => {
    handleStatusChange(status);
  }, [handleStatusChange]);

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">

      {/* ── PageHeader ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-sm mb-md">
        <div>
          <h1 className="text-h4 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            상품관리
          </h1>
          <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            {filter.status
              ? `${PRODUCT_STATUS_MAP[filter.status as ProductStatus].label} 상품 · ${total.toLocaleString()}건`
              : `전체 상품 · ${summary.total.toLocaleString()}건`}
          </p>
        </div>
        <div className="flex items-center gap-xs flex-shrink-0">
          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exportLoading || processedProducts.length === 0}
            className="inline-flex items-center gap-xs text-caption font-medium px-sm py-xs rounded-md bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-primary dark:md:hover:bg-dark-primary md:hover:text-white md:transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="CSV 내보내기"
          >
            <DownloadOutlined aria-hidden="true" />
            <span className="hidden sm:inline">{exportLoading ? '내보내는 중...' : 'CSV Export'}</span>
          </button>

          {/* 상품 등록 */}
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md bg-light-primary dark:bg-dark-primary text-white md:hover:opacity-90 md:transition-opacity"
            aria-label="새 상품 등록"
          >
            <PlusOutlined aria-hidden="true" />
            <span className="hidden sm:inline">상품 등록</span>
          </Link>
        </div>
      </div>

      {/* ── StatSummaryBar ─────────────────────────────────────────────── */}
      <StatSummaryBar
        summary={summary}
        activeStatus={filter.status}
        onStatusChange={handleStatClick}
      />

      {/* ── FilterBar or BulkActionBar ──────────────────────────────────── */}
      {selectedIds.size > 0 ? (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onStatusChange={(status) => setModal({ type: 'bulk_status', status })}
          onDelete={() => setModal({ type: 'bulk_delete' })}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-sm mb-md">
          {/* 검색바 */}
          <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors flex-1 min-w-[200px]">
            <SearchOutlined className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0" aria-hidden="true" />
            <input
              type="search"
              role="searchbox"
              placeholder="상품명 또는 상품코드 검색"
              value={inputValue}
              onChange={onInputChange}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              className="flex-1 bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textSecondary dark:placeholder:text-dark-textSecondary outline-none min-w-0"
              aria-label="상품 검색"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => { handleSearch(''); }}
                aria-label="검색어 초기화"
                className="text-light-textSecondary dark:text-dark-textSecondary md:hover:text-light-textPrimary dark:md:hover:text-dark-textPrimary"
              >
                <CloseOutlined style={{ fontSize: '0.75rem' }} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border flex-shrink-0">
            <FilterOutlined className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0" aria-hidden="true" />
            <select
              value={filter.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="상태 필터"
              className="bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary outline-none cursor-pointer"
            >
              {PRODUCT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-light-surface dark:bg-dark-surface">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 정렬 */}
          <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border flex-shrink-0">
            <select
              value={filter.sort}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="정렬 기준"
              className="bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-light-surface dark:bg-dark-surface">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 초기화 버튼 */}
          <button
            type="button"
            onClick={handleReset}
            disabled={!isFiltered}
            className="inline-flex items-center gap-xs text-caption font-medium px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-light-secondary dark:md:hover:bg-dark-secondary md:transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="필터 초기화"
          >
            <ReloadOutlined aria-hidden="true" />
            <span className="hidden sm:inline">초기화</span>
          </button>
        </div>
      )}

      {/* ── 데스크탑/태블릿 테이블 (≥768px) ────────────────────────────── */}
      {!isMobile && (
        <div className="overflow-x-auto">
          <table className="w-full text-bodySm" aria-label="상품 목록 테이블">
            <caption className="sr-only">상품 관리 목록</caption>
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border">
                {/* 헤더 체크박스 */}
                <th className="py-sm px-sm w-10" scope="col">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    ref={(el) => { if (el) el.indeterminate = someCurrentSelected; }}
                    onChange={toggleAll}
                    aria-label="현재 페이지 전체 선택"
                    className="w-4 h-4 rounded accent-light-primary dark:accent-dark-primary cursor-pointer"
                  />
                </th>
                {TABLE_COLS.slice(1).map(({ key, label, thClass }) => (
                  <th
                    key={key}
                    className={[
                      'text-left py-sm px-sm text-caption font-semibold',
                      'text-light-textSecondary dark:text-dark-textSecondary',
                      'uppercase tracking-wide whitespace-nowrap',
                      thClass,
                    ].join(' ')}
                    scope="col"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS.length} className="py-0">
                    <EmptyState isFiltered={isFiltered} onReset={handleReset} />
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isSelected = selectedIds.has(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={[
                        'border-b border-light-border dark:border-dark-border last:border-0 transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/10'
                          : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                      ].join(' ')}
                    >
                      {/* 체크박스 */}
                      <td className="py-sm px-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                          aria-label={`${product.name} 선택`}
                          className="w-4 h-4 rounded accent-light-primary dark:accent-dark-primary cursor-pointer"
                        />
                      </td>

                      {/* 썸네일 */}
                      <td className="py-sm px-sm">
                        {product.thumbnailUrl ? (
                          <Image
                            src={product.thumbnailUrl}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <ProductImagePlaceholder name={product.name} className="w-10 h-10" />
                        )}
                      </td>

                      {/* 상품명 / 코드 */}
                      <td className="py-sm px-sm">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="font-semibold text-light-textPrimary dark:text-dark-textPrimary hover:text-light-primary dark:hover:text-dark-primary hover:underline transition-colors block truncate max-w-[220px]"
                        >
                          {product.name}
                        </Link>
                        <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
                          {product.productCode}
                        </span>
                      </td>

                      {/* 판매가 */}
                      <td className="py-sm px-sm">
                        <span className="font-bold text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap">
                          {formatPrice(product.price)}
                        </span>
                      </td>

                      {/* 재고 (태블릿 숨김) */}
                      <td
                        className="py-sm px-sm hidden lg:table-cell"
                        aria-label={getStockAriaLabel(product.availableStock, product.totalStock)}
                      >
                        <span className={`text-caption whitespace-nowrap ${getStockClass(product.availableStock)}`}>
                          {product.availableStock.toLocaleString()} / {product.totalStock.toLocaleString()}
                        </span>
                      </td>

                      {/* 상태 */}
                      <td className="py-sm px-sm">
                        <ProductStatusBadge status={product.status} />
                      </td>

                      {/* 수정일 (태블릿 숨김) */}
                      <td className="py-sm px-sm hidden lg:table-cell">
                        <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
                          {formatProductDate(product.updatedAt)}
                        </span>
                      </td>

                      {/* 관리 */}
                      <td className="py-sm px-sm">
                        <div className="flex items-center justify-end gap-xs">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            aria-label={`${product.name} 수정`}
                            className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary md:hover:bg-blue-100 dark:md:hover:bg-blue-900/30 md:hover:text-light-primary dark:md:hover:text-dark-primary md:transition-colors whitespace-nowrap"
                          >
                            <EditOutlined aria-hidden="true" />
                            수정
                          </Link>
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'single_delete', productId: product.id, productName: product.name })}
                            aria-label={`${product.name} 삭제`}
                            className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-red-200 dark:border-red-900/30 text-light-error dark:text-dark-error bg-red-50 dark:bg-red-900/10 md:hover:bg-red-100 dark:md:hover:bg-red-900/20 md:transition-colors whitespace-nowrap"
                          >
                            <DeleteOutlined aria-hidden="true" />
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 모바일 카드 목록 (<768px) ──────────────────────────────────── */}
      {isMobile && (
        <div className="flex flex-col gap-sm" role="list" aria-label="상품 목록">
          {paginatedProducts.length === 0 ? (
            <EmptyState isFiltered={isFiltered} onReset={handleReset} />
          ) : (
            paginatedProducts.map((product) => {
              const isSelected = selectedIds.has(product.id);
              return (
                <div
                  key={product.id}
                  role="listitem"
                  className={[
                    'border rounded-md p-sm flex gap-sm transition-all duration-200',
                    isSelected
                      ? 'border-light-primary dark:border-dark-primary bg-blue-50 dark:bg-blue-900/10'
                      : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:shadow-md',
                  ].join(' ')}
                >
                  {/* 체크박스 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(product.id)}
                    aria-label={`${product.name} 선택`}
                    className="w-4 h-4 mt-xs rounded accent-light-primary dark:accent-dark-primary cursor-pointer flex-shrink-0"
                  />

                  {/* 썸네일 */}
                  {product.thumbnailUrl ? (
                    <Image
                      src={product.thumbnailUrl}
                      alt={product.name}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <ProductImagePlaceholder name={product.name} className="w-14 h-14" />
                  )}

                  {/* 정보 */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="font-semibold text-bodySm text-light-textPrimary dark:text-dark-textPrimary hover:text-light-primary dark:hover:text-dark-primary hover:underline block truncate"
                    >
                      {product.name}
                    </Link>
                    <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
                      {product.productCode}
                    </p>
                    <div className="flex items-center justify-between mt-xs flex-wrap gap-xs">
                      <span className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
                        {formatPrice(product.price)}
                      </span>
                      <ProductStatusBadge status={product.status} />
                    </div>
                    <p
                      className={`text-caption mt-xs ${getStockClass(product.availableStock)}`}
                      aria-label={getStockAriaLabel(product.availableStock, product.totalStock)}
                    >
                      재고: {product.availableStock.toLocaleString()}개
                    </p>

                    {/* 수정 / 삭제 버튼 */}
                    <div className="flex gap-xs mt-sm pt-sm border-t border-light-border dark:border-dark-border">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        aria-label={`${product.name} 수정`}
                        className="flex-1 inline-flex items-center justify-center gap-xs text-caption font-semibold px-sm py-xs rounded-md bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary active:bg-blue-100 dark:active:bg-blue-900/30 active:text-light-primary dark:active:text-dark-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EditOutlined aria-hidden="true" />
                        수정
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ type: 'single_delete', productId: product.id, productName: product.name });
                        }}
                        aria-label={`${product.name} 삭제`}
                        className="flex-1 inline-flex items-center justify-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-red-200 dark:border-red-900/30 text-light-error dark:text-dark-error bg-red-50 dark:bg-red-900/10 active:bg-red-100 dark:active:bg-red-900/20 transition-colors"
                      >
                        <DeleteOutlined aria-hidden="true" />
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {total > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={total}
          limit={filter.limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      {/* ── 확인 모달 ────────────────────────────────────────────────────── */}
      {modal?.type === 'bulk_status' && (
        <ConfirmModal
          title="상태를 변경하시겠습니까?"
          message={`${selectedIds.size}개 상품의 상태를 [${PRODUCT_STATUS_MAP[modal.status].label}]으로 변경합니다.`}
          confirmLabel="상태 변경"
          isDanger={false}
          loading={actionLoading}
          onConfirm={handleBulkStatusConfirm}
          onCancel={() => { if (!actionLoading) setModal(null); }}
        />
      )}
      {modal?.type === 'bulk_delete' && (
        <ConfirmModal
          title="상품을 삭제하시겠습니까?"
          message={`선택한 ${selectedIds.size}개 상품을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          isDanger={true}
          loading={actionLoading}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => { if (!actionLoading) setModal(null); }}
        />
      )}
      {modal?.type === 'single_delete' && (
        <ConfirmModal
          title="상품을 삭제하시겠습니까?"
          message={`"${modal.productName}" 상품을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          isDanger={true}
          loading={actionLoading}
          onConfirm={handleSingleDeleteConfirm}
          onCancel={() => { if (!actionLoading) setModal(null); }}
        />
      )}
    </section>
  );
};
