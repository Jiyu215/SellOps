'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { KPICardGrid } from '@/components/dashboard/kpi/KPICardGrid';
import { SalesShortTermChart } from '@/components/dashboard/charts/SalesShortTermChart';
import { SalesComboChart } from '@/components/dashboard/charts/SalesComboChart';
import { CategoryDoughnutChart } from '@/components/dashboard/charts/CategoryDoughnutChart';
import { LowStockTable } from '@/components/dashboard/inventory/LowStockTable';
import { OrderTable } from '@/components/dashboard/orders/OrderTable';
import { TopProductsCard } from '@/components/dashboard/products/TopProductsCard';
import {
  ErrorBoundary,
  ChartErrorFallback,
  TableErrorFallback,
} from '@/components/ui/ErrorBoundary';
import {
  MOCK_USER,
  MOCK_KPI_DATA,
  MOCK_DAILY_DATA,
  MOCK_SALES_DATA,
  MOCK_CATEGORY_DATA,
  MOCK_INVENTORY_ITEMS,
  MOCK_ORDERS,
  MOCK_TOP_PRODUCTS,
  MOCK_NOTIFICATIONS,
} from '@/constants/mockData';

/**
 * 대시보드 메인 페이지
 *
 * 레이아웃 구조 (세로 순서):
 *  ┌─ KPI 카드 (전체 너비) ─────────────────────────────────┐
 *  ├─ 단기 추이 (전체 너비) ────────────────────────────────┤
 *  ├─ lg:grid-cols-3 ───────────────────────────────────────┤
 *  │  장기 추이 (2/3)          │  카테고리 도넛 (1/3)       │
 *  ├─ lg:grid-cols-3 ───────────────────────────────────────┤
 *  │  인기 상품 Top5 (1/3)     │  재고 부족 현황 (2/3)      │
 *  ├─ 최근 주문 내역 (전체 너비) ────────────────────────────┤
 *  └────────────────────────────────────────────────────────┘
 *
 * Error Boundary 적용 범위:
 *  - Recharts 차트 3종: 데이터 포맷 오류·SVG 렌더링 오류 격리
 *  - 테이블/목록 3종: 필터·페이지네이션 상태 오류 격리
 *  - KPI 카드 그리드: progressbar 애니메이션 오류 격리
 *  각 오류는 해당 섹션만 fallback UI로 대체되며 나머지 페이지는 정상 작동
 */
export default function DashboardPage() {
  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="대시보드"
      notifications={MOCK_NOTIFICATIONS}
    >
      <div className="flex flex-col gap-md sm:gap-lg max-w-screen-2xl mx-auto">

        {/* ── 1. KPI 카드 — 항상 전체 너비 ──────────────── */}
        <ErrorBoundary
          fallbackRender={(reset) => (
            <TableErrorFallback title="KPI 지표" onReset={reset} />
          )}
        >
          <KPICardGrid items={MOCK_KPI_DATA} />
        </ErrorBoundary>

        {/* ── 2. 단기 추이 — 항상 전체 너비 ─────────────── */}
        <ErrorBoundary
          fallbackRender={(reset) => (
            <ChartErrorFallback title="주간 매출/주문" onReset={reset} />
          )}
        >
          <SalesShortTermChart data={MOCK_DAILY_DATA} />
        </ErrorBoundary>

        {/* ── 3. 장기 추이 + 카테고리 도넛 (높이 일치: items-stretch) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-stretch">
          <div className="lg:col-span-2">
            <ErrorBoundary
              fallbackRender={(reset) => (
                <ChartErrorFallback title="월간 매출" onReset={reset} />
              )}
            >
              <SalesComboChart data={MOCK_SALES_DATA} />
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-1">
            <ErrorBoundary
              fallbackRender={(reset) => (
                <ChartErrorFallback title="카테고리별 비중" onReset={reset} />
              )}
            >
              <CategoryDoughnutChart data={MOCK_CATEGORY_DATA} />
            </ErrorBoundary>
          </div>
        </div>

        {/* ── 4. 인기 상품 + 재고 부족 현황 (동일선상 배치) ── */}
        {/*
          lg↑: 좌 1/3 TopProducts + 우 2/3 LowStock
          lg↓: 세로 스택 (모바일·태블릿)
          items-start: 카드 높이가 다를 때 상단 정렬 유지
        */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md sm:gap-lg items-stretch">
          <div className="lg:col-span-1">
            <ErrorBoundary
              fallbackRender={(reset) => (
                <TableErrorFallback title="인기 상품 Top 5" onReset={reset} />
              )}
            >
              <TopProductsCard data={MOCK_TOP_PRODUCTS} />
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-2 min-w-0">
            <ErrorBoundary
              fallbackRender={(reset) => (
                <TableErrorFallback title="재고 부족 현황" onReset={reset} />
              )}
            >
              <LowStockTable items={MOCK_INVENTORY_ITEMS} />
            </ErrorBoundary>
          </div>
        </div>

        {/* ── 5. 최근 주문 내역 — 항상 전체 너비 ─────────── */}
        <ErrorBoundary
          fallbackRender={(reset) => (
            <TableErrorFallback title="최근 주문 내역" onReset={reset} />
          )}
        >
          <OrderTable orders={MOCK_ORDERS} />
        </ErrorBoundary>

      </div>
    </DashboardLayout>
  );
}
