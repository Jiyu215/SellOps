'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCartOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { OrderKPI } from '@/types/orders';
import { PROGRESS_ANIMATION_DELAY_MS, KPI_PROGRESS_TRANSITION } from '@/constants/config';

interface OrdersKPIGridProps {
  kpi: OrderKPI;
}

interface KPIItemConfig {
  key: keyof OrderKPI;
  changeKey: keyof OrderKPI;
  title: string;
  icon: React.ReactNode;
  formatValue: (v: number) => string;
  accent: string;        // Tailwind 텍스트 색상 클래스
  progressPercent?: number;
}

/** 원화 간략 포맷 (만원/억원) */
const formatRevenue = (amount: number): string => {
  if (amount >= 100000000) return `₩${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000)     return `₩${Math.round(amount / 10000).toLocaleString()}만`;
  return `₩${amount.toLocaleString()}`;
};

const KPI_ITEMS: KPIItemConfig[] = [
  {
    key: 'totalOrders',
    changeKey: 'totalOrdersChange',
    title: '전체 주문',
    icon: <ShoppingCartOutlined aria-hidden="true" />,
    formatValue: (v) => `${v.toLocaleString()}건`,
    accent: 'text-light-primary dark:text-dark-primary',
  },
  {
    key: 'todayOrders',
    changeKey: 'todayOrdersChange',
    title: '오늘 주문',
    icon: <ClockCircleOutlined aria-hidden="true" />,
    formatValue: (v) => `${v.toLocaleString()}건`,
    accent: 'text-light-info dark:text-dark-info',
  },
  {
    key: 'pendingOrders',
    changeKey: 'pendingOrdersChange',
    title: '처리 대기',
    icon: <ExclamationCircleOutlined aria-hidden="true" />,
    formatValue: (v) => `${v.toLocaleString()}건`,
    accent: 'text-light-warning dark:text-dark-warning',
  },
  {
    key: 'monthRevenue',
    changeKey: 'monthRevenueChange',
    title: '이달 매출',
    icon: <DollarOutlined aria-hidden="true" />,
    formatValue: formatRevenue,
    accent: 'text-light-success dark:text-dark-success',
  },
];

/** 단일 KPI 카드 */
const KPIItem = ({
  config,
  value,
  change,
  progressPercent,
}: {
  config: KPIItemConfig;
  value: number;
  change: number;
  progressPercent?: number;
}) => {
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (progressPercent == null) return;
    const t = setTimeout(
      () => setBarWidth(Math.min(progressPercent, 100)),
      PROGRESS_ANIMATION_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [progressPercent]);

  const isPositive = change >= 0;

  return (
    <article className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md flex flex-col gap-sm hover:-translate-y-0.5 transition-transform duration-200">
      {/* 상단: 아이콘 + 변동률 */}
      <div className="flex items-center justify-between">
        <span className={`text-h5 ${config.accent}`}>{config.icon}</span>
        <span
          className={`inline-flex items-center gap-xs text-caption font-bold px-xs py-[2px] rounded-sm ${
            isPositive
              ? 'bg-green-100 dark:bg-green-900/30 text-light-success dark:text-dark-success'
              : 'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error'
          }`}
        >
          {isPositive ? (
            <ArrowUpOutlined aria-hidden="true" />
          ) : (
            <ArrowDownOutlined aria-hidden="true" />
          )}
          {Math.abs(change)}%
        </span>
      </div>

      {/* 중단: 수치 */}
      <div>
        <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
          {config.title}
        </p>
        <p className={`text-h4 font-bold mt-xs ${config.accent}`}>
          {config.formatValue(value)}
        </p>
      </div>

      {/* 하단: 프로그레스바 (선택적) */}
      {progressPercent != null && (
        <div
          className="w-full h-1.5 rounded-full bg-light-secondary dark:bg-dark-secondary overflow-hidden"
          role="progressbar"
          aria-valuenow={barWidth}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-light-primary dark:bg-dark-primary"
            style={{ width: `${barWidth}%`, transition: KPI_PROGRESS_TRANSITION }}
          />
        </div>
      )}
    </article>
  );
};

/**
 * 주문 관리 KPI 그리드 (4열)
 * - 전체 주문 / 오늘 주문 / 처리 대기 / 이달 매출
 */
export const OrdersKPIGrid = ({ kpi }: OrdersKPIGridProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
    {KPI_ITEMS.map((config) => (
      <KPIItem
        key={config.key}
        config={config}
        value={kpi[config.key] as number}
        change={kpi[config.changeKey] as number}
        progressPercent={config.progressPercent}
      />
    ))}
  </div>
);
