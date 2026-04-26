'use client';

import { DownOutlined, CloseOutlined } from '@ant-design/icons';
import type {
  NotificationType,
  NotificationLevel,
} from '@/features/notifications/types/notification.types';

export type ReadStatus = 'all' | 'unread';
export type PeriodFilter = '' | 'today' | '7d' | '30d';

interface NotificationFilterBarProps {
  readStatus:     ReadStatus;
  typeFilter:     NotificationType | '';
  levelFilter:    NotificationLevel | '';
  periodFilter:   PeriodFilter;
  hasActiveFilter: boolean;
  onReadStatusChange:   (v: ReadStatus) => void;
  onTypeFilterChange:   (v: NotificationType | '') => void;
  onLevelFilterChange:  (v: NotificationLevel | '') => void;
  onPeriodFilterChange: (v: PeriodFilter) => void;
  onReset: () => void;
}

const TYPE_OPTIONS: { value: NotificationType | ''; label: string }[] = [
  { value: '',          label: '전체 카테고리' },
  { value: 'order',     label: '주문' },
  { value: 'inventory', label: '재고' },
  { value: 'product',   label: '상품' },
  { value: 'system',    label: '시스템' },
];

const LEVEL_OPTIONS: { value: NotificationLevel | ''; label: string }[] = [
  { value: '',         label: '전체 레벨' },
  { value: 'critical', label: '긴급' },
  { value: 'warning',  label: '주의' },
  { value: 'info',     label: '정보' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '',      label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: '7d',    label: '최근 7일' },
  { value: '30d',   label: '최근 30일' },
];

const selectClass = [
  'appearance-none pl-sm pr-[1.75rem] py-xs text-bodySm rounded-md border',
  'border-light-border dark:border-dark-border',
  'bg-light-surface dark:bg-dark-surface',
  'text-light-textPrimary dark:text-dark-textPrimary',
  'focus:outline-none focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary',
  'cursor-pointer',
].join(' ')

export const NotificationFilterBar = ({
  readStatus,
  typeFilter,
  levelFilter,
  periodFilter,
  hasActiveFilter,
  onReadStatusChange,
  onTypeFilterChange,
  onLevelFilterChange,
  onPeriodFilterChange,
  onReset,
}: NotificationFilterBarProps) => (
  <div className="flex flex-wrap items-center gap-sm">
    {/* 읽음 상태 탭 */}
    <div className="flex rounded-md border border-light-border dark:border-dark-border overflow-hidden">
      {(['all', 'unread'] as ReadStatus[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onReadStatusChange(v)}
          className={[
            'px-md py-xs text-bodySm font-medium transition-colors',
            readStatus === v
              ? 'bg-light-primary dark:bg-dark-primary text-white'
              : 'bg-light-surface dark:bg-dark-surface text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary',
          ].join(' ')}
        >
          {v === 'all' ? '전체' : '미확인'}
        </button>
      ))}
    </div>

    {/* 카테고리 */}
    <div className="relative">
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as NotificationType | '')}
        className={selectClass}
        aria-label="카테고리 필터"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <DownOutlined className="absolute right-xs top-1/2 -translate-y-1/2 text-light-textSecondary dark:text-dark-textSecondary pointer-events-none text-overline" aria-hidden="true" />
    </div>

    {/* 레벨 */}
    <div className="relative">
      <select
        value={levelFilter}
        onChange={(e) => onLevelFilterChange(e.target.value as NotificationLevel | '')}
        className={selectClass}
        aria-label="레벨 필터"
      >
        {LEVEL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <DownOutlined className="absolute right-xs top-1/2 -translate-y-1/2 text-light-textSecondary dark:text-dark-textSecondary pointer-events-none text-overline" aria-hidden="true" />
    </div>

    {/* 기간 */}
    <div className="relative">
      <select
        value={periodFilter}
        onChange={(e) => onPeriodFilterChange(e.target.value as PeriodFilter)}
        className={selectClass}
        aria-label="기간 필터"
      >
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <DownOutlined className="absolute right-xs top-1/2 -translate-y-1/2 text-light-textSecondary dark:text-dark-textSecondary pointer-events-none text-overline" aria-hidden="true" />
    </div>

    {/* 초기화 */}
    {hasActiveFilter && (
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-xs px-sm py-xs text-bodySm text-light-textSecondary dark:text-dark-textSecondary hover:text-light-error dark:hover:text-dark-error transition-colors"
      >
        <CloseOutlined aria-hidden="true" />
        초기화
      </button>
    )}
  </div>
);
