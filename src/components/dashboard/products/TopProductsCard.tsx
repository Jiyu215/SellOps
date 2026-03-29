'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { TopProductItem, TopProductPeriod } from '@/types/dashboard';
import {
  PROGRESS_ANIMATION_DELAY_MS,
  BAR_PROGRESS_TRANSITION,
  CATEGORY_COLORS,
  COLOR_TEXT_SECONDARY_HEX,
} from '@/constants/config';

interface TopProductsCardProps {
  data: Record<TopProductPeriod, TopProductItem[]>;
}

const PERIOD_LABELS: Record<TopProductPeriod, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
};

/** 순위별 뱃지 스타일 */
const getRankStyle = (rank: number): string => {
  switch (rank) {
    case 1:
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 2:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300';
    case 3:
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    default:
      return 'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary';
  }
};

/** 순위별 프로그레스바 색상 */
const getBarColor = (rank: number): string => {
  switch (rank) {
    case 1:  return 'bg-light-primary dark:bg-dark-primary';
    case 2:  return 'bg-light-info dark:bg-dark-info';
    case 3:  return 'bg-light-success dark:bg-dark-success';
    default: return 'bg-light-textSecondary dark:bg-dark-textSecondary opacity-50';
  }
};

/** 금액 포맷: 만원 단위 */
const formatRevenue = (value: number): string => {
  if (value >= 10000000) return `₩${(value / 10000000).toFixed(1)}천만`;
  return `₩${Math.round(value / 10000).toLocaleString()}만`;
};

/**
 * 인기 상품 Top 5 카드
 *
 * 반응형 전략 (1/3 col 컨테이너 너비 기준):
 *   base / sm / md : 전체 너비 → 여유로운 padding (px-md py-sm)
 *   lg (1024px+)  : 1/3 col ~257px → 컴팩트 padding (px-sm py-xs)
 *   xl (1280px+)  : 1/3 col ~337px → 적당한 padding (px-md py-sm) 복구
 *
 * 기간 필터 버튼 텍스트: overline(10px) → caption(12px) 로 가독성 개선
 * 프로그레스바: 마운트/기간 변경 시 0 → target 애니메이션
 */
export const TopProductsCard = ({ data }: TopProductsCardProps) => {
  const [period, setPeriod] = useState<TopProductPeriod>('month');

  const products = useMemo<TopProductItem[]>(() => data[period], [data, period]);
  const topRevenue = products[0]?.revenue ?? 1;

  /**
   * 프로그레스바 너비 — 0 → target 애니메이션
   * 기간 변경 시 handlePeriodChange 에서 즉시 0으로 리셋
   * useEffect 는 setTimeout 으로만 목표값 세팅
   */
  const [barWidths, setBarWidths] = useState<number[]>(new Array(5).fill(0));

  useEffect(() => {
    const t = setTimeout(() => {
      setBarWidths(products.map((p) => Math.round((p.revenue / topRevenue) * 100)));
    }, PROGRESS_ANIMATION_DELAY_MS);
    return () => clearTimeout(t);
  }, [products, topRevenue]);

  const handlePeriodChange = (key: TopProductPeriod) => {
    setBarWidths(new Array(products.length).fill(0));
    setPeriod(key);
  };

  return (
    <section
      className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden h-full flex flex-col"
      aria-label="인기 상품 Top 5"
    >
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      {/*
        패딩: 모바일/tablet → px-md pt-md pb-sm (여유)
              lg 1/3 narrow → px-sm pt-sm pb-xs (컴팩트)
              xl 1/3 wider  → px-md pt-md pb-sm (복구)
      */}
      <div className="px-md pt-md pb-sm lg:px-sm lg:pt-sm lg:pb-xs xl:px-md xl:pt-md xl:pb-sm border-b border-light-border dark:border-dark-border flex-shrink-0">
        <div className="flex items-center justify-between mb-sm lg:mb-xs xl:mb-sm">
          <h2 className="flex items-center gap-xs text-h6 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            <TrophyOutlined
              className="text-yellow-500"
              aria-hidden="true"
            />
            인기 상품 Top 5
          </h2>
          <Link
            href="/dashboard/products"
            className="flex items-center gap-xs text-caption font-semibold text-light-primary dark:text-dark-primary hover:opacity-75 transition-opacity whitespace-nowrap"
          >
            전체 보기
            <RightOutlined style={{ fontSize: 10 }} aria-hidden="true" />
          </Link>
        </div>

        {/* 기간 필터 탭 — text-caption(12px) for readability */}
        <div className="flex gap-xs">
          {(Object.entries(PERIOD_LABELS) as [TopProductPeriod, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePeriodChange(key)}
              className={[
                'flex-1 py-xs text-caption font-semibold rounded-sm transition-colors',
                period === key
                  ? 'bg-light-primary dark:bg-dark-primary text-white'
                  : 'bg-light-secondary dark:bg-dark-secondary text-light-textSecondary dark:text-dark-textSecondary hover:opacity-80',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 상품 리스트 ──────────────────────────────────────── */}
      {/*
        flex-1: 헤더 아래 남은 공간을 채워 카드가 h-full 높이에 맞게 늘어남
        overflow-y-auto: 콘텐츠가 넘칠 경우 내부 스크롤
      */}
      <ul className="divide-y divide-light-border dark:divide-dark-border flex-1 overflow-y-auto">
        {products.map((product, idx) => (
          <li key={product.id}>
            <Link
              href={`/dashboard/products?sku=${product.sku}`}
              className={[
                'flex flex-col gap-xs',
                // 패딩: 모바일 여유 → lg 컴팩트 → xl 복구
                'px-md py-sm lg:px-sm lg:py-xs xl:px-md xl:py-sm',
                'hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors group',
              ].join(' ')}
            >
              {/* Row 1: 순위 + 제품명 + 매출 */}
              <div className="flex items-center gap-xs sm:gap-sm min-w-0">
                {/* 순위 뱃지 */}
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-overline font-bold flex-shrink-0 ${getRankStyle(product.rank)}`}
                  aria-label={`${product.rank}위`}
                >
                  {product.rank}
                </span>

                {/* 제품명: 항상 truncate, 너비에 맞게 자동 줄임 */}
                <span className="flex-1 text-caption sm:text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors min-w-0">
                  {product.productName}
                </span>

                {/* 매출 금액 */}
                <span className="text-caption sm:text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary flex-shrink-0">
                  {formatRevenue(product.revenue)}
                </span>
              </div>

              {/* Row 2: 카테고리 + 변화율 + 판매 수량 */}
              <div className="flex items-center justify-between gap-xs min-w-0">
                {/* 카테고리 컬러 점 + 텍스트 */}
                <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary min-w-0">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[product.category] ?? COLOR_TEXT_SECONDARY_HEX }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{product.category}</span>
                </span>

                <div className="flex items-center gap-xs sm:gap-sm flex-shrink-0">
                  {/* 전 기간 대비 변화율 */}
                  {product.changePercent !== undefined && (
                    <span
                      className={`flex items-center gap-xs text-caption font-semibold ${
                        product.changePercent >= 0
                          ? 'text-light-success dark:text-dark-success'
                          : 'text-light-error dark:text-dark-error'
                      }`}
                    >
                      {product.changePercent >= 0
                        ? <RiseOutlined aria-hidden="true" />
                        : <FallOutlined aria-hidden="true" />}
                      {Math.abs(product.changePercent)}%
                    </span>
                  )}

                  {/* 판매 수량 */}
                  <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
                    {product.unitsSold.toLocaleString()}건
                  </span>
                </div>
              </div>

              {/* Row 3: 상대 매출 프로그레스바 (1위 기준 %) */}
              <div
                className="w-full h-1 rounded-full bg-light-secondary dark:bg-dark-secondary overflow-hidden"
                role="progressbar"
                aria-valuenow={barWidths[idx] ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${product.productName} 상대 매출 ${barWidths[idx] ?? 0}%`}
              >
                <div
                  className={`h-full rounded-full ${getBarColor(product.rank)}`}
                  style={{
                    width: `${barWidths[idx] ?? 0}%`,
                    transition: BAR_PROGRESS_TRANSITION,
                  }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
