import {
  MOCK_KPI_DATA,
  MOCK_DAILY_DATA,
  MOCK_SALES_DATA,
  MOCK_CATEGORY_DATA,
  MOCK_INVENTORY_ITEMS,
  MOCK_ORDERS,
  MOCK_TOP_PRODUCTS,
} from '@/constants/mockData';
import type { DashboardData } from '@/types/dashboard';

/**
 * 대시보드 전체 데이터 로드
 *
 * - 현재: 목 데이터 반환 (실제 API 연동 전 단계)
 * - 추후: fetch('/api/dashboard', { cache: 'no-store' }) 로 교체
 */
export async function getDashboardData(): Promise<DashboardData> {
  // TODO: 실제 API 연동 시 아래로 교체
  // const res = await fetch('/api/dashboard', { cache: 'no-store' });
  // if (!res.ok) throw new Error('대시보드 데이터 로드 실패');
  // return res.json() as Promise<DashboardData>;

  return {
    kpiData: MOCK_KPI_DATA,
    dailyData: MOCK_DAILY_DATA,
    salesData: MOCK_SALES_DATA,
    categoryData: MOCK_CATEGORY_DATA,
    inventoryItems: MOCK_INVENTORY_ITEMS,
    orders: MOCK_ORDERS,
    topProducts: MOCK_TOP_PRODUCTS,
  };
}
