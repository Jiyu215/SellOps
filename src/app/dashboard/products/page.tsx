import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import { ProductsContent } from './ProductsContent';
import { ProductsPageSkeleton } from './ProductsPageSkeleton';

/**
 * 상품 관리 페이지 (Server Component)
 *
 * - DashboardLayout: 사이드바 + 헤더 공통 레이아웃
 * - ProductsContent: 클라이언트 컴포넌트 (useSearchParams → Suspense 필요)
 * - MOCK_PRODUCTS를 직접 읽어 initialProducts로 전달 →
 *   saveProductAction + revalidatePath 후 서버 재렌더 시 최신 목록 반영
 */
export default function ProductsPage() {
  // 서버 측 현재 목록 스냅샷 (revalidatePath 로 갱신됨)
  const initialProducts = [...MOCK_PRODUCTS];

  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="상품 관리"
      notifications={MOCK_NOTIFICATIONS}
    >
      <Suspense fallback={<ProductsPageSkeleton />}>
        <ProductsContent initialProducts={initialProducts} />
      </Suspense>
    </DashboardLayout>
  );
}
