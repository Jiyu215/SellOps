import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import { ProductsContent } from './ProductsContent';
import { ProductsPageSkeleton } from './ProductsPageSkeleton';

/**
 * Server component that renders the product management page.
 *
 * Renders the dashboard layout and provides a server-side snapshot of product data
 * to the client-side ProductsContent component; wraps the client content in a
 * Suspense boundary with a ProductsPageSkeleton fallback.
 *
 * @returns The React element for the product management page.
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
