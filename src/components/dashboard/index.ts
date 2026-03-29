// ── 레이아웃 ──────────────────────────────────────────────────────────────────
export { DashboardLayout } from './DashboardLayout';
export { DashboardContent } from './DashboardContent';

// ── 차트 ──────────────────────────────────────────────────────────────────────
export { SalesShortTermChart, SalesComboChart, CategoryDoughnutChart } from './charts';

// ── KPI 카드 ──────────────────────────────────────────────────────────────────
export { KPICard, KPICardGrid } from './kpi';

// ── 주문 테이블 ───────────────────────────────────────────────────────────────
export { OrderTable } from './orders';

// ── 상품 ──────────────────────────────────────────────────────────────────────
export { TopProductsCard } from './products';

// ── 재고 ──────────────────────────────────────────────────────────────────────
export { LowStockTable } from './inventory';

// ── 스켈레톤 ──────────────────────────────────────────────────────────────────
export {
  DashboardSkeleton,
  KPICardGridSkeleton,
  SalesShortTermChartSkeleton,
  SalesComboChartSkeleton,
  CategoryDoughnutChartSkeleton,
  TopProductsCardSkeleton,
  LowStockTableSkeleton,
  OrderTableSkeleton,
} from './skeletons';
