import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { getProductDetail } from '@/services/productDetailService';
import { ProductDetailContent } from './ProductDetailContent';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Create the page title metadata for a product detail page.
 *
 * Fetches the product by `id` and returns a title using the product name when found,
 * otherwise returns a default title of "상품 상세".
 *
 * @param params - A Promise resolving to an object with the route `id` string
 * @returns The page title: `${product.name} | SellOps` if the product exists, otherwise `상품 상세`
 */
export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id }  = await params;
  const product = await getProductDetail(id);
  return {
    title: product ? `${product.name} | SellOps` : '상품 상세',
  };
}

/**
 * Render the product detail page for the provided route params.
 *
 * @param params - A promise that resolves to route parameters containing the `id` of the product to load.
 * @returns The React element for the product detail page. Triggers a 404 response if the product cannot be found.
 */
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id }  = await params;
  const product = await getProductDetail(id);

  if (!product) notFound();

  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle={product.name}
      notifications={MOCK_NOTIFICATIONS}
      nativeScroll
    >
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent product={product} />
      </Suspense>
    </DashboardLayout>
  );
}
