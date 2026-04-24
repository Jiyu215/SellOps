import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { ProductDetailForm } from '@/components/dashboard/products/ProductDetailForm';
import { getProductCategoryOptions } from '@/dal/categories';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
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
export default async function ProductNewPage() {
  const currentUser = await getDashboardUser();
  const categoryOptions = await getProductCategoryOptions();

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle="새 상품 등록"
      notifications={MOCK_NOTIFICATIONS}
      nativeScroll
    >
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailForm isNew={true} categoryOptions={categoryOptions} />
      </Suspense>
    </DashboardLayout>
  );
}
