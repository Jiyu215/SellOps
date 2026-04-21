'use server';

import { revalidatePath } from 'next/cache';
import { MOCK_PRODUCT_DETAIL_MAP } from '@/constants/productDetailMockData';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import type { ProductFormData, ProductDetail, ProductListItem } from '@/types/products';

// ── 상품 저장 서버 액션 ───────────────────────────────────────────────────────

/**
 * 상품 생성 또는 수정 서버 액션
 * 실제 서비스: POST /api/products (신규) / PATCH /api/products/:id (수정)
 *
 * @param data         - 폼 데이터
 * @param id           - 수정 시 상품 ID (없으면 신규 생성)
 * @param initialStock - 신규 등록 시 초기 재고 (폼에서 미리 조정한 값)
 */
export async function saveProductAction(
  data: ProductFormData,
  id?: string,
  initialStock?: { total: number; sold: number; available: number },
): Promise<{ id: string; product?: ProductDetail }> {
  const now = new Date().toISOString();

  if (id) {
    // ── 수정 ──────────────────────────────────────────────────────────────────
    const existing = MOCK_PRODUCT_DETAIL_MAP.get(id);
    if (!existing) throw new Error('상품을 찾을 수 없습니다.');

    const updated: ProductDetail = {
      ...existing,
      name:             data.name,
      productCode:      data.productCode,
      price:            typeof data.price === 'number' ? data.price : existing.price,
      summary:          data.summary,
      shortDescription: data.shortDescription,
      description:      data.description,
      status:           data.status,
      updatedAt:        now,
    };
    MOCK_PRODUCT_DETAIL_MAP.set(id, updated);

    // 목록 아이템도 동기화
    const listIdx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (listIdx >= 0) {
      MOCK_PRODUCTS[listIdx] = {
        ...MOCK_PRODUCTS[listIdx],
        name:        data.name,
        productCode: data.productCode,
        price:       typeof data.price === 'number' ? data.price : MOCK_PRODUCTS[listIdx].price,
        status:      data.status,
        updatedAt:   now,
      };
    }

    revalidatePath(`/dashboard/products/${id}`);
    revalidatePath('/dashboard/products');
    return { id, product: updated };
  }

  // ── 신규 생성 ──────────────────────────────────────────────────────────────
  const newId = `prod-${Date.now()}`;

  const newDetail: ProductDetail = {
    id:               newId,
    productCode:      data.productCode,
    name:             data.name,
    category:         '미분류',
    price:            typeof data.price === 'number' ? data.price : 0,
    summary:          data.summary,
    shortDescription: data.shortDescription,
    description:      data.description,
    status:           data.status,
    stock:            initialStock ?? { total: 0, sold: 0, available: 0 },
    images:           [],
    createdAt:        now,
    updatedAt:        now,
    createdBy:        '관리자',
  };
  MOCK_PRODUCT_DETAIL_MAP.set(newId, newDetail);

  const newListItem: ProductListItem = {
    id:             newId,
    productCode:    data.productCode,
    name:           data.name,
    category:       '미분류',
    price:          typeof data.price === 'number' ? data.price : 0,
    totalStock:     initialStock?.total ?? 0,
    availableStock: initialStock?.available ?? 0,
    soldCount:      initialStock?.sold ?? 0,
    status:         data.status,
    thumbnailUrl:   undefined,
    createdAt:      now,
    updatedAt:      now,
  };
  MOCK_PRODUCTS.unshift(newListItem);

  revalidatePath('/dashboard/products');
  return { id: newId, product: newDetail };
}
