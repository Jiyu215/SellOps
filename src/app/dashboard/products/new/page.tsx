import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProductDetailForm } from '@/components/dashboard/products/ProductDetailForm';
import { getProductCategoryOptions } from '@/dal/categories';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications';
import { ProductDetailSkeleton } from '../[id]/ProductDetailSkeleton';

export const metadata = {
  title: '새 상품 등록 | SellOps',
};

/**
 * Renders the dashboard page for creating a new product.
 *
 * Fetches the current dashboard user, product category options, and initial notifications in parallel,
 * then renders DashboardLayout with those values. Inside the layout, renders ProductDetailForm with
 * `isNew=true` and the fetched `categoryOptions`, wrapped in a Suspense that falls back to
 * ProductDetailSkeleton while the client component loads.
 *
 * @returns A React element representing the "new product" dashboard page.
 */
export default async function ProductNewPage() {
  const [currentUser, categoryOptions, notifications] = await Promise.all([
    getDashboardUser(),
    getProductCategoryOptions(),
    getInitialNotifications(),
  ]);

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle="새 상품 등록"
      notifications={notifications}
      nativeScroll
    >
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailForm isNew={true} categoryOptions={categoryOptions} />
      </Suspense>
    </DashboardLayout>
  );
}
