import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { getDashboardUser } from '@/lib/dashboard/currentUser';

/**
 * 대시보드 메인 페이지 (Server Component)
 *
 * - 레이아웃(사이드바·헤더)만 서버에서 렌더링
 * - 실제 콘텐츠는 DashboardContent(Client)가 비동기로 로드
 *   → 데이터 준비 전: DashboardSkeleton 표시
 *   → 데이터 준비 후: 차트·테이블·카드 렌더링
 */
export default async function DashboardPage() {
  const currentUser = await getDashboardUser();

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle="대시보드"
      notifications={MOCK_NOTIFICATIONS}
    >
      <DashboardContent />
    </DashboardLayout>
  );
}
