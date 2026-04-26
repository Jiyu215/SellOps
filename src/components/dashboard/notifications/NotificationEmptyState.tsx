'use client';

import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface NotificationEmptyStateProps {
  hasFilter: boolean;
  onReset:   () => void;
}

export const NotificationEmptyState = ({
  hasFilter,
  onReset,
}: NotificationEmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-xxl gap-md text-center">
    <span
      className={[
        'flex items-center justify-center w-16 h-16 rounded-full text-xl',
        hasFilter
          ? 'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary'
          : 'bg-green-100 dark:bg-green-900/30 text-light-success dark:text-dark-success',
      ].join(' ')}
      aria-hidden="true"
    >
      {hasFilter ? <BellOutlined /> : <CheckCircleOutlined />}
    </span>

    <div>
      <p className="text-bodyMd font-semibold text-light-textPrimary dark:text-dark-textPrimary">
        {hasFilter ? '해당 조건의 알림이 없습니다.' : '모든 알림을 확인했습니다.'}
      </p>
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
        {hasFilter
          ? '다른 필터 조건으로 검색해보세요.'
          : '새로운 알림이 생기면 여기에 표시됩니다.'}
      </p>
    </div>

    {hasFilter && (
      <button
        type="button"
        onClick={onReset}
        className="px-md py-xs text-bodySm font-semibold rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
      >
        필터 초기화
      </button>
    )}
  </div>
);
