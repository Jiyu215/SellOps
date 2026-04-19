'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { OrderStatusStat } from '@/types/orders';

interface OrderStatusChartProps {
  data: OrderStatusStat[];
}

/** 퍼센트 포맷 */
const pct = (count: number, total: number) =>
  total === 0 ? '0%' : `${Math.round((count / total) * 100)}%`;

/**
 * 주문 상태 분포 도넛 차트
 * - 중앙에 전체 건수 표시
 * - 하단 범례: 색상 + 상태명 + 건수 + 비율
 */
export const OrderStatusChart = ({ data }: OrderStatusChartProps) => {
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

  return (
    <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md h-full flex flex-col">
      {/* 헤더 */}
      <div className="mb-md flex-shrink-0">
        <h2 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
          주문 상태 분포
        </h2>
        <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
          상태별 주문 건수 비중
        </p>
      </div>

      {/* 도넛 차트 */}
      <div className="relative w-full h-44 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              dataKey="count"
              nameKey="label"
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const n = typeof value === 'number' ? value : Number(value);
                return [`${n.toLocaleString()}건 (${pct(n, total)})`, String(name)];
              }}
              contentStyle={{
                background: 'var(--color-surface, #fff)',
                border: '1px solid var(--color-border, #e0e0e0)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary">
            {total.toLocaleString()}
          </span>
          <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
            전체 주문
          </span>
        </div>
      </div>

      {/* 범례 */}
      <ul className="mt-sm flex-1 space-y-xs overflow-y-auto">
        {data.map((item) => (
          <li key={item.status} className="flex items-center justify-between gap-sm">
            <span className="flex items-center gap-xs text-caption text-light-textSecondary dark:text-dark-textSecondary min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="flex items-center gap-xs flex-shrink-0">
              <span className="text-caption font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                {item.count.toLocaleString()}건
              </span>
              <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary w-8 text-right">
                {pct(item.count, total)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
