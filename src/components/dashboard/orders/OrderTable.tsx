'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Order } from '@/types/dashboard';
import { OrderActionCell } from '@/components/dashboard/orders/OrderActionCell';
import { matchesKorean } from '@/utils/choseong';
import { useOrderFilter } from '@/hooks/useOrderFilter';
import { useSearchInput } from '@/hooks/useSearchInput';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  ORDER_PAGE_SIZE_PC,
  ORDER_PAGE_SIZE_TABLET,
  ORDER_PAGE_SIZE_MOBILE,
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_INFO,
  COLOR_WARNING,
  COLOR_ERROR,
  COLOR_PURPLE,
} from '@/constants/config';

import {
  ORDER_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  SHIPPING_STATUS_MAP,
  PAYMENT_BADGE,
  TIER_BADGE,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SHIPPING_STATUS_OPTIONS,
  formatOrderDate,
} from '@/constants/orderConstants';

interface OrderTableProps {
  orders: Order[];
  /**
   * 표시 모드
   * - 'dashboard' (기본): 단일 "상태" 컬럼 (주문 상태), 1개 상태 필터
   * - 'orders': 주문/결제/배송 3개 상태 컬럼, 3개 상태 필터, 액션 버튼
   */
  variant?:       'dashboard' | 'orders';
  /** orders variant 전용: 상태 변경 시 호출 */
  onOrderUpdate?: (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => void;
}

/**
 * 반응형 컬럼 구성
 *
 * [dashboard variant] 7컬럼
 *   PC/태블릿: 주문번호 | 고객정보 | 상품 정보 | 결제 금액 | 결제 방식(PC only) | 상태 | 주문 일시
 *
 * [orders variant] 9컬럼
 *   PC(≥1280px)  : 전체 9컬럼
 *   태블릿(768~1279px): 결제 방식·상품 정보·결제 상태 숨김 → 6컬럼
 *   모바일(<768px): 카드형 (결제 방식 제외)
 */
const DASHBOARD_TABLE_COLS = [
  { key: '주문번호',  thClass: 'pl-0'                 },
  { key: '고객정보',  thClass: ''                     },
  { key: '상품 정보', thClass: ''                     },
  { key: '결제 금액', thClass: ''                     },
  { key: '결제 방식', thClass: 'hidden xl:table-cell' },
  { key: '상태',      thClass: ''                     }, // 주문 상태 단일 컬럼
  { key: '주문 일시', thClass: ''                     },
] as const;

const ORDERS_TABLE_COLS = [
  { key: '주문번호',  thClass: 'pl-0'                 },
  { key: '고객정보',  thClass: ''                     },
  { key: '상품 정보', thClass: 'hidden xl:table-cell' }, // 태블릿 숨김
  { key: '결제 금액', thClass: ''                     },
  { key: '결제 방식', thClass: 'hidden xl:table-cell' }, // 태블릿 숨김
  { key: '주문 상태', thClass: ''                     },
  { key: '결제 상태', thClass: 'hidden xl:table-cell' }, // 태블릿 숨김
  { key: '배송 상태', thClass: ''                     },
  { key: '주문 일시', thClass: ''                     },
  { key: '액션',      thClass: 'text-right'           },
] as const;

const AVATAR_COLORS = [
  COLOR_PRIMARY, COLOR_SUCCESS, COLOR_INFO, COLOR_WARNING, COLOR_ERROR, COLOR_PURPLE,
] as const;

/** CSV 내보내기 */
const exportToCSV = (orders: Order[]): void => {
  const headers = ['주문번호', '고객명', '이메일', '상품', '금액', '결제방법', '주문상태', '결제상태', '배송상태', '주문일시'];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.customer.name,
    o.customer.email,
    o.products.map((p) => `${p.name}×${p.quantity}`).join('; '),
    o.totalAmount.toLocaleString(),
    PAYMENT_BADGE[o.paymentMethod]?.label ?? o.paymentMethod,
    ORDER_STATUS_MAP[o.orderStatus].label,
    PAYMENT_STATUS_MAP[o.paymentStatus].label,
    SHIPPING_STATUS_MAP[o.shippingStatus].label,
    formatOrderDate(o.createdAt),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 고객 아바타: 이름 첫 글자 이니셜, char code 기반 색상 */
const CustomerAvatar = ({ name }: { name: string }) => (
  <div
    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-bold flex-shrink-0"
    style={{ backgroundColor: AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }}
    aria-hidden="true"
  >
    {name.charAt(0)}
  </div>
);

/** 상태 인라인 뱃지: 색상 점 + 텍스트 */
const StatusBadge = ({ dotColor, badgeClass, label }: { dotColor: string; badgeClass: string; label: string }) => (
  <span className="inline-flex items-center gap-xs">
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} aria-hidden="true" />
    <span className={`text-caption whitespace-nowrap ${badgeClass}`}>{label}</span>
  </span>
);

/** 공통 필터 드롭다운 */
const FilterSelect = ({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  ariaLabel: string;
}) => (
  <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border flex-shrink-0">
    <FilterOutlined className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0" aria-hidden="true" />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary outline-none cursor-pointer"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-light-surface dark:bg-dark-surface">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

/**
 * 주문 테이블
 *
 * ### variant별 컬럼
 * | variant    | 표시 방식 | 상태 컬럼                       | 페이지 크기 |
 * |------------|----------|---------------------------------|------------|
 * | dashboard  | 테이블   | "상태" (주문 상태 단일 컬럼)     | 50/30/15   |
 * | orders     | 테이블   | 주문 상태·결제 상태·배송 상태    | 50/30/15   |
 *
 * ### 공통
 * - 최신 주문순(createdAt desc) 정렬
 * - 행·카드 클릭 → /dashboard/orders/:id
 */
export const OrderTable = ({ orders, variant = 'dashboard', onOrderUpdate }: OrderTableProps) => {
  const {
    filter,
    currentPage,
    handleSearch,
    handleOrderStatusChange,
    handlePaymentStatusChange,
    handleShippingStatusChange,
    setCurrentPage,
  } = useOrderFilter();

  const isOrdersVariant = variant === 'orders';
  const TABLE_COLS = isOrdersVariant ? ORDERS_TABLE_COLS : DASHBOARD_TABLE_COLS;

  // ── 반응형 페이지 크기 ────────────────────────────────────────────────────
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const isMobile  = useMediaQuery('(max-width: 767px)');
  const pageSize  = isDesktop
    ? ORDER_PAGE_SIZE_PC
    : isMobile
      ? ORDER_PAGE_SIZE_MOBILE
      : ORDER_PAGE_SIZE_TABLET;

  // ── 검색 입력 (debounce + 한글 IME 처리) ─────────────────────────────────
  const { inputValue, onInputChange, onCompositionStart, onCompositionEnd } = useSearchInput({
    initialValue: filter.search,
    onSearch:     handleSearch,
  });

  // ── 정렬 + 필터링 ─────────────────────────────────────────────────────────
  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        matchesKorean(order.customer.name, filter.search) ||
        order.customer.email.toLowerCase().includes(q);

      const matchesOrderStatus   = filter.orderStatus   === 'all' || order.orderStatus   === filter.orderStatus;
      const matchesPaymentStatus = filter.paymentStatus === 'all' || order.paymentStatus === filter.paymentStatus;
      const matchesShipping      = filter.shippingStatus === 'all' || order.shippingStatus === filter.shippingStatus;

      return matchesSearch && matchesOrderStatus && matchesPaymentStatus && matchesShipping;
    });
  }, [sortedOrders, filter]);

  // ── 페이지네이션 ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);

  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">

      {/* ── 헤더: [검색바(flex-1)] | [상태 필터...] [CSV] ──────────────── */}
      <div className="flex flex-wrap items-center gap-sm mb-md">

        {/* 검색바 */}
        <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors flex-1 min-w-[200px]">
          <SearchOutlined className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0" aria-hidden="true" />
          <input
            type="search"
            placeholder="주문번호, 고객명(초성), 이메일..."
            value={inputValue}
            onChange={onInputChange}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            className="flex-1 bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textSecondary dark:placeholder:text-dark-textSecondary outline-none min-w-0"
            aria-label="주문 검색"
          />
        </div>

        {/* 주문 상태 필터 (공통) */}
        <FilterSelect
          value={filter.orderStatus}
          options={ORDER_STATUS_OPTIONS}
          onChange={handleOrderStatusChange}
          ariaLabel="주문 상태 필터"
        />

        {/* 결제 상태 필터 (orders 전용) */}
        {isOrdersVariant && (
          <FilterSelect
            value={filter.paymentStatus}
            options={PAYMENT_STATUS_OPTIONS}
            onChange={handlePaymentStatusChange}
            ariaLabel="결제 상태 필터"
          />
        )}

        {/* 배송 상태 필터 (orders 전용) */}
        {isOrdersVariant && (
          <FilterSelect
            value={filter.shippingStatus}
            options={SHIPPING_STATUS_OPTIONS}
            onChange={handleShippingStatusChange}
            ariaLabel="배송 상태 필터"
          />
        )}

        {/* CSV 내보내기 */}
        <button
          type="button"
          onClick={() => exportToCSV(filteredOrders)}
          className="inline-flex items-center gap-xs text-bodySm font-medium px-sm py-xs rounded-md bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-primary dark:hover:bg-dark-primary hover:text-white transition-colors flex-shrink-0"
          aria-label="CSV 내보내기"
        >
          <DownloadOutlined aria-hidden="true" />
          <span className="hidden sm:inline">CSV 내보내기</span>
        </button>
      </div>

      {/* ── 데스크탑·태블릿 테이블 (md 이상, ≥768px) ─────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-bodySm" aria-label="주문 내역 테이블">
          <thead>
            <tr className="border-b border-light-border dark:border-dark-border">
              {TABLE_COLS.map(({ key, thClass }) => (
                <th
                  key={key}
                  className={[
                    'text-left py-sm px-sm text-caption font-semibold',
                    'text-light-textSecondary dark:text-dark-textSecondary',
                    'uppercase tracking-wide whitespace-nowrap',
                    thClass,
                  ].join(' ')}
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLS.length}
                  className="py-xl text-center text-light-textSecondary dark:text-dark-textSecondary"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const paymentInfo = PAYMENT_BADGE[order.paymentMethod];
                const tierClass   = TIER_BADGE[order.customer.tier ?? '일반'] ?? TIER_BADGE['일반'];

                return (
                  <tr
                    key={order.id}
                    className="border-b border-light-border dark:border-dark-border last:border-0 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
                  >
                    {/* 주문번호 — 클릭 시 상세 이동 */}
                    <td className="py-sm px-sm pl-0">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono text-caption text-light-primary dark:text-dark-primary font-semibold whitespace-nowrap hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>

                    {/* 고객정보: 아바타 + 이름 + 회원등급 배지 */}
                    <td className="py-sm px-sm">
                      <div className="flex items-center gap-sm">
                        <CustomerAvatar name={order.customer.name} />
                        <div className="min-w-0">
                          <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate">
                            {order.customer.name}
                          </p>
                          {order.customer.tier && (
                            <span className={`inline-block text-overline font-bold px-xs py-[1px] rounded-sm mt-xs ${tierClass}`}>
                              {order.customer.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 상품 정보 — orders: 태블릿 숨김 / dashboard: 항상 표시 */}
                    <td className={`py-sm px-sm${isOrdersVariant ? ' hidden xl:table-cell' : ''}`}>
                      <div className="flex flex-col gap-xs max-w-[180px]">
                        {order.products.map((p, i) => (
                          <div key={`${p.sku}-${i}`} className="flex items-center justify-between gap-sm">
                            <span className="text-caption text-light-textPrimary dark:text-dark-textPrimary truncate">
                              {p.name} ×{p.quantity}
                            </span>
                            <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
                              ₩{(p.unitPrice * p.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* 결제 금액 */}
                    <td className="py-sm px-sm">
                      <p className="font-bold text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap">
                        ₩{order.totalAmount.toLocaleString()}
                      </p>
                    </td>

                    {/* 결제 방식 — 태블릿 숨김, PC(xl+) 표시 */}
                    <td className="py-sm px-sm hidden xl:table-cell">
                      {paymentInfo && (
                        <span className={`inline-block text-caption font-semibold px-sm py-xs rounded-full whitespace-nowrap ${paymentInfo.badgeClass}`}>
                          {paymentInfo.label}
                        </span>
                      )}
                    </td>

                    {/* ── 상태 컬럼 (variant별 분기) ── */}
                    {isOrdersVariant ? (
                      <>
                        {/* 주문 상태 */}
                        <td className="py-sm px-sm">
                          <StatusBadge {...ORDER_STATUS_MAP[order.orderStatus]} />
                        </td>

                        {/* 결제 상태 — 태블릿 숨김 */}
                        <td className="py-sm px-sm hidden xl:table-cell">
                          <StatusBadge {...PAYMENT_STATUS_MAP[order.paymentStatus]} />
                        </td>

                        {/* 배송 상태 */}
                        <td className="py-sm px-sm">
                          <StatusBadge {...SHIPPING_STATUS_MAP[order.shippingStatus]} />
                        </td>
                      </>
                    ) : (
                      /* dashboard: 단일 "상태" 컬럼 (주문 상태) */
                      <td className="py-sm px-sm">
                        <StatusBadge {...ORDER_STATUS_MAP[order.orderStatus]} />
                      </td>
                    )}

                    {/* 주문 일시 */}
                    <td className="py-sm px-sm">
                      <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
                        {formatOrderDate(order.createdAt)}
                      </span>
                    </td>

                    {/* 액션 셀 (orders variant 전용) */}
                    {isOrdersVariant && onOrderUpdate && (
                      <td className="py-sm px-sm text-right">
                        <OrderActionCell order={order} onOrderUpdate={onOrderUpdate} showDetailLink />
                      </td>
                    )}
                    {isOrdersVariant && !onOrderUpdate && (
                      <td className="py-sm px-sm" />
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 모바일 카드 목록 (md 미만, ≤767px) ──────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-sm">
        {paginatedOrders.length === 0 ? (
          <p className="py-xl text-center text-light-textSecondary dark:text-dark-textSecondary text-bodySm">
            검색 결과가 없습니다.
          </p>
        ) : (
          paginatedOrders.map((order) => {
            const tierClass = TIER_BADGE[order.customer.tier ?? '일반'] ?? TIER_BADGE['일반'];

            return (
              <div
                key={order.id}
                className="border border-light-border dark:border-dark-border rounded-md p-sm flex flex-col gap-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-light-secondary dark:hover:bg-dark-secondary"
              >
                {/* 카드 헤더: 주문번호(클릭 이동) + 주문 상태 */}
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="font-mono text-caption text-light-primary dark:text-dark-primary font-semibold hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <StatusBadge {...ORDER_STATUS_MAP[order.orderStatus]} />
                </div>

                {/* 카드 본문: 2열 그리드 */}
                <div className="grid grid-cols-2 gap-xs">
                  {/* 좌: 고객 정보 */}
                  <div className="flex items-center gap-xs">
                    <CustomerAvatar name={order.customer.name} />
                    <div className="min-w-0">
                      <p className="text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate">
                        {order.customer.name}
                      </p>
                      {order.customer.tier && (
                        <span className={`inline-block text-overline font-bold px-xs py-[1px] rounded-sm ${tierClass}`}>
                          {order.customer.tier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 우: 결제 금액 */}
                  <div className="text-right">
                    <p className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
                      ₩{order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 결제 상태 + 배송 상태 (orders variant) */}
                {isOrdersVariant && (
                  <div className="flex items-center gap-md">
                    <StatusBadge {...PAYMENT_STATUS_MAP[order.paymentStatus]} />
                    <StatusBadge {...SHIPPING_STATUS_MAP[order.shippingStatus]} />
                  </div>
                )}

                {/* 하단: 상품 목록 + 주문 일시 */}
                <div className="border-t border-light-border dark:border-dark-border pt-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
                  <p className="truncate">
                    {order.products.map((p, i) => (
                      <span key={`${p.sku}-${i}`}>{i > 0 && ', '}{p.name} ×{p.quantity}</span>
                    ))}
                  </p>
                  <p className="mt-xs">{formatOrderDate(order.createdAt)}</p>
                </div>

                {/* 액션 버튼 행 (orders variant 전용) */}
                {isOrdersVariant && onOrderUpdate && (
                  <div className="border-t border-light-border dark:border-dark-border pt-xs">
                    <OrderActionCell
                      order={order}
                      onOrderUpdate={onOrderUpdate}
                      showDetailLink
                      variant="card"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 테이블 푸터 ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-md pt-md border-t border-light-border dark:border-dark-border gap-sm flex-wrap">
        <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
          SHOWING{' '}
          <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">{paginatedOrders.length}</span>
          {' '}OF{' '}
          <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">{filteredOrders.length.toLocaleString()}</span>
          {' '}RECORDS
        </p>

        <div className="flex items-center gap-xs">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="이전 페이지"
          >
            <LeftOutlined aria-hidden="true" />
            PREVIOUS
          </button>

          <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary px-xs">
            {safePage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="다음 페이지"
          >
            NEXT PAGE
            <RightOutlined aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
