import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { ProductDetailForm } from '@/components/dashboard/products/ProductDetailForm';
import { ProductDetailSkeleton } from '../[id]/ProductDetailSkeleton';

export const metadata = {
  title: '새 상품 등록 | SellOps',
};

/**
 * 상품 신규 등록 페이지 (Server Component)
 *
 * - product prop 없음 → isNew=true
 * - ProductDetailForm이 클라이언트 컴포넌트이므로 Suspense로 감쌈.
 */
export default function ProductNewPage() {
  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="새 상품 등록"
      notifications={MOCK_NOTIFICATIONS}
      nativeScroll
    >
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailForm isNew={true} />
      </Suspense>
    </DashboardLayout>
  );
}
