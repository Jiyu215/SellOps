'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DotItemDotProps } from 'recharts';
import type { DailyDataPoint } from '@/types/dashboard';
import type { EnrichedDailyPoint, ChartTooltipProps } from '@/types/charts';
import {
  CHART_ANOMALY_THRESHOLD,
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_INFO,
  COLOR_WARNING,
  COLOR_ERROR,
  COLOR_TEXT_SECONDARY_HEX,
} from '@/constants/config';

interface SalesShortTermChartProps {
  data: DailyDataPoint[];
}

/** 전일 대비 증감률 (소수점 1자리) */
const calcChange = (current: number, prev: number) =>
  Math.round(((current - prev) / prev) * 1000) / 10;

/** 금액 포맷 (만원) */
const formatRevenue = (value: number) => `₩${(value / 10000).toFixed(0)}만`;

// ── 커스텀 툴팁 ──────────────────────────────────────────

const ShortTermTooltip = ({ active, payload, label }: ChartTooltipProps<EnrichedDailyPoint>) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-lg p-sm text-bodySm min-w-[196px]">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between mb-xs">
        <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">{label}</p>
        {point.isToday && (
          <span className="text-overline font-bold bg-light-primary dark:bg-dark-primary text-white px-xs py-xs rounded-sm">
            오늘
          </span>
        )}
      </div>

      {/* 매출 */}
      <div className="space-y-xs mb-xs">
        <p className="text-caption font-medium" style={{ color: COLOR_PRIMARY }}>
          매출: {formatRevenue(point.revenue)}
        </p>
        {point.changeRevenue !== null && (
          <p
            className={`text-caption font-semibold ${
              point.changeRevenue >= 0
                ? 'text-light-success dark:text-dark-success'
                : 'text-light-error dark:text-dark-error'
            }`}
          >
            전일 대비 {point.changeRevenue >= 0 ? '+' : ''}{point.changeRevenue}%
            {Math.abs(point.changeRevenue) >= CHART_ANOMALY_THRESHOLD && (
              <span className="ml-xs">
                {point.changeRevenue >= 0 ? '▲ GROWTH' : '▼ DROP'}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="border-t border-light-border dark:border-dark-border my-xs" />

      {/* 주문 수 */}
      <div className="space-y-xs mb-xs">
        <p className="text-caption font-medium" style={{ color: COLOR_INFO }}>
          주문 수: {point.orders.toLocaleString()}건
        </p>
        {point.changeOrders !== null && (
          <p
            className={`text-caption font-semibold ${
              point.changeOrders >= 0
                ? 'text-light-success dark:text-dark-success'
                : 'text-light-error dark:text-dark-error'
            }`}
          >
            전일 대비 {point.changeOrders >= 0 ? '+' : ''}{point.changeOrders}%
          </p>
        )}
      </div>

      <div className="border-t border-light-border dark:border-dark-border my-xs" />

      {/* 재고 위험 */}
      <p className="text-caption font-medium" style={{ color: COLOR_WARNING }}>
        재고 위험: {point.stockRiskCount}품목
      </p>
    </div>
  );
};

// ── 커스텀 점 렌더러 빌더 (이상치 강조) ─────────────────
/**
 * enriched 배열을 클로저로 캡처하는 named dot 렌더러 생성.
 * named function expression을 반환하여 react/display-name ESLint 규칙 준수.
 * DotItemDotProps: Recharts가 dot 렌더 함수에 전달하는 공식 타입 (cx, cy: number | undefined, index: number)
 */
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
          {/* 외곽 반투명 원 — 이상치 시각 강조 */}
          <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.18} />
          <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
        </g>
      );
    }
    if (point.isToday) {
      return (
        <circle
          key={`dot-${index}`}
          cx={cx} cy={cy} r={5}
          fill={COLOR_PRIMARY} stroke="white" strokeWidth={2}
        />
      );
    }
    return (
      <circle
        key={`dot-${index}`}
        cx={cx} cy={cy} r={3}
        fill={COLOR_PRIMARY} stroke="white" strokeWidth={1}
      />
    );
  }
  return RevenueDot;
};

/**
 * 단기 추이 차트 — 최근 7일, 선 그래프 전용
 *
 * - Line 1: 일별 매출 (좌측 Y, 이상치는 큰 컬러 점으로 강조)
 * - Line 2: 일별 주문 수 (우측 Y)
 * - Line 3: 재고 위험 품목 수 (숨김 Y축, 경고색)
 * - 목표선 없이 실제 수치만 표시
 * - 마지막 점(오늘) = KPI 카드 값과 연동
 */
export const SalesShortTermChart = ({ data }: SalesShortTermChartProps) => {
  const enriched = useMemo<EnrichedDailyPoint[]>(
    () =>
      data.map((d, i, arr) => ({
        ...d,
        changeRevenue: i > 0 ? calcChange(d.revenue, arr[i - 1].revenue) : null,
        changeOrders:  i > 0 ? calcChange(d.orders,  arr[i - 1].orders)  : null,
        isToday: i === arr.length - 1,
      })),
    [data],
  );

  const revenueDotRenderer = useMemo(
    () => buildRevenueDotRenderer(enriched),
    [enriched],
  );

  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
      {/* 헤더 */}
      <div className="flex items-start justify-between flex-wrap gap-sm mb-md">
        <div>
          <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            주간 매출/주문
          </h2>
          <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            최근 일주일간 매출과 주문 변화
          </p>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-md flex-wrap">
          <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
            <span className="inline-block w-6 h-0.5 bg-[#5D5FEF] flex-shrink-0" aria-hidden="true" />
            매출
          </span>
          <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
            <span className="inline-block w-6 h-0.5 bg-[#17A2B8] flex-shrink-0" aria-hidden="true" />
            주문 수
          </span>
          <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
            <span className="inline-block w-6 h-0.5 bg-[#FFC107] flex-shrink-0 border-t border-dashed border-[#FFC107]" aria-hidden="true" style={{ borderStyle: 'dashed' }} />
            재고 위험
          </span>
          <span className="flex items-center gap-xs text-caption text-light-success dark:text-dark-success">
            <span className="inline-block w-3 h-3 rounded-full bg-[#28A745] flex-shrink-0" aria-hidden="true" />
            급등
          </span>
          <span className="flex items-center gap-xs text-caption text-light-error dark:text-dark-error">
            <span className="inline-block w-3 h-3 rounded-full bg-[#DC3545] flex-shrink-0" aria-hidden="true" />
            급감
          </span>
        </div>
      </div>

      <div className="w-full h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={enriched} margin={{ top: 16, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
            />
            {/* 매출 Y축 (좌) */}
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tickFormatter={formatRevenue}
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={68}
            />
            {/* 주문 수 Y축 (우) */}
            <YAxis
              yAxisId="orders"
              orientation="right"
              tick={{ fontSize: 11, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            {/* 재고 위험 Y축 (숨김, 독립 스케일) */}
            <YAxis
              yAxisId="stock"
              hide
              domain={[3, 12]}
            />
            <Tooltip content={<ShortTermTooltip />} />

            {/* 매출 선 — 이상치는 큰 컬러 점, 오늘은 강조 점 */}
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

            {/* 주문 수 선 */}
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

            {/* 재고 위험 품목 수 선 (점선, 경고색) */}
            <Line
              yAxisId="stock"
              type="monotone"
              dataKey="stockRiskCount"
              name="재고 위험"
              stroke={COLOR_WARNING}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: COLOR_WARNING, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
