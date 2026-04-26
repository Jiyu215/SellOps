import type { DashboardData } from '@/types/dashboard';

interface DashboardOrderQuery {
  search?: string;
  orderStatus?: string;
  page?: number;
  limit?: number;
}

/**
 * Load the initial dashboard data from the backend.
 *
 * The function requests `/api/dashboard` and appends any provided order query
 * parameters (`search`, `orderStatus`, `page`, `limit`) to the request URL.
 *
 * @param query - Optional ordering and pagination filters sent as URL query parameters
 * @returns The dashboard payload parsed from the JSON response as `DashboardData`
 * @throws Error when the HTTP response has a non-OK status
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
