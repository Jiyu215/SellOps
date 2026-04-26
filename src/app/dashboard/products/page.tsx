import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProductsContent } from './ProductsContent';
import { ProductsPageSkeleton } from './ProductsPageSkeleton';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProductListItem, ProductStatus } from '@/types/products';

/**
 * Render the products management page with an initial list of products loaded from the database.
 *
 * Fetches the current dashboard user and initial notifications, loads products (with stock fields)
 * and one prioritized image per product (priority: list → thumbnail → small → main), converts
 * database rows into `ProductListItem` entries, and renders the dashboard layout containing
 * `ProductsContent` preloaded with those items.
 *
 * @returns A React element containing the dashboard layout and products content populated with the initial product list.
 */
export default async function ProductsPage() {
  const [currentUser, notifications] = await Promise.all([
    getDashboardUser(),
    getInitialNotifications(),
  ]);
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('products_with_stock')
    .select('id, name, price, product_code, status, created_at, updated_at, stock_total, stock_sold, stock_available')
    .order('created_at', { ascending: false });

  const ids = (items ?? []).map(p => p.id).filter((id): id is string => id !== null);

  const IMAGE_TYPE_PRIORITY = ['list', 'thumbnail', 'small', 'main'] as const;

  const { data: images } = ids.length
    ? await getSupabaseAdmin()
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
      currentUser={currentUser}
      pageTitle="상품 관리"
      notifications={notifications}
    >
      <Suspense fallback={<ProductsPageSkeleton />}>
        <ProductsContent initialProducts={initialProducts} />
      </Suspense>
    </DashboardLayout>
  );
}
