'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRightOutlined,
  CheckOutlined,
  DeleteOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import type { Notification } from '@/features/notifications/types/notification.types';
import {
  formatNotificationRelativeTime,
  NOTIFICATION_LEVEL_CONFIG,
  NOTIFICATION_TYPE_LABEL,
} from '@/features/notifications/utils/notification.presenter';

interface NotificationRowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationRow = ({
  notification,
  onMarkRead,
  onDelete,
}: NotificationRowProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const levelConfig = NOTIFICATION_LEVEL_CONFIG[notification.level];

  const handleNavigate = () => {
    if (!notification.link) return;
    if (!notification.is_read) onMarkRead(notification.id);
    router.push(notification.link);
  };

  const handleKeyboardNavigate = (event: React.KeyboardEvent<HTMLLIElement>) => {
    if (!notification.link) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    handleNavigate();
  };

  const rowClass = [
    'group relative flex items-start gap-sm px-md py-sm transition-colors',
    'border-b border-light-border dark:border-dark-border last:border-b-0',
    notification.link ? 'cursor-pointer' : '',
    !notification.is_read
      ? 'bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/30'
      : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
  ].join(' ');

  return (
    <li
      className={rowClass}
      onClick={notification.link ? handleNavigate : undefined}
      onKeyDown={handleKeyboardNavigate}
      role={notification.link ? 'link' : undefined}
      tabIndex={notification.link ? 0 : undefined}
    >
      <span
        className={[
          'flex-shrink-0 mt-[0.4rem] h-2 w-2 rounded-full',
          !notification.is_read
            ? 'bg-light-primary dark:bg-dark-primary'
            : 'bg-transparent',
        ].join(' ')}
        aria-hidden="true"
      />

      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-bodySm ${levelConfig.bgColor} ${levelConfig.color}`}
        aria-label={levelConfig.label}
      >
        {levelConfig.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="flex flex-wrap items-center gap-xs">
            <span className="inline-flex items-center rounded bg-light-border px-xs py-0.5 text-overline font-semibold text-light-textSecondary dark:bg-dark-border dark:text-dark-textSecondary">
              {NOTIFICATION_TYPE_LABEL[notification.type]}
            </span>
            <p
              className={[
                'text-bodySm font-semibold leading-snug',
                !notification.is_read
                  ? 'text-light-textPrimary dark:text-dark-textPrimary'
                  : 'text-light-textSecondary dark:text-dark-textSecondary',
              ].join(' ')}
            >
              {notification.title}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-sm">
            <span className="whitespace-nowrap text-caption text-light-textSecondary dark:text-dark-textSecondary">
              {formatNotificationRelativeTime(notification.created_at)}
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen((value) => !value);
                }}
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  'text-light-textSecondary dark:text-dark-textSecondary',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100',
                  menuOpen
                    ? 'bg-light-secondary opacity-100 dark:bg-dark-secondary'
                    : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                ].join(' ')}
                aria-label="더보기"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <EllipsisOutlined aria-hidden="true" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    role="menu"
                    className={[
                      'absolute right-0 top-full z-20 mt-xs w-36 overflow-hidden rounded-md shadow-md',
                      'border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface',
                    ].join(' ')}
                  >
                    {!notification.is_read && (
                      <button
                        role="menuitem"
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onMarkRead(notification.id);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-sm px-sm py-xs text-bodySm text-light-textPrimary transition-colors hover:bg-light-secondary dark:text-dark-textPrimary dark:hover:bg-dark-secondary"
                      >
                        <CheckOutlined aria-hidden="true" />
                        읽음 처리
                      </button>
                    )}
                    <button
                      role="menuitem"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDelete(notification.id);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-sm px-sm py-xs text-bodySm text-light-error transition-colors hover:bg-red-50 dark:text-dark-error dark:hover:bg-red-900/20"
                    >
                      <DeleteOutlined aria-hidden="true" />
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="mt-xs line-clamp-2 text-caption leading-snug text-light-textSecondary dark:text-dark-textSecondary">
          {notification.message}
        </p>

        {notification.link && (
          <Link
            href={notification.link}
            onClick={(event) => {
              event.stopPropagation();
              if (!notification.is_read) onMarkRead(notification.id);
            }}
            className="mt-xs hidden items-center gap-xs text-caption font-semibold text-light-primary transition-opacity hover:opacity-70 dark:text-dark-primary sm:inline-flex"
          >
            바로가기
            <ArrowRightOutlined aria-hidden="true" className="text-overline" />
          </Link>
        )}
      </div>
    </li>
  );
};
