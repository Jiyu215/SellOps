import { DashboardLayout, DashboardSkeleton } from '@/components/dashboard';
import { MOCK_USER } from '@/constants/mockData';

/**
 * Next.js App Router 자동 로딩 UI
 *
 * - 페이지 첫 로드 또는 클라이언트 내비게이션 시 page.tsx 대신 표시
 * - DashboardLayout을 그대로 사용해 사이드바·헤더 레이아웃 유지 (CLS 방지)
 * - DashboardSkeleton: CSS animate-pulse 전용, JS 타이머 없음
 */
export default function DashboardLoading() {
  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="대시보드"
      notifications={[]}
    >
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
