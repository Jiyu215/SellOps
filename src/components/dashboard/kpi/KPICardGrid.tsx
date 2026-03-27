import { KPICard } from './KPICard';
import type { KPICardData } from '@/types/dashboard';

interface KPICardGridProps {
  items: KPICardData[];
}

/**
 * KPI 카드 그리드 영역
 * Mobile: 1열 → md: 2열 → xl: 3열
 */
export const KPICardGrid = ({ items }: KPICardGridProps) => {
  return (
    <section aria-label="KPI 요약">
      {/* 스펙: PC 3열 / 태블릿 2열 / 모바일 1열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
        {items.map((item) => (
          <KPICard key={item.id} data={item} />
        ))}
      </div>
    </section>
  );
};
