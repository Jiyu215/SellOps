'use client';

import Link from 'next/link';
import { CheckOutlined } from '@ant-design/icons';
import type { Notification } from '@/types/dashboard';
import {
  formatNotificationRelativeTime,
  NOTIFICATION_LEVEL_CONFIG,
  NOTIFICATION_TYPE_LABEL,
} from '@/features/notifications/utils/notification.presenter';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export const NotificationDropdown = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) => {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div
      className={[
        'absolute right-0 top-full mt-1 z-50',
        'flex max-h-[480px] w-80 flex-col sm:w-96',
        'overflow-hidden rounded-lg border border-light-border bg-light-surface shadow-lg',
        'dark:border-dark-border dark:bg-dark-surface',
      ].join(' ')}
      role="dialog"
      aria-label="알림 목록"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-light-border px-md py-sm dark:border-dark-border">
        <div className="flex items-center gap-sm">
          <h2 className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
            알림
          </h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-light-error px-xs text-overline font-bold leading-none text-white dark:bg-dark-error">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-xs text-caption font-semibold text-light-primary transition-opacity hover:opacity-70 dark:text-dark-primary"
          >
            <CheckOutlined aria-hidden="true" />
            모두 읽음
          </button>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-light-border dark:divide-dark-border">
        {notifications.length === 0 ? (
          <li className="flex items-center justify-center py-xl text-caption text-light-textSecondary dark:text-dark-textSecondary">
            새로운 알림이 없습니다
          </li>
        ) : (
          notifications.map((notification) => {
            const levelConfig = NOTIFICATION_LEVEL_CONFIG[notification.level];

            const content = (
              <>
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-bodySm ${levelConfig.bgColor} ${levelConfig.color}`}
                >
                  {levelConfig.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-xs">
                    <p
                      className={[
                        'text-caption font-semibold leading-snug',
                        !notification.is_read
                          ? 'text-light-textPrimary dark:text-dark-textPrimary'
                          : 'text-light-textSecondary dark:text-dark-textSecondary',
                      ].join(' ')}
                    >
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span
                        role="img"
                        aria-label="읽지 않음"
                        className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-light-primary dark:bg-dark-primary"
                      />
                    )}
                  </div>
                  <p className="mt-xs line-clamp-2 text-caption leading-snug text-light-textSecondary dark:text-dark-textSecondary">
                    {notification.message}
                  </p>
                  <p className="mt-xs text-overline text-light-textSecondary dark:text-dark-textSecondary">
                    {NOTIFICATION_TYPE_LABEL[notification.type]} ·{' '}
                    {formatNotificationRelativeTime(notification.created_at)}
                  </p>
                </div>
              </>
            );

            const itemClass = [
              'flex w-full items-start gap-sm px-md py-sm text-left transition-colors',
              'hover:bg-light-secondary dark:hover:bg-dark-secondary',
              !notification.is_read ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : '',
            ].join(' ');

            return (
              <li key={notification.id}>
                {notification.link ? (
                  <Link
                    href={notification.link}
                    onClick={() => {
                      onMarkRead(notification.id);
                      onClose();
                    }}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead(notification.id);
                      onClose();
                    }}
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

      <div className="flex-shrink-0 border-t border-light-border dark:border-dark-border">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="flex w-full items-center justify-center py-sm text-caption font-semibold text-light-primary transition-colors hover:bg-light-secondary dark:text-dark-primary dark:hover:bg-dark-secondary"
        >
          전체 보기
        </Link>
      </div>
    </div>
  );
};
