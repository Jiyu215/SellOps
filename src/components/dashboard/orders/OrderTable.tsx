'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Order, OrderStatus } from '@/types/dashboard';
import { matchesKorean } from '@/utils/choseong';
import { useOrderFilter } from '@/hooks/useOrderFilter';

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
  const { filter, currentPage, handleSearch, handleStatusChange, setCurrentPage } = useOrderFilter();

  /**
   * IME 조합 상태 관리
   *
   * 문제: 한글 입력 시 브라우저가 조합 중(e.g. ㅎ→하→한)에도 onChange를 발화해
   *       부분 완성 문자열로 URL 쿼리가 매 키스트로크마다 갱신됨
   *
   * 해결 전략:
   *   - inputValue: 입력창 표시용 로컬 상태 — 조합 중에도 즉시 반영 (UX 유지)
   *   - isComposingRef: 조합 중 여부 플래그 (useRef — 리렌더 불필요)
   *   - onChange 중 isComposing === true이면 handleSearch 호출 보류
   *   - onCompositionEnd에서 조합 완료 값으로 handleSearch 호출
   *
   * Chrome 이벤트 순서: compositionEnd → onChange (동일 값으로 중복 발화)
   * 중복 방지: lastTriggeredRef로 마지막으로 검색한 값 추적, 동일 값 재호출 차단
   */
  /**
   * inputValue: 입력창 표시 전용 로컬 상태
   *
   * - URL(filter.search)이 아닌 로컬 state를 value로 사용해
   *   React Concurrent Mode의 중간 render에서 입력값이 사라지는 문제를 방지
   * - 페이지 최초 진입 시 URL 파라미터로 초기화 (북마크·링크 공유 지원)
   * - 이후에는 사용자 이벤트(onChange / compositionEnd)만으로 업데이트
   *   → URL 업데이트(router.replace)가 일으키는 re-render가 inputValue를 건드리지 않음
   *
   * 브라우저 뒤로가기/앞으로가기 시 filter.search가 바뀌어도 inputValue는 갱신되지 않음.
   * 단, 테이블 필터링 자체는 URL 기반이므로 데이터는 올바르게 표시되며,
   * 검색창 텍스트만 이전 값을 유지하는 미미한 UX 차이가 남는다.
   */
  const [inputValue, setInputValue] = useState(filter.search);
  const isComposingRef     = useRef(false);
  const lastTriggeredRef   = useRef(filter.search);
  const debounceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 언마운트 시 펜딩 타이머·요청 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * 실제 검색 실행
   * - 앞뒤 공백 제거 후 중복 방지
   * - AbortController: 현재는 동기 클라이언트 필터링이라 취소 효과 없음.
   *   실제 API 연동 시 handleSearch(trimmed, signal) 형태로 signal 전달해
   *   이전 요청을 취소하고 최신 응답만 반영하는 구조로 확장 가능
   */
  const executeSearch = (value: string) => {
    const normalized = value.replace(/\s+/g, '');
    if (lastTriggeredRef.current === normalized) return;
    lastTriggeredRef.current = normalized;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    handleSearch(normalized);
  };

  /**
   * 디바운스(300ms) 적용 — 일반 타이핑 전용
   * 이전 타이머를 취소하고 새 타이머를 등록해 마지막 입력만 처리
   */
  const triggerSearchDebounced = (value: string) => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      executeSearch(value);
    }, 300);
  };

  /**
   * 즉시 실행 — compositionEnd 전용
   * 사용자가 조합 완료 키를 누른 것은 명시적 확정 의사이므로 디바운스 없이 즉시 검색.
   * 진행 중인 디바운스 타이머도 함께 취소해 중복 실행 방지
   */
  const triggerSearchImmediate = (value: string) => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    executeSearch(value);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    triggerSearchImmediate(e.currentTarget.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // 조합 중이 아닐 때만 검색 (조합 완료는 onCompositionEnd에서 처리)
    if (!isComposingRef.current) {
      triggerSearchDebounced(e.target.value);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        matchesKorean(order.customer.name, filter.search) ||
        order.customer.email.toLowerCase().includes(q);

      const matchesStatus = filter.status === 'all' || order.status === filter.status;

      return matchesSearch && matchesStatus;
    });
  }, [orders, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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
            value={inputValue}
            onChange={handleInputChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
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
