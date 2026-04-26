import Link from 'next/link';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { InventoryItem, RiskLevel } from '@/types/dashboard';
import { CATEGORY_COLORS, COLOR_TEXT_SECONDARY_HEX } from '@/constants/config';

interface LowStockTableProps {
  items: InventoryItem[];
}

const RISK_CONFIG: Record<RiskLevel, {
  label: string;
  badgeClass: string;
  barColor: string;
  statusText: string;
  statusColor: string;
  icon: React.ReactNode;
}> = {
  critical: {
    label: 'CRITICAL',
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error',
    barColor: 'bg-light-error dark:bg-dark-error',
    statusText: '즉시 재고 필요',
    statusColor: 'text-light-error dark:text-dark-error',
    icon: <ExclamationCircleOutlined aria-hidden="true" />,
  },
  warning: {
    label: 'WARNING',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-light-warning dark:text-dark-warning',
    barColor: 'bg-light-warning dark:bg-dark-warning',
    statusText: '보충 권장',
    statusColor: 'text-light-warning dark:text-dark-warning',
    icon: <WarningOutlined aria-hidden="true" />,
  },
  low: {
    label: 'LOW RISK',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-light-success dark:text-dark-success',
    barColor: 'bg-light-success dark:bg-dark-success',
    statusText: '재고 양호',
    statusColor: 'text-light-success dark:text-dark-success',
    icon: <CheckCircleOutlined aria-hidden="true" />,
  },
};

/** 카테고리 썸네일 아이콘 영역 */
const CategoryThumbnail = ({ category }: { category: string }) => {
  const color = CATEGORY_COLORS[category] ?? COLOR_TEXT_SECONDARY_HEX;
  return (
    <div
      className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 text-h5 font-bold"
      style={{ backgroundColor: `${color}18`, color }}
      aria-hidden="true"
    >
      {category.charAt(0)}
    </div>
  );
};

/** 리스크 게이지 바 */
const RiskGaugeBar = ({ current, min, barColor }: { current: number; min: number; barColor: string }) => {
  const ratio = Math.min((current / Math.max(min, 1)) * 100, 100);
  return (
    <div className="w-full bg-light-secondary dark:bg-dark-secondary rounded-full h-2" aria-hidden="true">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${ratio}%` }}
      />
    </div>
  );
};

/**
 * 재고 부족 현황 카드
 * - 헤더: 제목 + ACTION REQUIRED 뱃지 + 전체 보기 링크
 * - 본문: 카드 그리드(PC 2열 / 모바일 1열)
 * - 카드: 썸네일 + 제품명 + 리스크레벨 + 게이지바 + 잔여
 */
export const LowStockTable = ({ items }: LowStockTableProps) => {
  const criticalCount = items.filter((i) => i.riskLevel === 'critical').length;

  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md h-full">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-sm mb-md">
        <div className="flex items-center gap-sm flex-wrap">
          <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            재고 부족 현황
          </h2>
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-xs text-caption font-bold px-sm py-xs rounded-full bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error animate-pulse">
              <ExclamationCircleOutlined aria-hidden="true" />
              ACTION REQUIRED
            </span>
          )}
        </div>

        <Link
          href="/dashboard/products?sort=available_asc"
          className="inline-flex items-center gap-xs text-caption font-semibold text-light-primary dark:text-dark-primary hover:opacity-70 transition-opacity"
          aria-label="상품관리 전체 보기"
        >
          전체 보기
          <RightOutlined aria-hidden="true" />
        </Link>
      </div>

      {/* 재고 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        {items.map((item) => {
          const config = RISK_CONFIG[item.riskLevel];
          return (
            <article
              key={item.id}
              className="border border-light-border dark:border-dark-border rounded-lg p-md flex flex-col gap-sm"
              aria-label={`${item.productName} 재고 현황`}
            >
              {/* 상단: 카테고리 썸네일 + 제품명 */}
              <div className="flex items-start gap-sm">
                <CategoryThumbnail category={item.category} />
                <div className="min-w-0 flex-1">
                  <p className="text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary line-clamp-2 leading-snug">
                    {item.productName}
                  </p>
                  <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
                    {item.category}
                  </p>
                </div>
              </div>

              {/* 중단: 리스크 라벨 + 상태 텍스트 */}
              <div className="flex items-center justify-between gap-xs">
                <span
                  className={`inline-flex items-center gap-xs text-caption font-bold px-sm py-xs rounded-full flex-shrink-0 ${config.badgeClass}`}
                >
                  {config.icon}
                  {config.label}
                </span>
                <span className={`text-caption font-semibold text-right ${config.statusColor}`}>
                  {config.statusText}
                </span>
              </div>

              {/* 하단: 재고 게이지바 */}
              <RiskGaugeBar
                current={item.currentStock}
                min={item.minStock}
                barColor={config.barColor}
              />

              {/* 최하단: 잔여 재고 */}
              <div className="flex items-center justify-between">
                <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
                  잔여:{' '}
                  <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                    {item.currentStock}{item.unit}
                  </span>
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
