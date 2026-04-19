import type { Order } from '@/types/dashboard';

// ── 주문 관리 페이지 KPI ────────────────────────────────────────────────────
export interface OrderKPI {
  /** 전체 주문 수 */
  totalOrders: number;
  /** 전체 주문 수 — 전월 대비 변화율 (%) */
  totalOrdersChange: number;
  /** 오늘 신규 주문 수 */
  todayOrders: number;
  /** 오늘 주문 수 — 전일 대비 변화율 (%) */
  todayOrdersChange: number;
  /** 처리 대기 주문 수 (pending + paid) */
  pendingOrders: number;
  /** 처리 대기 — 전일 대비 변화율 (%) */
  pendingOrdersChange: number;
  /** 이번 달 총 매출 (원) */
  monthRevenue: number;
  /** 이번 달 매출 — 전월 대비 변화율 (%) */
  monthRevenueChange: number;
}

// ── 일별 주문 추이 ─────────────────────────────────────────────────────────
export interface OrderTrendPoint {
  /** 'MM/DD' 형식 날짜 라벨 */
  date: string;
  orders: number;
  revenue: number;
}

// ── 주문 상태별 통계 (차트용 — status는 표시 전용 문자열) ────────────────────
export interface OrderStatusStat {
  status: string;
  label: string;
  count: number;
  color: string;
}

// ── 주문 관리 페이지 전체 데이터 ──────────────────────────────────────────
export interface OrdersPageData {
  kpi: OrderKPI;
  /** 최근 30일 일별 추이 */
  trendData: OrderTrendPoint[];
  /** 상태별 건수 (count > 0인 항목만) */
  statusStats: OrderStatusStat[];
  /** 전체 주문 목록 */
  orders: Order[];
}
