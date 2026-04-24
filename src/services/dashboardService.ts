import type { DashboardData } from '@/types/dashboard';

/**
 * 대시보드 전체 데이터 로드
 *
 * - /api/dashboard에서 대시보드 첫 화면 데이터를 조회한다.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const res = await fetch('/api/dashboard', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('대시보드 데이터 로드 실패');
  }

  return res.json() as Promise<DashboardData>;
}
