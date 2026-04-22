import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { ProductsContent } from './ProductsContent';
import { ProductsPageSkeleton } from './ProductsPageSkeleton';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

  const IMAGE_TYPE_PRIORITY = ['list', 'thumbnail', 'small', 'main'] as const;

  const { data: images } = ids.length
    ? await supabaseAdmin
        .from('product_images')
        .select('product_id, type, url')
        .in('product_id', ids)
        .in('type', IMAGE_TYPE_PRIORITY)
    : { data: [] };

  // 상품별로 우선순위(list→thumbnail→small→main) 중 첫 번째 이미지 선택
  const imageMap: Record<string, string> = {};
  for (const priority of IMAGE_TYPE_PRIORITY) {
    for (const img of images ?? []) {
      if (img.type === priority && img.product_id && !(img.product_id in imageMap)) {
        imageMap[img.product_id] = img.url;
      }
    }
  }

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
