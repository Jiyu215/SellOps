'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { OrderTrendPoint } from '@/types/orders';
import type { ChartTooltipProps } from '@/types/charts';
import {
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_TEXT_SECONDARY_HEX,
} from '@/constants/config';

interface OrderTrendChartProps {
  data: OrderTrendPoint[];
}

type TrendPeriod = 7 | 14 | 30;
const PERIOD_OPTIONS: TrendPeriod[] = [7, 14, 30];

/** 금액 포맷 (만원) */
const formatRevenue = (v: number) => `₩${Math.round(v / 10000).toLocaleString()}만`;

// ── 커스텀 툴팁 ───────────────────────────────────────────────────────────────
const TrendTooltip = ({ active, payload, label }: ChartTooltipProps<OrderTrendPoint>) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-lg p-sm text-bodySm min-w-[160px]">
      <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-xs">{label}</p>
      <p className="text-caption font-medium" style={{ color: COLOR_SUCCESS }}>
        주문 수: {point.orders.toLocaleString()}건
      </p>
      <p className="text-caption font-medium mt-xs" style={{ color: COLOR_PRIMARY }}>
        매출: {formatRevenue(point.revenue)}
      </p>
    </div>
  );
};

/**
 * 주문 일별 추이 콤보 차트 (30일 기본)
 * - Bar: 일별 주문 수 (우측 Y, 연두색)
 * - Line: 일별 매출 (좌측 Y, 프라이머리)
 * - 기간 필터: [7일] [14일] [30일]
 */
export const OrderTrendChart = ({ data }: OrderTrendChartProps) => {
  const [period, setPeriod] = useState<TrendPeriod>(30);

  const chartData = useMemo(() => data.slice(-period), [data, period]);

  // 필요 시 클릭된 날짜 상세 조회 확장 가능
  const handleChartClick = () => {};

  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-sm mb-md">
        <div>
          <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            일별 주문 추이
          </h2>
          <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            주문 건수 및 매출 변화
          </p>
        </div>

        {/* 기간 필터 */}
        <div className="flex gap-xs">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                'px-sm py-xs text-caption font-semibold rounded-sm transition-colors',
                period === p
                  ? 'bg-light-primary dark:bg-dark-primary text-white'
                  : 'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary hover:opacity-80',
              ].join(' ')}
            >
              {p}일
            </button>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-md mb-sm flex-wrap">
        <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
          <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLOR_SUCCESS, opacity: 0.7 }} aria-hidden="true" />
          주문 수
        </span>
        <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
          <span className="inline-block w-6 h-0.5 flex-shrink-0" style={{ backgroundColor: COLOR_PRIMARY }} aria-hidden="true" />
          매출
        </span>
      </div>

      <div className="w-full h-52 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 48, left: 0, bottom: 0 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              interval={period === 30 ? 4 : period === 14 ? 1 : 0}
            />
            {/* 매출 Y축 (좌) */}
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tickFormatter={formatRevenue}
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            {/* 주문 수 Y축 (우) */}
            <YAxis
              yAxisId="orders"
              orientation="right"
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TrendTooltip />} />

            {/* 주문 수 막대 */}
            <Bar
              yAxisId="orders"
              dataKey="orders"
              name="주문 수"
              fill={COLOR_SUCCESS}
              radius={[3, 3, 0, 0]}
              opacity={0.65}
            />
            {/* 매출 선 */}
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="매출"
              stroke={COLOR_PRIMARY}
              strokeWidth={2.5}
              dot={{ r: 3, fill: COLOR_PRIMARY, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: COLOR_PRIMARY, stroke: 'white', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
