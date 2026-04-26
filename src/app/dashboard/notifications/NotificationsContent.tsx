'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useTransition,
} from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CheckOutlined, LeftOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import type {
  Notification,
  NotificationListSummary,
  NotificationListQuery,
  NotificationType,
  NotificationLevel,
} from '@/features/notifications/types/notification.types';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/features/notifications/api/notification.api';
import { NotificationSummaryBar } from '@/components/dashboard/notifications/NotificationSummaryBar';
import { NotificationFilterBar, type ReadStatus, type PeriodFilter } from '@/components/dashboard/notifications/NotificationFilterBar';
import { NotificationList } from '@/components/dashboard/notifications/NotificationList';
import { NotificationEmptyState } from '@/components/dashboard/notifications/NotificationEmptyState';
import { NotificationSkeleton } from '@/components/dashboard/notifications/NotificationSkeleton';

const LIMIT_OPTIONS = [20, 50, 100] as const;
type LimitOption = typeof LIMIT_OPTIONS[number];

interface NotificationsContentProps {
  initialNotifications: Notification[];
  initialTotal:         number;
  initialSummary:       NotificationListSummary;
}

/**
 * Build URLSearchParams representing the current notification filter and pagination state.
 *
 * Encodes `status`, `level`, `type`, `period`, `page`, and `limit` according to the UI rules:
 * - `status=unread` when `readStatus` is `'unread'` or when `summaryTab` is `'unread'`, `'critical'`, or `'warning'`.
 * - `level=critical` or `level=warning` when `summaryTab` is `'critical'` or `'warning'` (these also imply `status=unread`).
 * - `query.level` is included only when not overridden by `summaryTab` critical/warning.
 * - `page` is included only when greater than 1.
 * - `limit` is included only when it differs from the default (20).
 *
 * @param query - Effective notification query (may include `type`, `level`, `period`, `page`, `limit`).
 * @param readStatus - Current read-status filter (`'unread'` or `'all'`).
 * @param summaryTab - Active summary tab (`'all' | 'unread' | 'critical' | 'warning'`) which can override `level` and `status`.
 * @returns URLSearchParams containing the encoded query parameters for use in the URL.
 */
function buildParams(
  query: NotificationListQuery,
  readStatus: ReadStatus,
  summaryTab: 'all' | 'unread' | 'critical' | 'warning',
): URLSearchParams {
  const p = new URLSearchParams();
  if (readStatus === 'unread' || summaryTab === 'unread') p.set('status', 'unread');
  if (summaryTab === 'critical') { p.set('level', 'critical'); p.set('status', 'unread'); }
  if (summaryTab === 'warning')  { p.set('level', 'warning');  p.set('status', 'unread'); }
  if (query.type)   p.set('type',   query.type);
  if (query.level && !['critical', 'warning'].includes(summaryTab)) p.set('level', query.level);
  if (query.period) p.set('period', query.period);
  if ((query.page ?? 1) > 1) p.set('page', String(query.page));
  if ((query.limit ?? 20) !== 20) p.set('limit', String(query.limit));
  return p;
}

export const NotificationsContent = ({
  initialNotifications,
  initialTotal,
  initialSummary,
}: NotificationsContentProps) => {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ── 필터 상태 ──
  const [summaryTab, setSummaryTab] = useState<'all' | 'unread' | 'critical' | 'warning'>(() => {
    const s = searchParams.get('status');
    const l = searchParams.get('level');
    if (s === 'unread' && l === 'critical') return 'critical';
    if (s === 'unread' && l === 'warning')  return 'warning';
    if (s === 'unread') return 'unread';
    return 'all';
  });
  const [readStatus,   setReadStatus]   = useState<ReadStatus>(() =>
    searchParams.get('status') === 'unread' ? 'unread' : 'all');
  const [typeFilter,   setTypeFilter]   = useState<NotificationType | ''>(() =>
    (searchParams.get('type') ?? '') as NotificationType | '');
  const [levelFilter,  setLevelFilter]  = useState<NotificationLevel | ''>(() =>
    (searchParams.get('level') ?? '') as NotificationLevel | '');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(() =>
    (searchParams.get('period') ?? '') as PeriodFilter);
  const [page,  setPage]  = useState(() => Math.max(1, Number(searchParams.get('page') ?? 1)));
  const [limit, setLimit] = useState<LimitOption>(() => {
    const l = Number(searchParams.get('limit') ?? 20);
    return (LIMIT_OPTIONS as readonly number[]).includes(l) ? (l as LimitOption) : 20;
  });

  // ── 데이터 상태 ──
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [total,         setTotal]         = useState(initialTotal);
  const [summary,       setSummary]       = useState<NotificationListSummary>(initialSummary);
  const [loading,       setLoading]       = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── 쿼리 객체 ──
  const query = useMemo<NotificationListQuery>(() => {
    const effectiveLevel: NotificationLevel | '' =
      summaryTab === 'critical' ? 'critical' :
      summaryTab === 'warning'  ? 'warning'  :
      levelFilter;
    const effectiveStatus: 'unread' | undefined =
      summaryTab === 'unread' || summaryTab === 'critical' || summaryTab === 'warning' || readStatus === 'unread'
        ? 'unread' : undefined;

    return {
      status: effectiveStatus,
      type:   typeFilter || undefined,
      level:  effectiveLevel || undefined,
      period: periodFilter || undefined,
      page,
      limit,
    };
  }, [summaryTab, readStatus, typeFilter, levelFilter, periodFilter, page, limit]);

  const queryKey       = JSON.stringify(query);
  const lastQueryRef   = useRef(queryKey);
  const isInitialMount = useRef(true);

  // ── 데이터 패치 ──
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastQueryRef.current   = queryKey;
      return;
    }
    if (lastQueryRef.current === queryKey) return;
    lastQueryRef.current = queryKey;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const res = await fetchNotifications(query);
        if (cancelled) return;
        setNotifications(res.items);
        setTotal(res.total);
        setSummary(res.summary);
      } catch {
        // 네트워크 오류 시 현재 상태 유지
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL 동기화 ──
  useEffect(() => {
    if (isInitialMount.current) return;
    const params = buildParams(query, readStatus, summaryTab);
    const qs     = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    });
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 낙관적 읽음 처리 ──
  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setSummary((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    try {
      await markNotificationRead(id);
    } catch {
      // 낙관적 업데이트 유지
    }
  }, []);

  // ── 낙관적 전체 읽음 처리 ──
  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setSummary((prev) => ({ ...prev, unread: 0, critical: 0, warning: 0 }));
    try {
      await markAllNotificationsRead();
    } catch {
      // 낙관적 업데이트 유지
    }
  }, []);

  // ── 낙관적 삭제 ──
  const handleDelete = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setSummary((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
      unread: target && !target.is_read ? Math.max(0, prev.unread - 1) : prev.unread,
      critical:
        target && !target.is_read && target.level === 'critical'
          ? Math.max(0, prev.critical - 1)
          : prev.critical,
      warning:
        target && !target.is_read && target.level === 'warning'
          ? Math.max(0, prev.warning - 1)
          : prev.warning,
    }));
    try {
      await deleteNotification(id);
    } catch {
      // 낙관적 업데이트 유지
    }
  }, [notifications]);

  // ── SummaryBar 탭 클릭 ──
  const handleSummaryTab = useCallback((tab: 'all' | 'unread' | 'critical' | 'warning') => {
    setSummaryTab(tab);
    setPage(1);
    if (tab === 'critical') {
      setLevelFilter('critical');
      setReadStatus('unread');
    } else if (tab === 'warning') {
      setLevelFilter('warning');
      setReadStatus('unread');
    } else if (tab === 'unread') {
      setLevelFilter('');
      setReadStatus('unread');
    } else {
      setLevelFilter('');
      setReadStatus('all');
    }
  }, []);

  const handleReset = useCallback(() => {
    setSummaryTab('all');
    setReadStatus('all');
    setTypeFilter('');
    setLevelFilter('');
    setPeriodFilter('');
    setPage(1);
  }, []);

  const hasFilter =
    readStatus !== 'all' || !!typeFilter || !!levelFilter || !!periodFilter || summaryTab !== 'all';

  return (
    <div className="space-y-md">
      {/* ── PageHeader ── */}
      <div className="flex items-start justify-between gap-sm flex-wrap">
        <div>
          <h1 className="text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            알림
          </h1>
          <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            총 {total.toLocaleString()}건
            {summary.unread > 0 && (
              <> · 미확인 <span className="font-semibold text-light-primary dark:text-dark-primary">{summary.unread.toLocaleString()}</span>건</>
            )}
          </p>
        </div>

        {summary.unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-xs px-md py-xs text-bodySm font-semibold rounded-md border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
          >
            <CheckOutlined aria-hidden="true" />
            전체 읽음 처리
          </button>
        )}
      </div>

      {/* ── SummaryBar ── */}
      <NotificationSummaryBar
        summary={summary}
        activeTab={summaryTab}
        onTabChange={handleSummaryTab}
      />

      {/* ── FilterBar ── */}
      <NotificationFilterBar
        readStatus={readStatus}
        typeFilter={typeFilter}
        levelFilter={levelFilter}
        periodFilter={periodFilter}
        hasActiveFilter={hasFilter}
        onReadStatusChange={(v) => { setReadStatus(v); setSummaryTab(v === 'unread' ? 'unread' : 'all'); setPage(1); }}
        onTypeFilterChange={(v) => { setTypeFilter(v); setPage(1); }}
        onLevelFilterChange={(v) => { setLevelFilter(v); setPage(1); }}
        onPeriodFilterChange={(v) => { setPeriodFilter(v); setPage(1); }}
        onReset={handleReset}
      />

      {/* ── 목록 ── */}
      {loading || isPending ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <NotificationEmptyState hasFilter={hasFilter} onReset={handleReset} />
      ) : (
        <NotificationList
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
        />
      )}

      {/* ── Pagination ── */}
      {!loading && notifications.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-sm">
          {/* 페이지당 항목 수 */}
          <div className="flex items-center gap-sm">
            <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
              총 {total.toLocaleString()}건
            </span>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value) as LimitOption); setPage(1); }}
                className={[
                  'appearance-none pl-sm pr-[1.75rem] py-xs text-caption rounded-md border',
                  'border-light-border dark:border-dark-border',
                  'bg-light-surface dark:bg-dark-surface',
                  'text-light-textPrimary dark:text-dark-textPrimary',
                  'focus:outline-none focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary',
                ].join(' ')}
                aria-label="페이지당 항목 수"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}개</option>
                ))}
              </select>
              <DownOutlined className="absolute right-xs top-1/2 -translate-y-1/2 text-light-textSecondary dark:text-dark-textSecondary pointer-events-none text-overline" aria-hidden="true" />
            </div>
          </div>

          {/* 페이지 버튼 */}
          {totalPages > 1 && (
            <div className="flex items-center gap-xs">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary disabled:opacity-40 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
                aria-label="이전 페이지"
              >
                <LeftOutlined aria-hidden="true" className="text-caption" />
              </button>

              {buildPageRange(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="w-8 text-center text-caption text-light-textSecondary dark:text-dark-textSecondary">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={[
                      'w-8 h-8 rounded-md text-caption font-medium transition-colors',
                      page === p
                        ? 'bg-light-primary dark:bg-dark-primary text-white'
                        : 'border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary',
                    ].join(' ')}
                    aria-label={`${p} 페이지`}
                    aria-current={page === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary disabled:opacity-40 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
                aria-label="다음 페이지"
              >
                <RightOutlined aria-hidden="true" className="text-caption" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Produce a pagination sequence of page numbers with `'...'` markers to condense long ranges.
 *
 * For totals up to 7 this returns every page; for larger totals it includes the first and last
 * pages, a window around the `current` page, and `'...'` where ranges are collapsed.
 *
 * @param current - The current active page (1-based)
 * @param total - The total number of pages
 * @returns An array of page numbers and `'...'` markers representing the pagination buttons in order
 */
function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3)  pages.push('...');

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
