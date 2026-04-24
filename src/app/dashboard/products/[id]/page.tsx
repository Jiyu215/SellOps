import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { getProductCategoryOptions } from '@/dal/categories';
import { getProductById } from '@/dal/products';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { ProductDetailContent } from './ProductDetailContent';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 상품 상세·수정 페이지 (Server Component)
 *
 * - params는 Next.js 16 비동기 타입으로 await 처리.
 * - 존재하지 않는 상품 ID → notFound() 호출.
 */
export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id }  = await params;
  const product = await getProductById(id);
  return {
    title: product ? `${product.name} | SellOps` : '상품 상세',
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id }  = await params;
  const product = await getProductById(id);
  const currentUser = await getDashboardUser();
  const categoryOptions = await getProductCategoryOptions();

  if (!product) notFound();

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle={product.name}
      notifications={MOCK_NOTIFICATIONS}
      nativeScroll
    >
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent product={product} categoryOptions={categoryOptions} />
      </Suspense>
    </DashboardLayout>
  );
}
