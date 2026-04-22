import {
  checkProductCode as apiCheckProductCode,
  adjustStock as apiAdjustStock,
  fetchStockHistory,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
} from '@/features/products/api/productDetail.api';
import type {
  StockHistory as ApiStockHistory,
} from '@/features/products/types/product.type';
import type {
  StockHistory,
  StockAdjustmentType,
  ProductFormData,
} from '@/types/products';

// ── 타입 매핑 헬퍼 ────────────────────────────────────────────────────────────

function mapStockHistory(h: ApiStockHistory, index: number): StockHistory {
  return {
    id:        `${h.product_id}_${h.created_at}_${index}`,
    productId: h.product_id,
    type:      h.type,
    quantity:  h.quantity,
    reason:    h.reason ?? undefined,
    operator:  '-',
    createdAt: h.created_at,
  };
}

// ── 상품코드 중복 확인 ────────────────────────────────────────────────────────

/**
 * 상품코드 중복 확인
 * GET /api/products/check-code?code=...&excludeId=...
 */
export async function checkProductCode(
  code: string,
  excludeId?: string,
): Promise<{ available: boolean }> {
  const available = await apiCheckProductCode(code, excludeId);
  return { available };
}

// ── 상품 생성 ─────────────────────────────────────────────────────────────────

/**
 * 상품 생성
 * POST /api/products
 */
export async function createProduct(
  data: ProductFormData,
): Promise<{ id: string }> {
  return apiCreateProduct({
    name:              data.name,
    price:             typeof data.price === 'number' ? data.price : 0,
    product_code:      data.productCode,
    summary:           data.summary,
    short_description: data.shortDescription,
    description:       data.description,
    status:            data.status,
  });
}

// ── 상품 수정 ─────────────────────────────────────────────────────────────────

/**
 * 상품 수정
 * PATCH /api/products/:id
 */
export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>,
): Promise<void> {
  await apiUpdateProduct(id, {
    ...(data.name !== undefined             && { name: data.name }),
    ...(typeof data.price === 'number'      && { price: data.price }),
    ...(data.productCode !== undefined      && { product_code: data.productCode }),
    ...(data.summary !== undefined          && { summary: data.summary }),
    ...(data.shortDescription !== undefined && { short_description: data.shortDescription }),
    ...(data.description !== undefined      && { description: data.description }),
    ...(data.status !== undefined           && { status: data.status }),
  });
}

// ── 재고 조정 ─────────────────────────────────────────────────────────────────

/**
 * 재고 조정
 * POST /api/products/:id/stock/adjust
 */
export async function adjustStock(
  id: string,
  type: StockAdjustmentType,
  quantity: number,
  reason?: string,
): Promise<{ total: number; sold: number; available: number }> {
  const result = await apiAdjustStock(id, { type, quantity, reason });
  return {
    total:     result.total,
    sold:      result.sold,
    available: result.available,
  };
}

// ── 재고 이력 조회 ────────────────────────────────────────────────────────────

/**
 * 재고 이력 조회
 * GET /api/products/:id/stock/history
 */
export async function getStockHistory(
  id: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ items: StockHistory[]; total: number }> {
  const result = await fetchStockHistory(id, page, limit);
  return {
    items: result.items.map((h, i) => mapStockHistory(h, i)),
    total: result.total,
  };
}
