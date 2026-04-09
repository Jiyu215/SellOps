'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type {
  OrderDetail,
  OrderMemoEntry,
  OrderStatusHistoryEntry,
  MemoAuthorType,
} from '@/types/orderDetail';
import { OrderActionCell } from '@/components/dashboard/orders/OrderActionCell';
import {
  ORDER_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  SHIPPING_STATUS_MAP,
  PAYMENT_BADGE,
  formatOrderDate,
} from '@/constants/orderConstants';

// ── 쿠폰 유형 라벨 ──────────────────────────────────────────────────────────

const COUPON_TYPE_LABEL: Record<string, string> = {
  amount:        '정액 할인',
  percent:       '정률 할인',
  free_shipping: '무료배송',
};

const COUPON_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  applied:   { label: '사용완료', className: 'text-light-success dark:text-dark-success'       },
  unused:    { label: '미사용',   className: 'text-light-warning dark:text-dark-warning'       },
  cancelled: { label: '취소',     className: 'text-light-error dark:text-dark-error font-bold' },
};

// ── 메모 유형 설정 ──────────────────────────────────────────────────────────

const MEMO_AUTHOR_CONFIG: Record<
  MemoAuthorType,
  { label: string; badgeClass: string; itemClass: string }
> = {
  admin: {
    label:      '관리자',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    itemClass:  'bg-green-50 dark:bg-green-900/10 border-l-2 border-green-400 dark:border-green-600',
  },
  cs: {
    label:      'CS',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    itemClass:  'bg-purple-50 dark:bg-purple-900/10 border-l-2 border-purple-400 dark:border-purple-600',
  },
  customer: {
    label:      '고객',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    itemClass:  'bg-blue-50 dark:bg-blue-900/10 border-l-2 border-blue-400 dark:border-blue-600',
  },
};

// ── 주문 단계 정의 ─────────────────────────────────────────────────────────

const ORDER_STEPS = ['주문접수', '결제완료', '상품준비', '배송중', '배송완료'] as const;

/**
 * 현재 단계 인덱스 반환
 * - 0~4: 진행 중 (currentStep = 해당 인덱스)
 * - ORDER_STEPS.length (5): 모든 단계 완료
 */
function getOrderStepInfo(order: OrderDetail): { currentStep: number; isCancelled: boolean } {
  const { orderStatus, paymentStatus, shippingStatus } = order;

  const isCancelled =
    orderStatus === 'order_cancelled' ||
    paymentStatus === 'payment_cancelled' ||
    paymentStatus === 'refund_completed' ||
    shippingStatus === 'return_completed';

  // 배송 완료 (모든 단계 완료)
  if (
    (shippingStatus === 'shipping_completed' || orderStatus === 'order_completed') &&
    !isCancelled
  ) {
    return { currentStep: ORDER_STEPS.length, isCancelled: false };
  }

  let step = 0;

  if (
    paymentStatus === 'payment_completed' ||
    paymentStatus === 'refund_in_progress' ||
    paymentStatus === 'refund_completed'
  ) {
    step = 1;
  }
  if (shippingStatus === 'shipping_ready') {
    step = Math.max(step, 2);
  }
  if (shippingStatus === 'shipping_in_progress') {
    step = Math.max(step, 3);
  }
  if (shippingStatus === 'shipping_completed' || shippingStatus === 'return_completed') {
    step = Math.max(step, 4);
  }

  return { currentStep: step, isCancelled };
}

// ── 공통 서브 컴포넌트 ────────────────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
    <h2 className="text-h6 font-bold text-light-textPrimary dark:text-dark-textPrimary mb-md">
      {title}
    </h2>
    {children}
  </section>
);

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-xs sm:flex-row sm:items-start">
    <dt className="text-caption font-semibold text-light-textSecondary dark:text-dark-textSecondary sm:min-w-[7rem] flex-shrink-0 uppercase tracking-wide">
      {label}
    </dt>
    <dd className="text-bodySm text-light-textPrimary dark:text-dark-textPrimary">
      {children}
    </dd>
  </div>
);

const StatusBadge = ({
  dotColor,
  badgeClass,
  label,
}: {
  dotColor: string;
  badgeClass: string;
  label: string;
}) => (
  <span className="inline-flex items-center gap-xs">
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} aria-hidden="true" />
    <span className={`text-bodySm font-semibold ${badgeClass}`}>{label}</span>
  </span>
);

// ── 주문 단계 스텝퍼 ─────────────────────────────────────────────────────────

const OrderStatusStepper = ({ order }: { order: OrderDetail }) => {
  const { currentStep, isCancelled } = getOrderStepInfo(order);
  const totalSteps = ORDER_STEPS.length;

  // 모바일용 진행률 (0~100%)
  const progressPct = Math.round((Math.min(currentStep, totalSteps) / totalSteps) * 100);

  return (
    <div className="mt-md pt-md border-t border-light-border dark:border-dark-border">

      {/* ── PC / 태블릿: 가로 스텝퍼 ── */}
      {/*
        CSS Grid equal columns → 라벨 글자 수와 무관하게 모든 셀 동일 너비.
        연결선은 absolute로 이전 셀 중앙(left:-50%)~현재 셀 중앙(right:50%) 걸침.
      */}
      <ol
        className="hidden sm:grid"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, 1fr)` }}
        aria-label="주문 처리 단계"
      >
        {ORDER_STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent   = i === currentStep && !isCancelled;
          const isFailed    = i === currentStep && isCancelled;
          const isUpcoming  = i > currentStep;

          return (
            <li key={step} className="flex flex-col items-center relative">
              {/* 연결선: 이전 셀 중앙(-50%) ~ 현재 셀 중앙(50%) */}
              {i > 0 && (
                <div
                  className={[
                    'absolute top-4 left-[-50%] right-1/2 h-0.5 transition-colors duration-300',
                    i <= currentStep && !isCancelled
                      ? 'bg-light-primary dark:bg-dark-primary'
                      : isCancelled && i === currentStep
                      ? 'bg-light-error dark:bg-dark-error'
                      : 'bg-light-border dark:bg-dark-border',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}

              {/* 스텝 아이콘 + 라벨 */}
              <div
                className={[
                  'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 text-caption font-bold transition-all duration-300',
                  isCompleted
                    ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-white'
                    : isCurrent
                    ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-white shadow-md'
                    : isFailed
                    ? 'bg-light-error dark:bg-dark-error border-light-error dark:border-dark-error text-white'
                    : 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary',
                ].join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <CheckOutlined style={{ fontSize: 12 }} />
                ) : isFailed ? (
                  <CloseOutlined style={{ fontSize: 12 }} />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={[
                  'mt-xs text-caption text-center whitespace-nowrap',
                  isCompleted || isCurrent
                    ? 'font-semibold text-light-textPrimary dark:text-dark-textPrimary'
                    : isFailed
                    ? 'font-semibold text-light-error dark:text-dark-error'
                    : isUpcoming
                    ? 'text-light-textSecondary dark:text-dark-textSecondary'
                    : '',
                ].join(' ')}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── 모바일: 프로그레스바 + 현재 단계 텍스트 ── */}
      <div className="sm:hidden" aria-label="주문 처리 단계">
        <div className="flex items-center justify-between mb-xs">
          <span className={[
            'text-bodySm font-semibold',
            isCancelled
              ? 'text-light-error dark:text-dark-error'
              : 'text-light-textPrimary dark:text-dark-textPrimary',
          ].join(' ')}>
            {isCancelled
              ? `${ORDER_STEPS[Math.min(currentStep, totalSteps - 1)]} (취소됨)`
              : currentStep >= totalSteps
              ? ORDER_STEPS[totalSteps - 1]
              : ORDER_STEPS[currentStep]}
          </span>
          <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
            {Math.min(currentStep, totalSteps)} / {totalSteps}
          </span>
        </div>
        <div className="h-2 bg-light-border dark:bg-dark-border rounded-full overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all duration-500',
              isCancelled
                ? 'bg-light-error dark:bg-dark-error'
                : 'bg-light-primary dark:bg-dark-primary',
            ].join(' ')}
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <ol className="flex justify-between mt-xs" aria-hidden="true">
          {ORDER_STEPS.map((step, i) => (
            <li
              key={step}
              className={[
                'text-[10px] text-center',
                i < currentStep
                  ? 'text-light-primary dark:text-dark-primary font-semibold'
                  : i === currentStep && !isCancelled
                  ? 'text-light-primary dark:text-dark-primary font-bold underline'
                  : i === currentStep && isCancelled
                  ? 'text-light-error dark:text-dark-error font-semibold'
                  : 'text-light-textSecondary dark:text-dark-textSecondary',
              ].join(' ')}
            >
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

// ── 주문 상태 이력 타임라인 ──────────────────────────────────────────────────

const formatTimelineDate = (iso: string): string => {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const mi   = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

/**
 * 주문 상태 이력 타임라인
 * - 고정 높이 + 내부 스크롤 (전체 페이지 스크롤 영향 없음)
 * - 모바일: h-48 / 태블릿: h-64 / PC: h-80
 */
const StatusTimeline = ({ entries }: { entries: OrderStatusHistoryEntry[] }) => (
  <div
    className="h-48 md:h-64 xl:h-80 overflow-y-auto scroll-smooth rounded-md"
    role="region"
    aria-label="주문 상태 변경 이력"
    tabIndex={0}
  >
    <ol className="pr-sm">
      {entries.map((entry, i) => (
        <li key={`${entry.timestamp}-${i}`} className="relative flex gap-sm">
          {/* 수직 연결선 */}
          {i < entries.length - 1 && (
            <div
              className="absolute left-[0.9375rem] top-[1.875rem] bottom-0 w-px bg-light-border dark:bg-dark-border"
              aria-hidden="true"
            />
          )}

          {/* 도트 */}
          <div className="flex-shrink-0 mt-1 w-[1.875rem] h-[1.875rem] rounded-full bg-light-secondary dark:bg-dark-secondary border-2 border-light-primary dark:border-dark-primary flex items-center justify-center">
            <ClockCircleOutlined
              style={{ fontSize: 10 }}
              className="text-light-primary dark:text-dark-primary"
            />
          </div>

          {/* 내용 */}
          <div className="pb-md flex-1 min-w-0">
            <time
              dateTime={entry.timestamp}
              className="block text-caption text-light-textSecondary dark:text-dark-textSecondary"
            >
              {formatTimelineDate(entry.timestamp)}
            </time>
            <p className="text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary mt-xs">
              {entry.label}
            </p>
            <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
              처리자: {entry.actor}
            </p>
            {entry.reason && (
              <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
                사유: {entry.reason}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

// ── 메모 커뮤니케이션 로그 ───────────────────────────────────────────────────

/**
 * 주문 메모 커뮤니케이션 로그
 * - append-only 로컬 상태 (실제 서비스에서 API 연동)
 * - 최신순 정렬, 고정 높이 내부 스크롤
 * - 작성자 유형은 로그인 사용자 기준으로 자동 결정 (관리자/CS: 이름 함께 표시)
 */

// TODO: 실 서비스에서는 useAuth() 등 인증 컨텍스트에서 주입받는다
const MOCK_CURRENT_USER: { authorName: string; authorType: MemoAuthorType } = {
  authorName: '김운영자',
  authorType: 'admin',
};

const MemoLog = ({ initialEntries }: { initialEntries: OrderMemoEntry[] }) => {
  const [entries, setEntries] = useState<OrderMemoEntry[]>(initialEntries);
  const [content, setContent] = useState('');
  const scrollRef             = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const newEntry: OrderMemoEntry = {
      id:         `memo-${Date.now()}`,
      timestamp:  new Date().toISOString(),
      author:     MOCK_CURRENT_USER.authorName,
      authorType: MOCK_CURRENT_USER.authorType,
      content:    trimmed,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setContent('');

    // 최신 항목(최상단)으로 스크롤
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex flex-col gap-sm">

      {/* 로그 영역 */}
      <div
        ref={scrollRef}
        className={[
          'h-48 md:h-64 xl:h-80 overflow-y-auto scroll-smooth',
          'rounded-md border border-light-border dark:border-dark-border',
          'bg-light-background dark:bg-dark-background',
          'p-sm flex flex-col gap-sm',
        ].join(' ')}
        role="log"
        aria-label="주문 메모 로그"
        aria-live="polite"
        tabIndex={0}
      >
        {entries.length === 0 ? (
          <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary text-center py-lg italic">
            등록된 메모가 없습니다.
          </p>
        ) : (
          entries.map((entry) => {
            const cfg = MEMO_AUTHOR_CONFIG[entry.authorType];
            return (
              <article
                key={entry.id}
                className={`rounded-md p-sm ${cfg.itemClass}`}
              >
                {/* 헤더 */}
                <div className="flex flex-wrap items-center gap-xs mb-xs">
                  <span
                    className={`text-[11px] font-semibold px-xs py-[2px] rounded-full ${cfg.badgeClass}`}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-caption font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                    {entry.author}
                  </span>
                  <time
                    dateTime={entry.timestamp}
                    className="text-caption text-light-textSecondary dark:text-dark-textSecondary ml-auto"
                  >
                    {formatTimelineDate(entry.timestamp)}
                  </time>
                </div>
                {/* 내용 */}
                <p className="text-bodySm text-light-textPrimary dark:text-dark-textPrimary whitespace-pre-wrap break-words">
                  {entry.content}
                </p>
              </article>
            );
          })
        )}
      </div>

      {/* 입력 영역 */}
      <div className="rounded-md border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface overflow-hidden">

        {/* 현재 작성자 표시 */}
        <div className="flex items-center gap-xs px-sm pt-xs pb-0">
          <span
            className={`text-[11px] font-semibold px-xs py-[2px] rounded-full ${MEMO_AUTHOR_CONFIG[MOCK_CURRENT_USER.authorType].badgeClass}`}
          >
            {MEMO_AUTHOR_CONFIG[MOCK_CURRENT_USER.authorType].label}
          </span>
          <span className="text-caption font-semibold text-light-textPrimary dark:text-dark-textPrimary">
            {MOCK_CURRENT_USER.authorName}
          </span>
        </div>

        {/* 텍스트 입력 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메모를 입력하세요... (Ctrl+Enter로 등록)"
          className={[
            'w-full resize-none p-sm text-bodySm min-h-[4.5rem] md:min-h-[5.5rem]',
            'bg-light-surface dark:bg-dark-surface',
            'text-light-textPrimary dark:text-dark-textPrimary',
            'placeholder:text-light-textSecondary dark:placeholder:text-dark-textSecondary',
            'focus:outline-none',
          ].join(' ')}
          aria-label="메모 내용 입력"
        />

        {/* 푸터: 힌트 + 등록 버튼 */}
        <div className="flex items-center justify-between px-sm py-xs border-t border-light-border dark:border-dark-border">
          <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary hidden sm:inline">
            Ctrl+Enter로 등록
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim()}
            className={[
              'inline-flex items-center gap-xs text-caption font-semibold px-sm py-xs rounded-md transition-colors ml-auto',
              content.trim()
                ? 'bg-light-primary dark:bg-dark-primary text-white hover:opacity-90 active:opacity-80'
                : 'bg-light-border dark:bg-dark-border text-light-textSecondary dark:text-dark-textSecondary cursor-not-allowed',
            ].join(' ')}
            aria-label="메모 등록"
          >
            <SendOutlined style={{ fontSize: 12 }} aria-hidden="true" />
            등록
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface OrderDetailViewProps {
  order:         OrderDetail;
  onOrderUpdate: (
    id:      string,
    partial: Partial<Pick<OrderDetail, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>,
  ) => void;
}

/**
 * 주문 상세 뷰
 *
 * ### 섹션 구성 (orders_detail.md 기반)
 * 1. 주문 기본 정보  — 주문번호·일시·상태 + 단계 스텝퍼
 * 2. 결제 정보       — 수단·PG사·승인번호·결제 상태·결제 시간
 * 3. 고객/배송 정보  — 좌(고객) + 우(배송) 2단
 * 4. 상품 및 결제 금액 — 상품 테이블 + 금액 상세(쿠폰·적립금 할인)
 * 5. 주문 상태 이력  — 고정 높이 내부 스크롤 타임라인
 * 6. 주문 메모       — append-only 커뮤니케이션 로그 (관리자/CS/고객)
 * 7. 액션 버튼       — OrderActionCell (showDetailLink=false)
 */
export const OrderDetailView = ({ order, onOrderUpdate }: OrderDetailViewProps) => {
  const handleOrderUpdate = useCallback(
    (
      id:      string,
      partial: Partial<Pick<OrderDetail, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>,
    ) => {
      onOrderUpdate(id, partial);
    },
    [onOrderUpdate],
  );

  const orderStatusInfo    = ORDER_STATUS_MAP[order.orderStatus];
  const paymentStatusInfo  = PAYMENT_STATUS_MAP[order.paymentStatus];
  const shippingStatusInfo = SHIPPING_STATUS_MAP[order.shippingStatus];
  const paymentInfo        = PAYMENT_BADGE[order.paymentMethod];

  const productTotal   = order.products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
  const couponDiscount = order.coupon?.status === 'applied' ? order.coupon.discountAmount : 0;
  const pointDiscount  = order.pointDiscount ?? 0;
  const totalDiscount  = couponDiscount + pointDiscount;
  const finalAmount    = productTotal + order.shippingFee - totalDiscount;

  return (
    <div className="flex flex-col gap-md">

      {/* 뒤로가기 */}
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-sm text-bodySm text-light-textSecondary dark:text-dark-textSecondary hover:text-light-primary dark:hover:text-dark-primary transition-colors"
        >
          <ArrowLeftOutlined aria-hidden="true" />
          주문 목록으로
        </Link>
      </div>

      {/* ── 섹션 1: 주문 기본 정보 + 스텝퍼 + 이력 ─────────────────────────── */}
      <SectionCard title="주문 기본 정보">
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
          <InfoRow label="주문번호">
            <span className="font-mono font-bold text-light-primary dark:text-dark-primary">
              {order.orderNumber}
            </span>
          </InfoRow>

          <InfoRow label="주문 일시">
            {formatOrderDate(order.createdAt)}
          </InfoRow>

          <InfoRow label="주문 상태">
            <StatusBadge {...orderStatusInfo} />
          </InfoRow>

          <InfoRow label="배송 상태">
            <StatusBadge {...shippingStatusInfo} />
          </InfoRow>
        </dl>

        {/* 단계 스텝퍼 */}
        <OrderStatusStepper order={order} />

      </SectionCard>

      {/* ── 섹션 2: 결제 정보 ──────────────────────────────────────────────── */}
      <SectionCard title="결제 정보">
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
          <InfoRow label="결제 수단">
            {paymentInfo ? (
              <span
                className={`inline-block text-caption font-semibold px-sm py-xs rounded-full ${paymentInfo.badgeClass}`}
              >
                {paymentInfo.label}
              </span>
            ) : (
              order.paymentMethod
            )}
          </InfoRow>

          <InfoRow label="결제 상태">
            <StatusBadge {...paymentStatusInfo} />
          </InfoRow>

          {order.paymentDetail && (
            <>
              <InfoRow label="PG사">{order.paymentDetail.pg}</InfoRow>
              <InfoRow label="승인번호">
                <span className="font-mono text-caption">{order.paymentDetail.approvalNumber}</span>
              </InfoRow>
              <InfoRow label="결제 시간">{formatOrderDate(order.paymentDetail.paidAt)}</InfoRow>
            </>
          )}
        </dl>
      </SectionCard>

      {/* ── 섹션 3: 고객 / 배송 정보 ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">

        {/* 좌: 고객 정보 */}
        <SectionCard title="고객 정보">
          <dl className="flex flex-col gap-sm">
            <InfoRow label="이름">{order.customer.name}</InfoRow>
            <InfoRow label="연락처">{order.customer.phone}</InfoRow>
            <InfoRow label="이메일">{order.customer.email}</InfoRow>
            {order.shippingAddress && (
              <InfoRow label="청구 주소">{order.shippingAddress}</InfoRow>
            )}
            {order.customer.tier && (
              <InfoRow label="회원 등급">
                <span className="text-bodySm font-semibold">{order.customer.tier}</span>
              </InfoRow>
            )}
          </dl>
        </SectionCard>

        {/* 우: 배송 정보 */}
        <SectionCard title="배송 정보">
          <dl className="flex flex-col gap-sm">
            {order.shippingAddress && (
              <InfoRow label="배송지">{order.shippingAddress}</InfoRow>
            )}
            {order.shippingInfo ? (
              <>
                <InfoRow label="수령인">{order.shippingInfo.recipientName}</InfoRow>
                <InfoRow label="수령인 연락처">{order.shippingInfo.recipientPhone}</InfoRow>
                <InfoRow label="배송 상태">
                  <StatusBadge {...shippingStatusInfo} />
                </InfoRow>
                {order.shippingInfo.carrier && (
                  <InfoRow label="택배사">{order.shippingInfo.carrier}</InfoRow>
                )}
                {order.shippingInfo.trackingNumber && (
                  <InfoRow label="송장번호">
                    <span className="font-mono">{order.shippingInfo.trackingNumber}</span>
                  </InfoRow>
                )}
              </>
            ) : (
              <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary">
                배송 정보가 없습니다.
              </p>
            )}
          </dl>
        </SectionCard>
      </div>

      {/* ── 섹션 4: 상품 및 결제 금액 ─────────────────────────────────────── */}
      <SectionCard title="상품 및 결제 금액">

        {/* 상품 목록 테이블 */}
        <div className="overflow-x-auto mb-md">
          <table className="w-full text-bodySm" aria-label="주문 상품 목록">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border">
                {(['상품명', '옵션/SKU', '수량', '단가', '소계'] as const).map((col) => (
                  <th
                    key={col}
                    className={[
                      'py-sm px-sm text-caption font-semibold uppercase tracking-wide whitespace-nowrap',
                      'text-light-textSecondary dark:text-dark-textSecondary',
                      col === '소계' ? 'text-right' : 'text-left',
                      col === '옵션/SKU' ? 'hidden sm:table-cell' : '',
                    ].join(' ')}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.products.map((product, i) => (
                <tr
                  key={i}
                  className="border-b border-light-border dark:border-dark-border last:border-0 hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                >
                  <td className="py-sm px-sm text-light-textPrimary dark:text-dark-textPrimary">
                    {product.name}
                  </td>
                  <td className="py-sm px-sm text-light-textSecondary dark:text-dark-textSecondary hidden sm:table-cell font-mono text-caption">
                    {product.sku}
                  </td>
                  <td className="py-sm px-sm text-light-textPrimary dark:text-dark-textPrimary">
                    {product.quantity}
                  </td>
                  <td className="py-sm px-sm text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap">
                    ₩{product.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-sm px-sm text-right font-semibold text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap">
                    ₩{(product.unitPrice * product.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 금액 상세 */}
        <div className="border-t border-light-border dark:border-dark-border pt-md">
          <dl className="flex flex-col gap-sm w-full">

            {/* 상품금액 */}
            <div className="flex justify-between text-bodySm">
              <dt className="text-light-textSecondary dark:text-dark-textSecondary">상품금액</dt>
              <dd className="font-medium text-light-textPrimary dark:text-dark-textPrimary">
                ₩{productTotal.toLocaleString()}
              </dd>
            </div>

            {/* 배송비 */}
            <div className="flex justify-between text-bodySm">
              <dt className="text-light-textSecondary dark:text-dark-textSecondary">배송비</dt>
              <dd className="font-medium text-light-textPrimary dark:text-dark-textPrimary">
                {order.shippingFee === 0 ? (
                  <span className="text-light-success dark:text-dark-success">무료</span>
                ) : (
                  `₩${order.shippingFee.toLocaleString()}`
                )}
              </dd>
            </div>

            {/* 할인 항목 */}
            {totalDiscount > 0 && (
              <div className="border-t border-light-border dark:border-dark-border pt-sm mt-xs">
                <dt className="text-caption font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wide mb-sm">
                  할인
                </dt>
                <div className="flex flex-col gap-xs pl-sm">

                  {/* 쿠폰 할인 */}
                  {couponDiscount > 0 && order.coupon && (
                    <div className="flex flex-col gap-xs">
                      <div className="flex justify-between text-caption">
                        <span className="text-light-textSecondary dark:text-dark-textSecondary">
                          쿠폰 ({order.coupon.code})
                        </span>
                        <span className="font-semibold text-light-error dark:text-dark-error">
                          -₩{couponDiscount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-sm pl-sm text-[11px] text-light-textSecondary dark:text-dark-textSecondary">
                        <span>{COUPON_TYPE_LABEL[order.coupon.type] ?? order.coupon.type}</span>
                        <span aria-hidden="true">·</span>
                        <span className={COUPON_STATUS_LABEL[order.coupon.status]?.className ?? ''}>
                          {COUPON_STATUS_LABEL[order.coupon.status]?.label ?? order.coupon.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 적립금 할인 */}
                  {pointDiscount > 0 && (
                    <div className="flex justify-between text-caption">
                      <span className="text-light-textSecondary dark:text-dark-textSecondary">
                        적립금
                      </span>
                      <span className="font-semibold text-light-error dark:text-dark-error">
                        -₩{pointDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 총 결제금액 */}
            <div className="flex justify-between border-t border-light-border dark:border-dark-border pt-sm mt-xs">
              <dt className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
                총 결제금액
              </dt>
              <dd className="text-bodyLg font-bold text-light-primary dark:text-dark-primary">
                ₩{finalAmount.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </SectionCard>

      {/* ── 섹션 5: 주문 상태 이력 ────────────────────────────────────────── */}
      {order.statusHistory.length > 0 && (
        <SectionCard title="주문 상태 이력">
          <StatusTimeline entries={order.statusHistory} />
        </SectionCard>
      )}

      {/* ── 섹션 6: 주문 메모 ──────────────────────────────────────────────── */}
      <SectionCard title="주문 메모">
        <MemoLog initialEntries={order.memoLog} />
      </SectionCard>

      {/* ── 섹션 7: 액션 버튼 ──────────────────────────────────────────────── */}
      <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
        <div className="flex items-center justify-end">
          <OrderActionCell
            order={order}
            onOrderUpdate={handleOrderUpdate}
            showDetailLink={false}
          />
        </div>
      </section>
    </div>
  );
};
