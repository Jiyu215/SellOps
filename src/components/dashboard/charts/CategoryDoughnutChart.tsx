'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategoryDataPoint } from '@/types/dashboard';

interface CategoryDoughnutChartProps {
  data: CategoryDataPoint[];
}

/** 커스텀 툴팁 */
const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: CategoryDataPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];

  return (
    <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-lg p-sm text-bodySm">
      <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">{name}</p>
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
        비중:{' '}
        <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">
          {value}%
        </span>
      </p>
    </div>
  );
};

/**
 * 커스텀 범례: 색상 점 + 카테고리명 + 비율
 * gap은 부모 flex 컨테이너에서 처리하므로 mt 불필요
 */
const CustomLegend = ({ data }: { data: CategoryDataPoint[] }) => (
  <ul className="flex flex-col gap-xs w-full">
    {data.map((item) => (
      <li key={item.name} className="flex items-center justify-between gap-sm min-w-0">
        <div className="flex items-center gap-xs min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary truncate">
            {item.name}
          </span>
        </div>
        <span className="text-caption font-semibold text-light-textPrimary dark:text-dark-textPrimary flex-shrink-0">
          {item.value}%
        </span>
      </li>
    ))}
  </ul>
);

/**
 * 카테고리별 비중 도넛 차트
 *
 * 반응형 레이아웃 전략 (1/3 col 컨테이너 너비 기준):
 *   base        : flex-col  — 모바일 (전체 너비 ~344px)
 *   sm (640px+) : flex-row  — 태블릿 (전체 너비 ~570px+, 각 절반 ~280px+)
 *   lg (1024px+): flex-col  — 데스크탑 1/3 col (~257px, flex-row시 각 128px로 너무 좁음)
 *   xl (1280px+): flex-row  — 와이드 데스크탑 1/3 col (~337px, 각 절반 ~168px)
 *
 * 차트 높이:
 *   base  h-44 (176px) · sm h-52 (208px) · lg h-40 (160px) · xl h-52 (208px)
 */
export const CategoryDoughnutChart = ({ data }: CategoryDoughnutChartProps) => {
  return (
    <section
      className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md flex flex-col h-full"
      aria-label="카테고리별 매출 비중"
    >
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-xs mb-sm sm:mb-md">
        <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
          카테고리별 비중
        </h2>
        <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
          이번 달
        </span>
      </div>

      {/*
        콘텐츠 래퍼: flex-1 으로 헤더 아래 모든 공간 사용
        방향 전환: flex-col → sm:flex-row → lg:flex-col → xl:flex-row
      */}
      <div className="flex-1 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-sm sm:gap-md">

        {/* ── 도넛 차트 영역 ── */}
        {/*
          너비: 모바일/lg full → sm/xl 절반
          높이: 각 레이아웃 모드에서 ResponsiveContainer 가 채울 수 있도록 명시
        */}
        <div
          className={[
            'relative flex-shrink-0',
            // 너비: col 모드=전체, row 모드=절반
            'w-full sm:w-1/2 lg:w-full xl:w-1/2',
            // 높이: 각 breakpoint 에서 명시 (ResponsiveContainer height="100%" 사용)
            'h-44 sm:h-52 lg:h-40 xl:h-52',
          ].join(' ')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="78%"
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* 중앙 텍스트: TOTAL CATEGORIES N */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div className="text-center leading-none">
              <p className="text-overline font-semibold text-light-textSecondary dark:text-dark-textSecondary tracking-widest">
                TOTAL
              </p>
              <p className="text-overline font-semibold text-light-textSecondary dark:text-dark-textSecondary tracking-widest mt-[2px]">
                CATEGORIES
              </p>
              {/*
                숫자 크기: lg(좁은 1/3 col)에서는 도넛 홀이 작으므로 한 단계 축소
                base/sm h5(16px) → lg h6(14px) → xl h4(20px) → h5(16px)
              */}
              <p className="text-h5 sm:text-h4 lg:text-h6 xl:text-h4 font-bold text-light-textPrimary dark:text-dark-textPrimary mt-xs">
                {data.length}
              </p>
            </div>
          </div>
        </div>

        {/* ── 범례 ── */}
        {/*
          너비: col 모드=전체, row 모드=절반
          justify-center: col 모드에서 수직 중앙 배치 (여백 균등)
        */}
        <div className="w-full sm:w-1/2 lg:w-full xl:w-1/2 flex flex-col justify-center">
          <CustomLegend data={data} />
        </div>
      </div>
    </section>
  );
};
