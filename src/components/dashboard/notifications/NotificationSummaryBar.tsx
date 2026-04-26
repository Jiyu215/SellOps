'use client';

import type { NotificationListSummary } from '@/features/notifications/types/notification.types';

interface NotificationSummaryBarProps {
  summary: NotificationListSummary;
  activeTab: 'all' | 'unread' | 'critical' | 'warning';
  onTabChange: (tab: 'all' | 'unread' | 'critical' | 'warning') => void;
}

type TabConfig = {
  key:   'all' | 'unread' | 'critical' | 'warning';
  label: string;
  count: (s: NotificationListSummary) => number;
  activeClass: string;
  countClass: string;
};

const TABS: TabConfig[] = [
  {
    key:         'all',
    label:       '전체',
    count:       (s) => s.total,
    activeClass: 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary',
    countClass:  'bg-light-secondary dark:bg-dark-secondary text-light-primary dark:text-dark-primary',
  },
  {
    key:         'unread',
    label:       '미확인',
    count:       (s) => s.unread,
    activeClass: 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary',
    countClass:  'bg-light-secondary dark:bg-dark-secondary text-light-primary dark:text-dark-primary',
  },
  {
    key:         'critical',
    label:       '긴급',
    count:       (s) => s.critical,
    activeClass: 'border-light-error dark:border-dark-error text-light-error dark:text-dark-error',
    countClass:  'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error',
  },
  {
    key:         'warning',
    label:       '주의',
    count:       (s) => s.warning,
    activeClass: 'border-light-warning dark:border-dark-warning text-light-warning dark:text-dark-warning',
    countClass:  'bg-yellow-100 dark:bg-yellow-900/30 text-light-warning dark:text-dark-warning',
  },
];

export const NotificationSummaryBar = ({
  summary,
  activeTab,
  onTabChange,
}: NotificationSummaryBarProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
    {TABS.map((tab) => {
      const count    = tab.count(summary);
      const isActive = activeTab === tab.key;

      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={[
            'flex flex-col items-center justify-center gap-xs py-md px-sm rounded-lg border-2 transition-all',
            'bg-light-surface dark:bg-dark-surface',
            'hover:bg-light-secondary dark:hover:bg-dark-secondary',
            isActive
              ? tab.activeClass
              : 'border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary',
          ].join(' ')}
          aria-pressed={isActive}
        >
          <span className="text-bodySm font-medium">{tab.label}</span>
          <span
            className={[
              'min-w-[2rem] h-7 px-sm rounded-full flex items-center justify-center text-bodySm font-bold',
              isActive
                ? tab.countClass
                : 'bg-light-border dark:bg-dark-border text-light-textSecondary dark:text-dark-textSecondary',
              tab.key === 'critical' && count > 0
                ? 'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error'
                : '',
            ].join(' ')}
          >
            {count.toLocaleString()}
          </span>
        </button>
      );
    })}
  </div>
);
