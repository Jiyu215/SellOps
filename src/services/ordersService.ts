import { MOCK_ORDERS_PAGE, MOCK_ORDERS_KPI } from '@/constants/ordersMockData';
import { ORDER_STATUS_MAP, ORDER_STATUS_COLORS } from '@/constants/orderConstants';
import type { OrdersPageData, OrderTrendPoint, OrderStatusStat } from '@/types/orders';
import type { OrderStatusType } from '@/types/dashboard';

/** 최근 N일 일별 주문 추이 집계 */
function buildTrendData(days: number): OrderTrendPoint[] {
  const now = new Date();
  // 날짜 키 → 집계 맵 (오래된 날부터)
  const map = new Map<string, { orders: number; revenue: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, { orders: 0, revenue: 0 });
  }

  for (const order of MOCK_ORDERS_PAGE) {
    const d = new Date(order.createdAt);
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    const existing = map.get(key);
    if (existing) {
      existing.orders  += 1;
      existing.revenue += order.totalAmount;
    }
  }

  return Array.from(map.entries()).map(([date, data]) => ({ date, ...data }));
}

/** 주문 상태별 건수 집계 (count=0 항목 제외) */
function buildStatusStats(): OrderStatusStat[] {
  const counts: Partial<Record<OrderStatusType, number>> = {};
  for (const order of MOCK_ORDERS_PAGE) {
    counts[order.orderStatus] = (counts[order.orderStatus] ?? 0) + 1;
  }

  return (Object.keys(ORDER_STATUS_MAP) as OrderStatusType[])
    .map((status) => ({
      status,
      label: ORDER_STATUS_MAP[status].label,
      count: counts[status] ?? 0,
      color: ORDER_STATUS_COLORS[status],
    }))
    .filter((s) => s.count > 0);
}

/**
 * 주문 관리 페이지 전체 데이터 로드
 *
 * - 현재: 목 데이터 반환 (실제 API 연동 전 단계)
 * - 추후: fetch('/api/orders', { cache: 'no-store' }) 로 교체
 */
export async function getOrdersPageData(): Promise<OrdersPageData> {
  return {
    kpi:         MOCK_ORDERS_KPI,
    trendData:   buildTrendData(30),
    statusStats: buildStatusStats(),
    orders:      MOCK_ORDERS_PAGE,
  };
}
