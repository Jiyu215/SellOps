import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { ProductsContent } from './ProductsContent';
import { ProductsPageSkeleton } from './ProductsPageSkeleton';
import { createClient } from '@/lib/supabase/server';
import type { ProductListItem, ProductStatus } from '@/types/products';

/**
 * 상품 관리 페이지 (Server Component)
 *
 * - Supabase에서 직접 상품 목록을 조회하여 initialProducts로 전달
 * - revalidatePath 후 서버 재렌더 시 최신 목록 자동 반영
 */
export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('products_with_stock')
    .select('id, name, price, product_code, status, created_at, updated_at, stock_total, stock_sold, stock_available')
    .order('created_at', { ascending: false });

  const ids = (items ?? []).map(p => p.id).filter((id): id is string => id !== null);

  const { data: images } = ids.length
    ? await supabase
        .from('product_images')
        .select('product_id, url')
        .in('product_id', ids)
        .eq('type', 'list')
    : { data: [] };

  const imageMap = Object.fromEntries(
    (images ?? []).map(img => [img.product_id, img.url])
  );

  const initialProducts: ProductListItem[] = (items ?? []).map(item => ({
    id: item.id ?? '',
    productCode: item.product_code ?? '',
    name: item.name ?? '',
    category: '',
    price: item.price ?? 0,
    totalStock: item.stock_total ?? 0,
    availableStock: item.stock_available ?? 0,
    soldCount: item.stock_sold ?? 0,
    status: (item.status as ProductStatus) ?? 'active',
    thumbnailUrl: item.id ? (imageMap[item.id] ?? undefined) : undefined,
    createdAt: item.created_at ?? '',
    updatedAt: item.updated_at ?? '',
  }));

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
