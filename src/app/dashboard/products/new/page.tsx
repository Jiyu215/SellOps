import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { ProductDetailForm } from '@/components/dashboard/products/ProductDetailForm';
import { ProductDetailSkeleton } from '../[id]/ProductDetailSkeleton';

export const metadata = {
  title: '새 상품 등록 | SellOps',
};

/**
 * Render the dashboard page for registering a new product.
 *
 * Renders DashboardLayout populated with mock user and notification data and
 * includes a Suspense-wrapped ProductDetailForm configured for a new-product flow.
 *
 * @returns The page UI for new product registration, with ProductDetailForm rendered with `isNew={true}` and `ProductDetailSkeleton` as the Suspense fallback.
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
