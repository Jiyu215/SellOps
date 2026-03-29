'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
import type { SalesDataPoint } from '@/types/dashboard';
import type {
  ChartPeriod,
  EnrichedSalesPoint,
  SelectedMonthDetail,
  ChartTooltipProps,
} from '@/types/charts';
import {
  CHART_PERIOD_OPTIONS,
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_WARNING,
  COLOR_TEXT_SECONDARY_HEX,
} from '@/constants/config';

interface SalesComboChartProps {
  /** 전체 24개월 데이터 — 기간 슬라이싱은 컴포넌트 내부에서 처리 */
  data: SalesDataPoint[];
}

/** 금액 포맷 (만원 단위) */
const formatRevenue = (value: number) => `₩${(value / 10000).toFixed(0)}만`;

/** 전월/전년 대비 변화율 (소수점 1자리) */
const calcChange = (current: number, prev: number) =>
  Math.round(((current - prev) / prev) * 1000) / 10;

// ── 커스텀 툴팁 ─────────────────────────────────────────

const LongTermTooltip = ({ active, payload, label }: ChartTooltipProps<EnrichedSalesPoint>) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const achievementRate = Math.round((point.revenue / point.target) * 100);

  return (
    <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-lg p-sm text-bodySm min-w-[208px]">
      <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-xs">{label}</p>

      {/* 매출 + 목표 달성률 */}
      <p className="text-caption font-medium" style={{ color: COLOR_PRIMARY }}>
        매출: {formatRevenue(point.revenue)}
      </p>
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
        목표: {formatRevenue(point.target)}
        <span
          className={`ml-xs font-semibold ${
            achievementRate >= 100
              ? 'text-light-success dark:text-dark-success'
              : 'text-light-warning dark:text-dark-warning'
          }`}
        >
          ({achievementRate}% 달성)
        </span>
      </p>

      {/* 전월/전년 대비 */}
      {point.mom !== null && (
        <p
          className={`text-caption font-semibold ${
            point.mom >= 0
              ? 'text-light-success dark:text-dark-success'
              : 'text-light-error dark:text-dark-error'
          }`}
        >
          전월 대비: {point.mom >= 0 ? '+' : ''}{point.mom}%
        </p>
      )}
      {point.yoy !== null && (
        <p
          className={`text-caption font-semibold ${
            point.yoy >= 0
              ? 'text-light-success dark:text-dark-success'
              : 'text-light-error dark:text-dark-error'
          }`}
        >
          전년 동월: {point.yoy >= 0 ? '+' : ''}{point.yoy}%
        </p>
      )}

      <div className="my-xs border-t border-light-border dark:border-dark-border" />

      {/* 주문 수 */}
      <p className="text-caption font-medium" style={{ color: COLOR_SUCCESS }}>
        주문 수: {point.orders.toLocaleString()}건
      </p>

      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
        클릭하여 상세 확인
      </p>
    </div>
  );
};

/**
 * 장기 추이 Combo Chart — 최근 6/12개월
 *
 * - 기간 필터: [6개월] [12개월]
 * - Line: 월별 실제 매출 (좌측 Y, 메인 트렌드)
 * - Line: 목표 매출 점선 (좌측 Y, 달성 기준)
 * - Bar: 월별 주문 수 (우측 Y, 보조 지표)
 * - 헤더: 표시 기간 평균 달성률 표시
 * - 툴팁: 전월·전년 동월 대비 성장률, 달성률 표시
 * - 그래프 클릭 → 월별 상세 패널 + 상세 리포트 링크
 */
export const SalesComboChart = ({ data }: SalesComboChartProps) => {
  const [period, setPeriod] = useState<ChartPeriod>(12);
  const [selectedDetail, setSelectedDetail] = useState<SelectedMonthDetail | null>(null);

  /** 전체 데이터에 전월·전년 변화율 사전 계산 */
  const enrichedAll = useMemo<EnrichedSalesPoint[]>(
    () =>
      data.map((d, i) => ({
        ...d,
        mom: i > 0 ? calcChange(d.revenue, data[i - 1].revenue) : null,
        yoy: i >= 12 ? calcChange(d.revenue, data[i - 12].revenue) : null,
      })),
    [data],
  );

  /** 기간 슬라이싱 */
  const chartData = useMemo<EnrichedSalesPoint[]>(
    () => enrichedAll.slice(-period),
    [enrichedAll, period],
  );

  /** 표시 기간 평균 달성률 */
  const avgAchievementRate = useMemo(
    () =>
      Math.round(
        chartData.reduce((sum, d) => sum + (d.revenue / d.target) * 100, 0) / chartData.length,
      ),
    [chartData],
  );

  /** 차트 영역 클릭 → 월별 상세 패널 토글 */
  const handleChartClick = (state: { activeTooltipIndex?: number }) => {
    const chartIndex = state?.activeTooltipIndex;
    if (typeof chartIndex !== 'number') return;
    const fullIndex = enrichedAll.length - period + chartIndex;
    setSelectedDetail((prev) =>
      prev?.fullIndex === fullIndex ? null : { fullIndex, point: enrichedAll[fullIndex] },
    );
  };

  const handlePeriodChange = (p: ChartPeriod) => {
    setPeriod(p);
    setSelectedDetail(null);
  };

  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-xs mb-md">
        <div>
          <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            월간 매출
          </h2>
          <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
            월별 매출과 주문 추세, 목표 대비 성과 확인
          </p>
        </div>

        {/* 평균 달성률 + 기간 필터 */}
        <div className="flex items-center gap-sm flex-wrap">
          {/* 평균 달성률 뱃지 */}
          <div className="flex items-center gap-xs bg-light-secondary dark:bg-dark-secondary rounded-sm px-sm py-xs">
            <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
              평균 달성률
            </span>
            <span
              className={`text-caption font-bold ${
                avgAchievementRate >= 100
                  ? 'text-light-success dark:text-dark-success'
                  : 'text-light-warning dark:text-dark-warning'
              }`}
            >
              {avgAchievementRate}%
            </span>
          </div>

          {/* 기간 필터 */}
          <div className="flex gap-xs">
            {CHART_PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={[
                  'px-sm py-xs text-caption font-semibold rounded-sm transition-colors',
                  period === p
                    ? 'bg-light-primary dark:bg-dark-primary text-white'
                    : 'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary hover:opacity-80',
                ].join(' ')}
              >
                {p}개월
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-md mb-sm flex-wrap">
        <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
          <span className="inline-block w-6 h-0.5 bg-[#5D5FEF] flex-shrink-0" aria-hidden="true" />
          실제 매출
        </span>
        <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
          <span className="inline-block w-6 h-px bg-[#FFC107] flex-shrink-0" aria-hidden="true" style={{ borderTop: `2px dashed ${COLOR_WARNING}`, height: 0 }} />
          목표 매출
        </span>
        <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#28A745] opacity-70 flex-shrink-0" aria-hidden="true" />
          주문 수
        </span>
        <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
          · 클릭 시 월별 상세
        </span>
      </div>

      <div className="w-full h-56 sm:h-72 md:h-80" style={{ cursor: 'pointer' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
            onClick={handleChartClick as (state: object) => void}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tickFormatter={formatRevenue}
              tick={{ fontSize: 12, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              tick={{ fontSize: 12, fill: COLOR_TEXT_SECONDARY_HEX }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<LongTermTooltip />} />

            {/* 주문 수 막대 (배경에 배치, 우측 Y축) */}
            <Bar
              yAxisId="orders"
              dataKey="orders"
              name="주문 수"
              fill={COLOR_SUCCESS}
              radius={[3, 3, 0, 0]}
              opacity={0.55}
            />

            {/* 목표 매출 점선 */}
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="target"
              name="목표 매출"
              stroke={COLOR_WARNING}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />

            {/* 실제 매출 선 (전경, 좌측 Y축) */}
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="실제 매출"
              stroke={COLOR_PRIMARY}
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLOR_PRIMARY, stroke: 'white', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: COLOR_PRIMARY, stroke: 'white', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 선택 월 상세 패널 */}
      {selectedDetail && (
        <div className="mt-md p-md rounded-md bg-light-secondary dark:bg-dark-secondary border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
              {selectedDetail.point.month} 상세
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="text-h5 leading-none text-light-textSecondary dark:text-dark-textSecondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary transition-colors"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {/* 매출 */}
            <div>
              <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mb-xs">
                매출
              </p>
              <p className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
                {formatRevenue(selectedDetail.point.revenue)}
              </p>
            </div>

            {/* 목표 달성률 */}
            <div>
              <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mb-xs">
                목표 달성률
              </p>
              <p
                className={`text-bodySm font-bold ${
                  selectedDetail.point.revenue >= selectedDetail.point.target
                    ? 'text-light-success dark:text-dark-success'
                    : 'text-light-warning dark:text-dark-warning'
                }`}
              >
                {Math.round(
                  (selectedDetail.point.revenue / selectedDetail.point.target) * 100,
                )}%
              </p>
            </div>

            {/* 주문 수 */}
            <div>
              <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mb-xs">
                주문 수
              </p>
              <p className="text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary">
                {selectedDetail.point.orders.toLocaleString()}건
              </p>
            </div>

            {/* 전월 대비 */}
            {selectedDetail.point.mom !== null ? (
              <div>
                <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mb-xs">
                  전월 대비
                </p>
                <p
                  className={`text-bodySm font-bold ${
                    selectedDetail.point.mom >= 0
                      ? 'text-light-success dark:text-dark-success'
                      : 'text-light-error dark:text-dark-error'
                  }`}
                >
                  {selectedDetail.point.mom >= 0 ? '+' : ''}{selectedDetail.point.mom}%
                </p>
              </div>
            ) : (
              <div />
            )}

            {/* 전년 동월 대비 */}
            {selectedDetail.point.yoy !== null && (
              <div>
                <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mb-xs">
                  전년 동월
                </p>
                <p
                  className={`text-bodySm font-bold ${
                    selectedDetail.point.yoy >= 0
                      ? 'text-light-success dark:text-dark-success'
                      : 'text-light-error dark:text-dark-error'
                  }`}
                >
                  {selectedDetail.point.yoy >= 0 ? '+' : ''}{selectedDetail.point.yoy}%
                </p>
              </div>
            )}
          </div>

          {/* 상세 리포트 이동 */}
          <div className="mt-sm pt-sm border-t border-light-border dark:border-dark-border flex justify-end">
            <Link
              href="/dashboard/analytics"
              className="text-caption font-semibold text-light-primary dark:text-dark-primary hover:opacity-80 transition-opacity"
            >
              상세 리포트 보기 →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};
