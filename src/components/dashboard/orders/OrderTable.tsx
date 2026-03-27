'use client';

import { useState, useMemo } from 'react';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Order, OrderStatus, OrderFilter } from '@/types/dashboard';
import { matchesKorean } from '@/utils/choseong';

interface OrderTableProps {
  orders: Order[];
}

// 배송 상태: 색상 점 + 텍스트 인라인 뱃지
const ORDER_STATUS_MAP: Record<
  OrderStatus,
  { label: string; dotColor: string; badgeClass: string }
> = {
  pending: {
    label: '결제 대기',
    dotColor: 'bg-light-warning dark:bg-dark-warning',
    badgeClass: 'text-light-warning dark:text-dark-warning',
  },
  paid: {
    label: '결제 완료',
    dotColor: 'bg-light-info dark:bg-dark-info',
    badgeClass: 'text-light-info dark:text-dark-info',
  },
  preparing: {
    label: '배송 준비',
    dotColor: 'bg-purple-500',
    badgeClass: 'text-purple-600 dark:text-purple-400',
  },
  shipped: {
    label: '배송 중',
    dotColor: 'bg-indigo-500',
    badgeClass: 'text-indigo-600 dark:text-indigo-400',
  },
  delivered: {
    label: '배송 완료',
    dotColor: 'bg-light-success dark:bg-dark-success',
    badgeClass: 'text-light-success dark:text-dark-success',
  },
  cancelled: {
    label: '취소됨',
    dotColor: 'bg-light-error dark:bg-dark-error',
    badgeClass: 'text-light-error dark:text-dark-error',
  },
  refunded: {
    label: '환불됨',
    dotColor: 'bg-light-textSecondary dark:bg-dark-textSecondary',
    badgeClass: 'text-light-textSecondary dark:text-dark-textSecondary',
  },
};

// 결제방식 배지 스타일
const PAYMENT_BADGE: Record<string, { label: string; badgeClass: string }> = {
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

// 회원 등급 배지
const TIER_BADGE: Record<string, string> = {
  VIP: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  Gold: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Silver: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300',
  일반: 'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary',
};

const STATUS_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: '전체 상태' },
  { value: 'pending', label: '결제 대기' },
  { value: 'paid', label: '결제 완료' },
  { value: 'preparing', label: '배송 준비' },
  { value: 'shipped', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'cancelled', label: '취소됨' },
  { value: 'refunded', label: '환불됨' },
];

const PAGE_SIZE = 5;

/** 날짜 포맷 */
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** CSV 내보내기 */
const exportToCSV = (orders: Order[]) => {
  const headers = ['주문번호', '고객명', '이메일', '상품', '금액', '결제방법', '배송상태', '주문일시'];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.customer.name,
    o.customer.email,
    o.products.map((p) => `${p.name}×${p.quantity}`).join('; '),
    o.totalAmount.toLocaleString(),
    PAYMENT_BADGE[o.paymentMethod]?.label ?? o.paymentMethod,
    ORDER_STATUS_MAP[o.status].label,
    formatDate(o.createdAt),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/** 고객 아바타 (이니셜 원형) */
const CustomerAvatar = ({ name }: { name: string }) => {
  const initial = name.charAt(0);
  // 이름 기반 색상 (고정)
  const colors = ['#5D5FEF', '#28A745', '#17A2B8', '#FFC107', '#DC3545', '#6f42c1'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-bold flex-shrink-0"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
};

/**
 * 최근 주문 내역 테이블
 * 스펙:
 * - 헤더: 제목 + 실시간 스트림 서브텍스트 / 검색바 / 필터 / CSV 내보내기
 * - 컬럼: 주문번호 | 고객정보(아바타+이름+tier배지) | 상품상세 | 결제금액 | 결제방식(배지) | 배송상태(점+텍스트)
 * - 태블릿: 결제방식 컬럼 숨김
 * - 푸터: SHOWING N OF N,NNN RECORDS / PREVIOUS · NEXT PAGE 버튼
 * - 모바일: 2열 그리드 카드형
 */
export const OrderTable = ({ orders }: OrderTableProps) => {
  const [filter, setFilter] = useState<OrderFilter>({
    search: '',
    status: 'all',
    paymentMethod: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !q ||
        // 주문번호 검색
        order.orderNumber.toLowerCase().includes(q) ||
        // 고객명 검색 (초성 검색 포함)
        matchesKorean(order.customer.name, filter.search) ||
        // 이메일 검색
        order.customer.email.toLowerCase().includes(q);

      const matchesStatus = filter.status === 'all' || order.status === filter.status;
      const matchesPayment = filter.paymentMethod === 'all' || order.paymentMethod === filter.paymentMethod;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // 필터 변경 시 첫 페이지로 복귀 (핸들러에서 직접 처리)
  const handleSearch = (value: string) => {
    setFilter((f) => ({ ...f, search: value }));
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilter((f) => ({ ...f, status: value as OrderFilter['status'] }));
    setCurrentPage(1);
  };

  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
      {/* ── 카드 헤더 ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-sm mb-md">
        <div>
          <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            최근 주문 내역
          </h2>
          {/* 실시간 스트림 서브텍스트 */}
          <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs flex items-center gap-xs">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-light-success dark:bg-dark-success animate-pulse" aria-hidden="true" />
            실시간 스트림 · 자동 갱신
          </p>
        </div>

        {/* CSV 내보내기 */}
        <button
          type="button"
          onClick={() => exportToCSV(filteredOrders)}
          className="inline-flex items-center gap-xs text-bodySm font-medium px-sm py-xs rounded-md bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-primary dark:hover:bg-dark-primary hover:text-white transition-colors flex-shrink-0"
          aria-label="CSV 내보내기"
        >
          <DownloadOutlined aria-hidden="true" />
          CSV 내보내기
        </button>
      </div>

      {/* ── 검색 + 상태 필터 ── */}
      <div className="flex flex-col sm:flex-row gap-sm mb-md">
        {/* 검색바 */}
        <div className="flex-1 flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors">
          <SearchOutlined
            className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="주문번호, 고객명(초성 가능), 이메일 검색..."
            value={filter.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textSecondary dark:placeholder:text-dark-textSecondary outline-none"
            aria-label="주문 검색"
          />
        </div>

        {/* 상태 필터 */}
        <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs border border-light-border dark:border-dark-border">
          <FilterOutlined
            className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0"
            aria-hidden="true"
          />
          <select
            value={filter.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary outline-none cursor-pointer"
            aria-label="주문 상태 필터"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-light-surface dark:bg-dark-surface"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 데스크탑 테이블 (lg 이상) ── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-bodySm" aria-label="주문 내역 테이블">
          <thead>
            <tr className="border-b border-light-border dark:border-dark-border">
              {[
                { key: '주문번호' },
                { key: '고객정보' },
                { key: '상품상세' },
                { key: '결제금액' },
                { key: '결제방식' },
                { key: '배송상태' },
              ].map(({ key }) => (
                <th
                  key={key}
                  className={[
                    'text-left py-sm px-sm text-caption font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wide',
                    key === '결제방식' ? 'hidden xl:table-cell' : '',
                    key === '주문번호' ? 'pl-0' : '',
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
                  colSpan={6}
                  className="py-xl text-center text-light-textSecondary dark:text-dark-textSecondary"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const statusInfo = ORDER_STATUS_MAP[order.status];
                const paymentInfo = PAYMENT_BADGE[order.paymentMethod];
                const tierClass = TIER_BADGE[order.customer.tier ?? '일반'] ?? TIER_BADGE['일반'];

                return (
                  <tr
                    key={order.id}
                    className="border-b border-light-border dark:border-dark-border last:border-0 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
                  >
                    {/* 주문번호 */}
                    <td className="py-sm px-sm pl-0">
                      <span className="font-mono text-caption text-light-primary dark:text-dark-primary font-semibold whitespace-nowrap">
                        {order.orderNumber}
                      </span>
                      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
                        {formatDate(order.createdAt)}
                      </p>
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
                            <span
                              className={`inline-block text-overline font-bold px-xs py-[1px] rounded-sm mt-xs ${tierClass}`}
                            >
                              {order.customer.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 상품 상세 */}
                    <td className="py-sm px-sm">
                      <div className="flex flex-col gap-xs max-w-[180px]">
                        {order.products.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-sm">
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

                    {/* 결제금액 */}
                    <td className="py-sm px-sm">
                      <p className="font-bold text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap">
                        ₩{order.totalAmount.toLocaleString()}
                      </p>
                    </td>

                    {/* 결제방식 배지 (태블릿 숨김 → xl에서만 표시) */}
                    <td className="py-sm px-sm hidden xl:table-cell">
                      {paymentInfo && (
                        <span
                          className={`inline-block text-caption font-semibold px-sm py-xs rounded-full whitespace-nowrap ${paymentInfo.badgeClass}`}
                        >
                          {paymentInfo.label}
                        </span>
                      )}
                    </td>

                    {/* 배송 상태: 색상 점 + 텍스트 */}
                    <td className="py-sm px-sm">
                      <span className="inline-flex items-center gap-xs">
                        <span
                          className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.dotColor}`}
                          aria-hidden="true"
                        />
                        <span className={`text-caption font-semibold whitespace-nowrap ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </span>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 모바일 카드 목록 (lg 미만) ── */}
      <div className="lg:hidden flex flex-col gap-sm">
        {paginatedOrders.length === 0 ? (
          <p className="py-xl text-center text-light-textSecondary dark:text-dark-textSecondary text-bodySm">
            검색 결과가 없습니다.
          </p>
        ) : (
          paginatedOrders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status];
            const paymentInfo = PAYMENT_BADGE[order.paymentMethod];
            const tierClass = TIER_BADGE[order.customer.tier ?? '일반'] ?? TIER_BADGE['일반'];

            return (
              <div
                key={order.id}
                className="border border-light-border dark:border-dark-border rounded-md p-sm flex flex-col gap-sm hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
              >
                {/* 카드 헤더: 주문번호 + 상태 뱃지 */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-light-primary dark:text-dark-primary font-semibold">
                    {order.orderNumber}
                  </span>
                  <span className="inline-flex items-center gap-xs">
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.dotColor}`}
                      aria-hidden="true"
                    />
                    <span className={`text-caption font-semibold ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </span>
                </div>

                {/* 카드 본문: 2열 그리드 */}
                <div className="grid grid-cols-2 gap-xs">
                  {/* 고객 */}
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

                  {/* 결제금액 + 결제방식 */}
                  <div className="text-right">
                    <p className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
                      ₩{order.totalAmount.toLocaleString()}
                    </p>
                    {paymentInfo && (
                      <span className={`inline-block text-caption font-semibold px-xs py-[1px] rounded-full mt-xs ${paymentInfo.badgeClass}`}>
                        {paymentInfo.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* 상품 + 날짜 */}
                <div className="border-t border-light-border dark:border-dark-border pt-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
                  <p className="truncate">
                    {order.products.map((p, i) => (
                      <span key={i}>{i > 0 && ', '}{p.name} ×{p.quantity}</span>
                    ))}
                  </p>
                  <p className="mt-xs">{formatDate(order.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 테이블 푸터: SHOWING / PREVIOUS / NEXT ── */}
      <div className="flex items-center justify-between mt-md pt-md border-t border-light-border dark:border-dark-border gap-sm flex-wrap">
        <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
          SHOWING{' '}
          <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">
            {paginatedOrders.length}
          </span>{' '}
          OF{' '}
          <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">
            {filteredOrders.length.toLocaleString()}
          </span>{' '}
          RECORDS
        </p>

        <div className="flex items-center gap-xs">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="이전 페이지"
          >
            <LeftOutlined aria-hidden="true" />
            PREVIOUS
          </button>

          <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary px-xs">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
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
