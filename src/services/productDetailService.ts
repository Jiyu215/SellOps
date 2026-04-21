import {
  MOCK_PRODUCT_DETAIL_MAP,
  MOCK_STOCK_HISTORY,
} from '@/constants/productDetailMockData';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import type {
  ProductDetail,
  ProductFormData,
  StockHistory,
  StockAdjustmentType,
} from '@/types/products';

// ── 상품 상세 조회 ────────────────────────────────────────────────────────────

/**
 * 상품 상세 조회
 * 실제 서비스: GET /api/products/:id
 *
 * 상세 데이터가 없는 경우 목록 데이터를 기반으로 기본 상세 정보를 생성하여 반환한다.
 * 이를 통해 목록의 모든 상품이 상세 페이지로 진입 가능하다.
 */
export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const detail = MOCK_PRODUCT_DETAIL_MAP.get(id);
  if (detail) return detail;

  // 목록 데이터로 기본 상세 정보 생성 (폴백)
  const listItem = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!listItem) return null;

  const generated: ProductDetail = {
    id:               listItem.id,
    productCode:      listItem.productCode,
    name:             listItem.name,
    category:         listItem.category,
    price:            listItem.price,
    summary:          '',
    shortDescription: '',
    description:      '',
    status:           listItem.status,
    stock: {
      total:     listItem.totalStock,
      sold:      listItem.soldCount,
      available: listItem.availableStock,
    },
    images:    [],
    createdAt: listItem.createdAt,
    updatedAt: listItem.updatedAt,
    createdBy: '관리자',
  };

  // 이후 조회 시 캐싱
  MOCK_PRODUCT_DETAIL_MAP.set(id, generated);
  return generated;
}

// ── 상품코드 중복 확인 ────────────────────────────────────────────────────────

/**
 * 상품코드 중복 확인
 * 실제 서비스: GET /api/products/check-code?code=...&excludeId=...
 */
export async function checkProductCode(
  code: string,
  excludeId?: string,
): Promise<{ available: boolean }> {
  // Mock: prod-001의 코드인 KB-MXS-BLK은 이미 사용 중 (자기 자신 수정 시엔 제외)
  const usedCodes = new Set([
    ...MOCK_PRODUCTS
      .filter((p) => p.id !== excludeId)
      .map((p) => p.productCode),
    ...[...MOCK_PRODUCT_DETAIL_MAP.values()]
      .filter((p) => p.id !== excludeId)
      .map((p) => p.productCode),
  ]);
  return { available: !usedCodes.has(code) };
}

// ── 상품 생성 ─────────────────────────────────────────────────────────────────

/**
 * 상품 생성
 * 실제 서비스: POST /api/products
 */
export async function createProduct(
  _data: ProductFormData,
): Promise<{ id: string }> {
  // Mock: 고정 ID 반환
  const newId = `prod-${Date.now()}`;
  return { id: newId };
}

// ── 상품 수정 ─────────────────────────────────────────────────────────────────

/**
 * 상품 수정
 * 실제 서비스: PATCH /api/products/:id
 */
export async function updateProduct(
  _id: string,
  _data: Partial<ProductFormData>,
): Promise<void> {
  // Mock: no-op
}

// ── 재고 조정 ─────────────────────────────────────────────────────────────────

/**
 * 재고 조정
 * 실제 서비스: POST /api/products/:id/stock/adjust
 */
export async function adjustStock(
  id: string,
  type: StockAdjustmentType,
  quantity: number,
  _reason?: string,
): Promise<{ total: number; sold: number; available: number }> {
  const product = MOCK_PRODUCT_DETAIL_MAP.get(id);
  if (!product) throw new Error('상품을 찾을 수 없습니다.');

  const next = { ...product.stock };
  if (type === 'in') {
    next.total     += quantity;
    next.available += quantity;
  } else {
    if (quantity > next.available) {
      throw new Error('가용 재고보다 많은 수량입니다.');
    }
    next.available -= quantity;
  }
  return next;
}

// ── 재고 이력 조회 ────────────────────────────────────────────────────────────

/**
 * 재고 이력 조회
 * 실제 서비스: GET /api/products/:id/stock/history
 */
export async function getStockHistory(
  _id: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ items: StockHistory[]; total: number }> {
  const start = (page - 1) * limit;
  const items = MOCK_STOCK_HISTORY.slice(start, start + limit);
  return { items, total: MOCK_STOCK_HISTORY.length };
}
