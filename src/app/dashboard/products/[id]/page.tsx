import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { getProductCategoryOptions } from '@/dal/categories';
import { getProductById } from '@/dal/products';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications';
import { ProductDetailContent } from './ProductDetailContent';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generate page metadata for the product detail page.
 *
 * @param params - Parameters object (resolves to an `{ id: string }`) used to identify the product
 * @returns An object with a `title` string: `${product.name} | SellOps` when the product exists, otherwise `'상품 상세'`
 */
export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id }  = await params;
  const product = await getProductById(id);
  return {
    title: product ? `${product.name} | SellOps` : '상품 상세',
  };
}

/**
 * Renders the product detail page for a given product id.
 *
 * Fetches the product, current dashboard user, product category options, and initial notifications;
 * if the product does not exist, triggers a 404 response.
 *
 * @param params - An object (awaitable) that yields `{ id: string }` identifying the product to display.
 * @returns The rendered page element containing the dashboard layout and product detail content.
 */
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const [product, currentUser, categoryOptions, notifications] = await Promise.all([
    getProductById(id),
    getDashboardUser(),
    getProductCategoryOptions(),
    getInitialNotifications(),
  ]);

  if (!product) notFound();

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle={product.name}
      notifications={notifications}
      nativeScroll
    >
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent product={product} categoryOptions={categoryOptions} />
      </Suspense>
    </DashboardLayout>
  );
}
