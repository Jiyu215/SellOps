'use client';

import { useState, useCallback } from 'react';
import { ProductTable } from '@/components/dashboard/products';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import type { ProductListItem, ProductStatus } from '@/types/products';

/**
 * 상품 관리 페이지 콘텐츠 (Client Component)
 *
 * useSearchParams(useProductFilter 내부)를 사용하므로 Suspense 바운더리 필요.
 * 실제 서비스에서는 서버 액션 또는 React Query로 데이터를 패칭한다.
 */
export const ProductsContent = () => {
  const [products, setProducts] = useState<ProductListItem[]>(MOCK_PRODUCTS);
  const [exportLoading, setExportLoading] = useState(false);

  const handleBulkStatusChange = useCallback(
    async (ids: string[], status: ProductStatus) => {
      // 실제 서비스: await apiClient.patch('/products/bulk-status', { ids, status })
      setProducts((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status } : p)),
      );
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      // 실제 서비스: await apiClient.delete('/products/bulk', { ids })
      setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
    },
    [],
  );

  const handleSingleDelete = useCallback(
    async (id: string) => {
      // 실제 서비스: await apiClient.delete(`/products/${id}`)
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  return (
    <ProductTable
      products={products}
      onBulkStatusChange={handleBulkStatusChange}
      onBulkDelete={handleBulkDelete}
      onSingleDelete={handleSingleDelete}
      exportLoading={exportLoading}
      onExportLoadingChange={setExportLoading}
    />
  );
};
