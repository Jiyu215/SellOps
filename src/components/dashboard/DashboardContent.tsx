'use client';

import { useEffect, useState } from 'react';
import { getDashboardData } from '@/services/dashboardService';
import { DashboardSkeleton } from '@/components/dashboard/skeletons';
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
import { useOrderFilter } from '@/hooks/useOrderFilter';
import type { DashboardData } from '@/types/dashboard';

/**
 * 대시보드 콘텐츠 클라이언트 컴포넌트
 *
 * 역할:
 * - 마운트 후 getDashboardData() 호출 (비동기)
 * - 주문 테이블 검색/상태/페이지 쿼리를 API에 전달
 * - 데이터 로드 전에는 DashboardSkeleton 표시
 * - 데이터 로드 후에는 실제 컴포넌트 렌더링
 */
export const DashboardContent = () => {
  const { filter, currentPage, setCurrentPage } = useOrderFilter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDashboardData({
      search:      filter.search,
      orderStatus: filter.orderStatus === 'all' ? '' : filter.orderStatus,
      page:        currentPage,
      limit:       5,
    }).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [filter.search, filter.orderStatus, currentPage]);

  if (data === null) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-md sm:gap-lg max-w-screen-2xl mx-auto">
      <ErrorBoundary
        fallbackRender={(reset) => (
          <TableErrorFallback title="KPI 지표" onReset={reset} />
        )}
      >
        <KPICardGrid items={data.kpiData} />
      </ErrorBoundary>

      <ErrorBoundary
        fallbackRender={(reset) => (
          <ChartErrorFallback title="주간 매출/주문" onReset={reset} />
        )}
      >
        <SalesShortTermChart data={data.dailyData} />
      </ErrorBoundary>

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

      <ErrorBoundary
        fallbackRender={(reset) => (
          <TableErrorFallback title="최근 주문 내역" onReset={reset} />
        )}
      >
        <OrderTable
          orders={data.orders}
          pagination={{
            total: data.ordersPagination.total,
            page: data.ordersPagination.page,
            limit: data.ordersPagination.limit,
            onPageChange: setCurrentPage,
          }}
        />
      </ErrorBoundary>
    </div>
  );
};
