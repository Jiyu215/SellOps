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
        <KPICardGrid items={MOCK_KPI_DATA} />

        {/* ── 2. 단기 추이 — 항상 전체 너비 ─────────────── */}
        <SalesShortTermChart data={MOCK_DAILY_DATA} />

        {/* ── 3. 장기 추이 + 카테고리 도넛 (높이 일치: items-stretch) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-stretch">
          <div className="lg:col-span-2">
            <SalesComboChart data={MOCK_SALES_DATA} />
          </div>
          <div className="lg:col-span-1">
            <CategoryDoughnutChart data={MOCK_CATEGORY_DATA} />
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
            <TopProductsCard data={MOCK_TOP_PRODUCTS} />
          </div>
          <div className="lg:col-span-2 min-w-0">
            <LowStockTable items={MOCK_INVENTORY_ITEMS} />
          </div>
        </div>

        {/* ── 5. 최근 주문 내역 — 항상 전체 너비 ─────────── */}
        <OrderTable orders={MOCK_ORDERS} />

      </div>
    </DashboardLayout>
  );
}
