import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { ProductsContent } from './ProductsContent';
import { ProductsPageSkeleton } from './ProductsPageSkeleton';

/**
 * 상품 관리 페이지 (Server Component)
 *
 * - DashboardLayout: 사이드바 + 헤더 공통 레이아웃
 * - ProductsContent: 클라이언트 컴포넌트 (useSearchParams → Suspense 필요)
 */
export default function ProductsPage() {
  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="상품 관리"
      notifications={MOCK_NOTIFICATIONS}
    >
      <Suspense fallback={<ProductsPageSkeleton />}>
        <ProductsContent />
      </Suspense>
    </DashboardLayout>
  );
}
