'use client';

import { ProductDetailForm } from '@/components/dashboard/products/ProductDetailForm';
import type { ProductDetail } from '@/types/products';

interface ProductDetailContentProps {
  product: ProductDetail;
}

/**
 * 상품 상세·수정 콘텐츠 (Client Component)
 *
 * useRouter 등 클라이언트 API를 사용하는 ProductDetailForm을 감싸는
 * 얇은 래퍼 레이어.
 */
export const ProductDetailContent = ({ product }: ProductDetailContentProps) => {
  return <ProductDetailForm product={product} isNew={false} />;
};
