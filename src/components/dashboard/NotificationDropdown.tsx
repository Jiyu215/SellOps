'use client';

import Link from 'next/link';
import {
  CloseCircleOutlined,
  StopOutlined,
  RollbackOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  MessageOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { Notification, NotificationType } from '@/types/dashboard';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

// 알림 타입별 아이콘·색상 설정
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  payment_failure: {
    icon: <CloseCircleOutlined aria-hidden="true" />,
    label: '결제 실패',
    color: 'text-light-error dark:text-dark-error',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  order_cancel: {
    icon: <StopOutlined aria-hidden="true" />,
    label: '주문 취소',
    color: 'text-light-warning dark:text-dark-warning',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  order_return: {
    icon: <RollbackOutlined aria-hidden="true" />,
    label: '반품',
    color: 'text-light-warning dark:text-dark-warning',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  shipping_delay: {
    icon: <ClockCircleOutlined aria-hidden="true" />,
    label: '배송 지연',
    color: 'text-light-info dark:text-dark-info',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  low_stock: {
    icon: <AlertOutlined aria-hidden="true" />,
    label: '재고 부족',
    color: 'text-light-error dark:text-dark-error',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  customer_inquiry: {
    icon: <MessageOutlined aria-hidden="true" />,
    label: '고객 문의',
    color: 'text-light-primary dark:text-dark-primary',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
};

/**
 * 상대 시간 포맷
 * mock 기준 시각: 2026-03-27T10:00:00Z
 */
const formatRelativeTime = (isoString: string): string => {
  const now = new Date('2026-03-27T10:00:00Z');
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전`;
};

/**
 * 알림 드롭다운 패널
 *
 * - 미읽음 알림 상단 강조(파란 배경 + 점)
 * - 클릭 시 읽음 처리 + 해당 페이지 이동
 * - 헤더의 알림 래퍼(relative div) 안에서 absolute 위치로 렌더링
 * - click-outside 감지는 부모(Header)에서 ref로 처리
 */
export const NotificationDropdown = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className={[
        'absolute right-0 top-full mt-1 z-50',
        'w-80 sm:w-96 max-h-[480px] flex flex-col',
        'bg-light-surface dark:bg-dark-surface',
        'border border-light-border dark:border-dark-border',
        'rounded-lg shadow-lg overflow-hidden',
      ].join(' ')}
      role="dialog"
      aria-label="알림 목록"
    >
      {/* ── 드롭다운 헤더 ── */}
      <div className="flex items-center justify-between px-md py-sm border-b border-light-border dark:border-dark-border flex-shrink-0">
        <div className="flex items-center gap-sm">
          <h2 className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
            알림
          </h2>
          {unreadCount > 0 && (
            <span className="min-w-[1.25rem] h-5 px-xs rounded-full bg-light-error dark:bg-dark-error text-white text-overline font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-xs text-caption font-semibold text-light-primary dark:text-dark-primary hover:opacity-70 transition-opacity"
          >
            <CheckOutlined aria-hidden="true" />
            모두 읽음
          </button>
        )}
      </div>

      {/* ── 알림 목록 ── */}
      <ul className="flex-1 overflow-y-auto divide-y divide-light-border dark:divide-dark-border">
        {notifications.length === 0 ? (
          <li className="flex items-center justify-center py-xl text-caption text-light-textSecondary dark:text-dark-textSecondary">
            새 알림이 없습니다
          </li>
        ) : (
          notifications.map((n) => {
            const config = TYPE_CONFIG[n.type];

            const content = (
              <>
                {/* 타입 아이콘 */}
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-bodySm ${config.bgColor} ${config.color}`}
                >
                  {config.icon}
                </span>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-xs">
                    <p
                      className={[
                        'text-caption font-semibold leading-snug',
                        !n.isRead
                          ? 'text-light-textPrimary dark:text-dark-textPrimary'
                          : 'text-light-textSecondary dark:text-dark-textSecondary',
                      ].join(' ')}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span
                        role="img"
                        aria-label="미읽음"
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-light-primary dark:bg-dark-primary mt-1"
                      />
                    )}
                  </div>
                  <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs line-clamp-2 leading-snug">
                    {n.message}
                  </p>
                  <p className="text-overline text-light-textSecondary dark:text-dark-textSecondary mt-xs">
                    {config.label} · {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
              </>
            );

            const itemClass = [
              'w-full text-left flex items-start gap-sm px-md py-sm',
              'hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors',
              !n.isRead ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : '',
            ].join(' ');

            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => { onMarkRead(n.id); onClose(); }}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => { onMarkRead(n.id); onClose(); }}
                    className={itemClass}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>

      {/* ── 전체 보기 ── */}
      <div className="flex-shrink-0 border-t border-light-border dark:border-dark-border">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="flex items-center justify-center py-sm text-caption font-semibold text-light-primary dark:text-dark-primary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors w-full"
        >
          전체 보기
        </Link>
      </div>
    </div>
  );
};
