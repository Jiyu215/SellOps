import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/skeletons';
import { MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { getDashboardUser } from '@/lib/dashboard/currentUser';

/**
 * 대시보드 메인 페이지 (Server Component)
 *
 * - 레이아웃은 서버에서 렌더링
 * - 실제 콘텐츠는 DashboardContent(Client)가 비동기로 로드
 * - useSearchParams 기반 주문 필터를 위해 Suspense로 감싼다
 */
export default async function DashboardPage() {
  const currentUser = await getDashboardUser();

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle="대시보드"
      notifications={MOCK_NOTIFICATIONS}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}
