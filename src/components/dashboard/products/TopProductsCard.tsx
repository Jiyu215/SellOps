'use client';

import { useEffect, useMemo, useState } from 'react';
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

const getBarColor = (rank: number): string => {
  switch (rank) {
    case 1:
      return 'bg-light-primary dark:bg-dark-primary';
    case 2:
      return 'bg-light-info dark:bg-dark-info';
    case 3:
      return 'bg-light-success dark:bg-dark-success';
    default:
      return 'bg-light-textSecondary dark:bg-dark-textSecondary opacity-50';
  }
};

const formatRevenue = (value: number): string => {
  if (value >= 10_0000_0000_0000_0000) {
    return `₩${(value / 10_0000_0000_0000_0000).toFixed(1)}경`;
  }

  if (value >= 100_000_000) {
    return `₩${(value / 100_000_000).toFixed(1)}억`;
  }

  if (value >= 10_000) {
    return `₩${(value / 10_000).toFixed(1)}만`;
  }

  return `₩${value.toLocaleString('ko-KR')}`;
};

export const TopProductsCard = ({ data }: TopProductsCardProps) => {
  const [period, setPeriod] = useState<TopProductPeriod>('month');

  const products = useMemo<TopProductItem[]>(() => data[period] ?? [], [data, period]);
  const topRevenue = products[0]?.revenue ?? 1;

  const [barWidths, setBarWidths] = useState<number[]>(new Array(5).fill(0));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBarWidths(products.map((product) => Math.round((product.revenue / topRevenue) * 100)));
    }, PROGRESS_ANIMATION_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [products, topRevenue]);

  const handlePeriodChange = (nextPeriod: TopProductPeriod) => {
    setBarWidths(new Array(products.length).fill(0));
    setPeriod(nextPeriod);
  };

  return (
    <section
      className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden h-full flex flex-col"
      aria-label="인기 상품 Top 5"
    >
      <div className="px-md pt-md pb-sm lg:px-sm lg:pt-sm lg:pb-xs xl:px-md xl:pt-md xl:pb-sm border-b border-light-border dark:border-dark-border flex-shrink-0">
        <div className="flex items-center justify-between mb-sm lg:mb-xs xl:mb-sm">
          <h2 className="flex items-center gap-xs text-h6 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            <TrophyOutlined className="text-yellow-500" aria-hidden="true" />
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

      <ul className="divide-y divide-light-border dark:divide-dark-border flex-1 overflow-y-auto">
        {products.map((product, idx) => (
          <li key={product.id}>
            <Link
              href={`/dashboard/products?sku=${product.sku}`}
              className={[
                'flex flex-col gap-xs',
                'px-md py-sm lg:px-sm lg:py-xs xl:px-md xl:py-sm',
                'hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors group',
              ].join(' ')}
            >
              <div className="flex items-center gap-xs sm:gap-sm min-w-0">
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-overline font-bold flex-shrink-0 ${getRankStyle(product.rank)}`}
                  aria-label={`${product.rank}위`}
                >
                  {product.rank}
                </span>

                <span className="flex-1 text-caption sm:text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors min-w-0">
                  {product.productName}
                </span>

                <span className="text-caption sm:text-bodySm font-bold text-light-textPrimary dark:text-dark-textPrimary flex-shrink-0">
                  {formatRevenue(product.revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-xs min-w-0">
                <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary min-w-0">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[product.category] ?? COLOR_TEXT_SECONDARY_HEX }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{product.category}</span>
                </span>

                <div className="flex items-center gap-xs sm:gap-sm flex-shrink-0">
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

                  <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">
                    {product.unitsSold.toLocaleString()}건
                  </span>
                </div>
              </div>

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
