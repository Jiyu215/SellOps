'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MoreOutlined, CloseOutlined } from '@ant-design/icons';
import type { Order } from '@/types/dashboard';
import type { ActionKey } from '@/types/orderActions';
import { ACTION_CONFIG, getActionsForOrder, getTransitionForAction } from '@/utils/orderActionUtils';

// ── 타입 ─────────────────────────────────────────────────────────────────

type OrderStatusPartial = Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>;

interface OrderActionCellProps {
  order:           Order;
  onOrderUpdate:   (id: string, partial: OrderStatusPartial) => void;
  /** true 이면 상세보기 링크를 함께 렌더링한다 */
  showDetailLink?: boolean;
}

// ── 확인 모달 ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title:        string;
  message:      string;
  confirmLabel: string;
  isDanger:     boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}

/**
 * 반응형 확인 모달
 *
 * ### 너비 / 높이 breakpoint 전략
 *
 * | 구간                 | 형태         | 너비                              | 최대 높이  |
 * |---------------------|------------|-----------------------------------|-----------|
 * | 모바일   <768px      | 하단 시트    | 100vw (w-full)                   | 85vh      |
 * | 태블릿   768–1023px  | 중앙 다이얼로그 | 420px (max: 100vw-2rem)         | 80vh      |
 * | 데스크탑 1024–1279px | 중앙 다이얼로그 | 440px                           | 80vh      |
 * | 와이드   ≥1280px     | 중앙 다이얼로그 | 460px                           | 80vh      |
 *
 * ### UX
 * - 모바일: 상단 핸들바, 세로 스택 버튼 (확정↑ / 취소↓), 터치 타겟 py-sm
 * - 태블릿+: 우상단 X 버튼, 가로 우정렬 버튼, 컴팩트 py-xs
 * - 공통: ESC 닫기, 백드롭 클릭 닫기, body 스크롤 잠금, overflow-y-auto 안전망
 */
const ConfirmModal = ({ title, message, confirmLabel, isDanger, onConfirm, onCancel }: ConfirmModalProps) => {
  // ESC 키 닫기 + body 스크롤 잠금
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    // ── 오버레이 컨테이너 ──────────────────────────────────────────────
    // 모바일: items-end → 패널이 화면 최하단에 정렬
    // 태블릿+(md): items-center → 패널이 수직 중앙에
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      onClick={onCancel}
    >
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50 animate-modal-backdrop"
        aria-hidden="true"
      />

      {/* ── 모달 패널 ────────────────────────────────────────────────────
          너비: 모바일 100% → 태블릿 420px → 데스크탑 440px → 와이드 460px
          높이: 모바일 max 85vh → 태블릿+ max 80vh  (overflow-y-auto로 스크롤)
          패딩: 모바일 소형 → 태블릿+ 표준
          애니메이션: 모바일 slide-up, md+ fade-scale (cascade 후순위 덮어씀) */}
      <div
        className={[
          // 공통
          'relative w-full bg-light-surface dark:bg-dark-surface shadow-xl z-10',
          'overflow-y-auto',   // 콘텐츠 초과 시 스크롤 안전망

          // ── 모바일 (<768px): 하단 시트 ──
          'rounded-t-lg animate-modal-slide-up',
          'max-h-[85vh]',      // 백드롭 상단 15% 노출 확보
          'px-md pt-xs pb-xl', // 하단 여백 넉넉히 (홈 인디케이터 영역)

          // ── 태블릿 (≥768px): 중앙 다이얼로그 ──
          'md:rounded-lg md:animate-modal-fade-scale',
          'md:w-[420px] md:max-w-[calc(100vw-2rem)]', // 뷰포트 끝에 닿지 않도록 fallback
          'md:max-h-[80vh]',
          'md:px-lg md:pt-lg md:pb-lg',

          // ── 데스크탑 (≥1024px) ──
          'lg:w-[440px]',

          // ── 와이드 (≥1280px) ──
          'xl:w-[460px]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들바 — 모바일 전용 */}
        <div className="flex justify-center pt-sm pb-md md:hidden" aria-hidden="true">
          <div className="w-9 h-1 rounded-full bg-light-border dark:bg-dark-border" />
        </div>

        {/* 닫기(X) 버튼 — 태블릿+ 전용 */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="모달 닫기"
          className="hidden md:flex absolute top-md right-md p-xs rounded-md text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
        >
          <CloseOutlined aria-hidden="true" />
        </button>

        {/* 제목 */}
        <h3
          id="action-modal-title"
          className="text-bodyLg font-bold text-light-textPrimary dark:text-dark-textPrimary mb-sm text-center"
        >
          {title}
        </h3>

        {/* 설명 메시지 */}
        <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary mb-lg text-center">
          {message}
        </p>

        {/* ── 버튼 그룹: 모든 화면에서 가운데 정렬 ────────────────────── */}
        <div className="flex flex-col-reverse gap-sm items-center md:flex-row md:justify-center">
          <button
            type="button"
            onClick={onCancel}
            className={[
              'w-full md:w-auto px-md rounded-md text-bodySm font-medium transition-colors',
              'py-sm md:py-xs',
              'border border-light-border dark:border-dark-border',
              'text-light-textSecondary dark:text-dark-textSecondary',
              'hover:bg-light-secondary dark:hover:bg-dark-secondary',
            ].join(' ')}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'w-full md:w-auto px-md rounded-md text-bodySm font-semibold text-white transition-colors',
              'py-sm md:py-xs',
              isDanger
                ? 'bg-light-error dark:bg-dark-error hover:opacity-90'
                : 'bg-light-primary dark:bg-dark-primary hover:opacity-90',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

/**
 * 주문 액션 셀
 *
 * - 현재 주문 상태에 맞는 버튼과 ⋯ 메뉴를 렌더링한다.
 * - 버튼 클릭 → 확인 모달 → 확정 시 onOrderUpdate 호출.
 * - 행 클릭(상세 이동) 전파를 차단한다.
 */
export const OrderActionCell = ({ order, onOrderUpdate, showDetailLink = false }: OrderActionCellProps) => {
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { primaryActions, menuActions } = getActionsForOrder(order);

  // ⋯ 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleActionClick = useCallback((key: ActionKey, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingAction(key);
    setMenuOpen(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return;
    onOrderUpdate(order.id, getTransitionForAction(pendingAction));
    setPendingAction(null);
  }, [pendingAction, order.id, onOrderUpdate]);

  const handleCancel = useCallback(() => setPendingAction(null), []);

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  }, []);

  const isTerminal = primaryActions.length === 0 && menuActions.length === 0;

  // showDetailLink 없이 종료 상태면 아무것도 렌더하지 않는다
  if (isTerminal && !showDetailLink) return null;

  const modalConfig = pendingAction ? ACTION_CONFIG[pendingAction] : null;

  const detailHref = `/dashboard/orders/${order.id}`;
  const detailLinkClass = 'text-caption font-semibold px-sm py-xs rounded-md whitespace-nowrap transition-colors bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-light-primary dark:hover:text-dark-primary';

  // 종료 상태: 상세보기 버튼만 단독 표시
  if (isTerminal) {
    return (
      <div
        className="flex items-center gap-xs justify-end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Link href={detailHref} onClick={(e) => e.stopPropagation()} className={detailLinkClass}>
          상세보기
        </Link>
      </div>
    );
  }

  // 활성 상태: ⋯ 메뉴에 상세보기 추가 여부 결정
  // - menuActions 가 이미 있으면 → ⋯ 메뉴 마지막에 상세보기 Link 아이템 추가
  // - menuActions 가 없으면   → ⋯ 메뉴 새로 생성 (상세보기 전용)
  const hasMenuWithDetail = showDetailLink;

  return (
    <>
      <div
        className="flex items-center gap-xs justify-end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Primary 액션 버튼 */}
        {primaryActions.map((key) => {
          const cfg = ACTION_CONFIG[key];
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => handleActionClick(key, e)}
              className={[
                'text-caption font-semibold px-sm py-xs rounded-md whitespace-nowrap transition-colors',
                cfg.buttonVariant === 'danger'
                  ? 'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error hover:bg-red-200 dark:hover:bg-red-800/40'
                  : 'bg-light-secondary dark:bg-dark-secondary text-light-primary dark:text-dark-primary hover:bg-blue-100 dark:hover:bg-blue-900/30',
              ].join(' ')}
            >
              {cfg.label}
            </button>
          );
        })}

        {/* ⋯ 드롭다운 메뉴 (menuActions 또는 showDetailLink 일 때) */}
        {(menuActions.length > 0 || hasMenuWithDetail) && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={toggleMenu}
              aria-label="추가 액션"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="p-xs rounded-md text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
            >
              <MoreOutlined aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-xs z-20 min-w-[120px] bg-light-surface dark:bg-dark-surface rounded-md shadow-lg border border-light-border dark:border-dark-border py-xs"
              >
                {menuActions.map((key) => {
                  const cfg = ACTION_CONFIG[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      role="menuitem"
                      onClick={(e) => handleActionClick(key, e)}
                      className={[
                        'w-full text-left px-md py-xs text-bodySm whitespace-nowrap transition-colors',
                        'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                        cfg.buttonVariant === 'danger'
                          ? 'text-light-error dark:text-dark-error'
                          : 'text-light-textPrimary dark:text-dark-textPrimary',
                      ].join(' ')}
                    >
                      {cfg.label}
                    </button>
                  );
                })}

                {/* 상세보기 — showDetailLink 일 때 ⋯ 메뉴 마지막 항목 */}
                {showDetailLink && (
                  <Link
                    href={detailHref}
                    role="menuitem"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full text-left px-md py-xs text-bodySm whitespace-nowrap transition-colors text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-secondary dark:hover:bg-dark-secondary"
                  >
                    상세보기
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 확인 모달 */}
      {modalConfig && (
        <ConfirmModal
          title={modalConfig.modalTitle}
          message={modalConfig.modalMessage}
          confirmLabel={modalConfig.confirmLabel}
          isDanger={modalConfig.buttonVariant === 'danger'}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
