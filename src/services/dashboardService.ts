import type { DashboardData } from '@/types/dashboard';

interface DashboardOrderQuery {
  search?: string;
  orderStatus?: string;
  page?: number;
  limit?: number;
}

/**
 * 대시보드 전체 데이터 로드
 *
 * - /api/dashboard에서 대시보드 첫 화면 데이터를 조회한다.
 * - 주문 테이블은 search/orderStatus/page/limit 쿼리를 함께 전달한다.
 */
export async function getDashboardData(query: DashboardOrderQuery = {}): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.orderStatus) params.set('orderStatus', query.orderStatus);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/dashboard${suffix}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('대시보드 데이터 로드 실패');
  }

  return res.json() as Promise<DashboardData>;
}
