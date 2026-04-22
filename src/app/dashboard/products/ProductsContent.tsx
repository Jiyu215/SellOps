'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProductTable } from '@/components/dashboard/products';
import type { ProductListItem, ProductStatus } from '@/types/products';

interface ProductsContentProps {
  /** 서버에서 전달된 최신 상품 목록 (없으면 클라이언트 목 사용) */
  initialProducts?: ProductListItem[];
}

export const ProductsContent = ({ initialProducts }: ProductsContentProps) => {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>(
    () => initialProducts ?? [],
  );
  const [exportLoading, setExportLoading] = useState(false);

  const handleBulkStatusChange = useCallback(
    async (ids: string[], status: ProductStatus) => {
      const res = await fetch('/api/products/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? '상태 변경에 실패했습니다.');
      }
      setProducts((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status } : p)),
      );
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      const res = await fetch('/api/products/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? '삭제에 실패했습니다.');
      }
      setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
      router.refresh();
    },
    [router],
  );

  const handleSingleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? '삭제에 실패했습니다.');
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    },
    [router],
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
