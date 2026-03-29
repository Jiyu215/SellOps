'use client';

import { useState, useEffect, Suspense } from 'react';
import { getDashboardData } from '@/services/dashboardService';
import { DashboardSkeleton, OrderTableSkeleton } from '@/components/dashboard/skeletons';
import { KPICardGrid } from '@/components/dashboard/kpi';
import { SalesShortTermChart, SalesComboChart, CategoryDoughnutChart } from '@/components/dashboard/charts';
import { LowStockTable } from '@/components/dashboard/inventory';
import { OrderTable } from '@/components/dashboard/orders';
import { TopProductsCard } from '@/components/dashboard/products';
import {
  ErrorBoundary,
  ChartErrorFallback,
  TableErrorFallback,
} from '@/components/ui/ErrorBoundary';
import type { DashboardData } from '@/types/dashboard';

/**
 * 대시보드 콘텐츠 클라이언트 컴포넌트
 *
 * 역할:
 * - 마운트 시 getDashboardData() 호출 (비동기)
 * - 데이터 로드 완료 전: DashboardSkeleton 표시
 * - 데이터 로드 완료 후: 실제 컴포넌트 렌더링
 *
 * 성능 고려:
 * - useState 초기값 null → 스켈레톤 즉시 렌더 (레이아웃 시프트 없음)
 * - useEffect 1회 실행, 언마운트 시 응답 무시 (클린업)
 * - ErrorBoundary로 각 섹션 오류 격리
 */
export const DashboardContent = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDashboardData().then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // 데이터 로드 전: 스켈레톤
  if (data === null) {
    return <DashboardSkeleton />;
  }

  // 데이터 로드 후: 실제 콘텐츠
  return (
    <div className="flex flex-col gap-md sm:gap-lg max-w-screen-2xl mx-auto">

      {/* ── 1. KPI 카드 ──────────────────────────────────────── */}
      <ErrorBoundary
        fallbackRender={(reset) => (
          <TableErrorFallback title="KPI 지표" onReset={reset} />
        )}
      >
        <KPICardGrid items={data.kpiData} />
      </ErrorBoundary>

      {/* ── 2. 단기 추이 ─────────────────────────────────────── */}
      <ErrorBoundary
        fallbackRender={(reset) => (
          <ChartErrorFallback title="주간 매출/주문" onReset={reset} />
        )}
      >
        <SalesShortTermChart data={data.dailyData} />
      </ErrorBoundary>

      {/* ── 3. 장기 추이 + 카테고리 도넛 ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-stretch">
        <div className="lg:col-span-2">
          <ErrorBoundary
            fallbackRender={(reset) => (
              <ChartErrorFallback title="월간 매출" onReset={reset} />
            )}
          >
            <SalesComboChart data={data.salesData} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-1">
          <ErrorBoundary
            fallbackRender={(reset) => (
              <ChartErrorFallback title="카테고리별 비중" onReset={reset} />
            )}
          >
            <CategoryDoughnutChart data={data.categoryData} />
          </ErrorBoundary>
        </div>
      </div>

      {/* ── 4. 인기 상품 + 재고 부족 현황 ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md sm:gap-lg items-stretch">
        <div className="lg:col-span-1">
          <ErrorBoundary
            fallbackRender={(reset) => (
              <TableErrorFallback title="인기 상품 Top 5" onReset={reset} />
            )}
          >
            <TopProductsCard data={data.topProducts} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-2 min-w-0">
          <ErrorBoundary
            fallbackRender={(reset) => (
              <TableErrorFallback title="재고 부족 현황" onReset={reset} />
            )}
          >
            <LowStockTable items={data.inventoryItems} />
          </ErrorBoundary>
        </div>
      </div>

      {/* ── 5. 최근 주문 내역 ────────────────────────────────── */}
      {/*
        useSearchParams()를 사용하는 OrderTable은 Suspense 바운더리 필수
        (Next.js App Router 요구사항 — SSR 중 서스펜드 허용)
        fallback: OrderTableSkeleton으로 레이아웃 시프트 방지
      */}
      <Suspense fallback={<OrderTableSkeleton />}>
        <ErrorBoundary
          fallbackRender={(reset) => (
            <TableErrorFallback title="최근 주문 내역" onReset={reset} />
          )}
        >
          <OrderTable orders={data.orders} />
        </ErrorBoundary>
      </Suspense>

    </div>
  );
};
