'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DotItemDotProps } from 'recharts';
import type { DailyDataPoint } from '@/types/dashboard';
import type { ChartTooltipProps, EnrichedDailyPoint } from '@/types/charts';
import {
  CHART_ANOMALY_THRESHOLD,
  COLOR_ERROR,
  COLOR_INFO,
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_TEXT_SECONDARY_HEX,
} from '@/constants/config';

interface SalesShortTermChartProps {
  data: DailyDataPoint[];
}

export const calcChange = (current: number, prev: number): number | null => {
  if (prev === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return Math.round((((current - prev) / prev) * 100) * 10) / 10;
};

const formatRevenue = (value: number): string => {
  if (value >= 10_000_000_000_000_000) {
    return `₩${(value / 10_000_000_000_000_000).toFixed(1)}경`;
  }

  if (value >= 100_000_000) {
    return `₩${(value / 100_000_000).toFixed(1)}억`;
  }

  if (value >= 10_000) {
    return `₩${(value / 10_000).toFixed(1)}만`;
  }

  return `₩${value.toLocaleString('ko-KR')}`;
};

const formatChange = (value: number | null) => {
  if (value === null) return '-';
  return `${value >= 0 ? '+' : ''}${value}%`;
};

export const formatOperationalChange = (
  current: number,
  previous: number,
  fallbackChange: number | null,
) => {
  if (current !== previous) {
    return formatChange(calcChange(current, previous));
  }

  if (fallbackChange !== null) return formatChange(fallbackChange);
  return '0%';
};

const changeTextClass = (value: number | null) => {
  if (value === null) return 'text-light-textSecondary dark:text-dark-textSecondary';
  return value >= 0
    ? 'text-light-success dark:text-dark-success'
    : 'text-light-error dark:text-dark-error';
};

const ShortTermTooltip = ({ active, payload, label }: ChartTooltipProps<EnrichedDailyPoint>) => {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="min-w-[196px] rounded-md border border-light-border bg-light-surface p-sm text-bodySm shadow-lg dark:border-dark-border dark:bg-dark-surface">
      <div className="mb-xs flex items-center justify-between">
        <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">{label}</p>
        {point.isToday && (
          <span className="rounded-sm bg-light-primary px-xs py-xs text-overline font-bold text-white dark:bg-dark-primary">
            오늘
          </span>
        )}
      </div>

      <div className="mb-xs space-y-xs">
        <p className="text-caption font-medium" style={{ color: COLOR_PRIMARY }}>
          매출: {formatRevenue(point.revenue)}
        </p>
        <p className={`text-caption font-semibold ${changeTextClass(point.changeRevenue)}`}>
          전일 대비 {formatOperationalChange(point.revenue, point.previousRevenue, point.changeRevenue)}
          {point.changeRevenue !== null && Math.abs(point.changeRevenue) >= CHART_ANOMALY_THRESHOLD && (
            <span className="ml-xs">{point.changeRevenue >= 0 ? '급등' : '급감'}</span>
          )}
        </p>
      </div>

      <div className="my-xs border-t border-light-border dark:border-dark-border" />

      <div className="mb-xs space-y-xs">
        <p className="text-caption font-medium" style={{ color: COLOR_INFO }}>
          주문 수: {point.orders.toLocaleString('ko-KR')}건
        </p>
        <p className={`text-caption font-semibold ${changeTextClass(point.changeOrders)}`}>
          전일 대비 {formatOperationalChange(point.orders, point.previousOrders, point.changeOrders)}
        </p>
      </div>
    </div>
  );
};

const buildRevenueDotRenderer = (
  enriched: EnrichedDailyPoint[],
): ((props: DotItemDotProps) => React.ReactElement) => {
  function RevenueDot({ cx, cy, index }: DotItemDotProps): React.ReactElement {
    if (cx == null || cy == null) return <g />;

    const point = enriched[index];
    if (!point) return <g />;

    if (point.changeRevenue !== null && Math.abs(point.changeRevenue) >= CHART_ANOMALY_THRESHOLD) {
      const color = point.changeRevenue >= 0 ? COLOR_SUCCESS : COLOR_ERROR;
      return (
        <g key={`dot-${index}`}>
          <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.18} />
          <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
        </g>
      );
    }

    if (point.isToday) {
      return (
        <circle
          key={`dot-${index}`}
          cx={cx}
          cy={cy}
          r={5}
          fill={COLOR_PRIMARY}
          stroke="white"
          strokeWidth={2}
        />
      );
    }

    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={3}
        fill={COLOR_PRIMARY}
        stroke="white"
        strokeWidth={1}
      />
    );
  }

  return RevenueDot;
};

export const buildEnrichedDailyData = (data: DailyDataPoint[]): EnrichedDailyPoint[] =>
  data.map((point, index, arr) => ({
    ...point,
    previousRevenue: index > 0 ? arr[index - 1].revenue : 0,
    previousOrders: index > 0 ? arr[index - 1].orders : 0,
    changeRevenue: index > 0 ? calcChange(point.revenue, arr[index - 1].revenue) : null,
    changeOrders: index > 0 ? calcChange(point.orders, arr[index - 1].orders) : null,
    isToday: index === arr.length - 1,
  }));

export const SalesShortTermChart = ({ data }: SalesShortTermChartProps) => {
  const enriched = useMemo<EnrichedDailyPoint[]>(() => buildEnrichedDailyData(data), [data]);
  const revenueDotRenderer = useMemo(() => buildRevenueDotRenderer(enriched), [enriched]);

  return (
    <section className="rounded-lg bg-light-surface p-md shadow-md dark:bg-dark-surface">
      <div className="mb-md flex flex-wrap items-start justify-between gap-sm">
        <div>
          <h2 className="text-h6 font-bold text-light-textPrimary dark:text-dark-textPrimary sm:text-h5">
            주간 매출/주문
          </h2>
          <p className="mt-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
            최근 일주일간 매출과 주문 변화를 확인합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-md">
          <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
            <span className="inline-block h-0.5 w-6 flex-shrink-0 bg-[#5D5FEF]" aria-hidden="true" />
            매출
          </span>
          <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
            <span className="inline-block h-0.5 w-6 flex-shrink-0 bg-[#17A2B8]" aria-hidden="true" />
            주문 수
          </span>
          <span className="flex items-center gap-xs text-caption text-light-success dark:text-dark-success">
            <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full bg-[#28A745]" aria-hidden="true" />
            급등
          </span>
          <span className="flex items-center gap-xs text-caption text-light-error dark:text-dark-error">
            <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full bg-[#DC3545]" aria-hidden="true" />
            급감
          </span>
        </div>
      </div>

      <div className="h-56 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={enriched} margin={{ top: 16, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tickFormatter={formatRevenue}
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={78}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<ShortTermTooltip />} />

            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="매출"
              stroke={COLOR_PRIMARY}
              strokeWidth={2.5}
              dot={revenueDotRenderer}
              activeDot={{ r: 6, fill: COLOR_PRIMARY, stroke: 'white', strokeWidth: 2 }}
            />

            <Line
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              name="주문 수"
              stroke={COLOR_INFO}
              strokeWidth={2}
              dot={{ r: 3, fill: COLOR_INFO, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
