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

/**
 * Convert an API stock history record into the application's StockHistory shape.
 *
 * @param h - The API stock history record to convert.
 * @param index - Index of the record within the fetched page; used to generate a stable composite `id` when timestamps may collide.
 * @returns The mapped `StockHistory` object. The `id` is formed as `product_id_created_at_index`; `product_id`, `type`, `quantity`, and `created_at` are mapped to `productId`, `type`, `quantity`, and `createdAt` respectively; `reason` becomes `undefined` if absent; `operator` is set to `-`.
 */

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
 * Checks whether a product code is available for use.
 *
 * @param code - The product code to check
 * @param excludeId - Optional product ID to exclude from the check (typically when updating that product)
 * @returns `true` if the code is available, `false` otherwise
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
 * Create a product from form data.
 *
 * Sends the provided form values to the products API to create a new product.
 *
 * @param data - Form values used to create the product
 * @returns An object containing the created product's `id`
 */
export async function createProduct(
  data: ProductFormData,
): Promise<{ id: string }> {
  return apiCreateProduct({
    name:              data.name,
    price:             typeof data.price === 'number' ? data.price : 0,
    product_code:      data.productCode,
    category_id:       data.categoryId || null,
    summary:           data.summary,
    short_description: data.shortDescription,
    description:       data.description,
    status:            data.status,
  });
}

// ── 상품 수정 ─────────────────────────────────────────────────────────────────

/**
 * Update an existing product's fields.
 *
 * Sends a PATCH request that includes only the properties present in `data`.
 *
 * @param id - The product identifier to update
 * @param data - Partial product form data; only provided fields are included in the request. If `price` is not a number it is omitted. If `categoryId` is provided but falsy, it is sent as `null`. Field names are mapped to the API shape (e.g. `productCode` → `product_code`).
 */
export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>,
): Promise<void> {
  await apiUpdateProduct(id, {
    ...(data.name !== undefined             && { name: data.name }),
    ...(typeof data.price === 'number'      && { price: data.price }),
    ...(data.productCode !== undefined      && { product_code: data.productCode }),
    ...(data.categoryId !== undefined       && { category_id: data.categoryId || null }),
    ...(data.summary !== undefined          && { summary: data.summary }),
    ...(data.shortDescription !== undefined && { short_description: data.shortDescription }),
    ...(data.description !== undefined      && { description: data.description }),
    ...(data.status !== undefined           && { status: data.status }),
  });
}

// ── 재고 조정 ─────────────────────────────────────────────────────────────────

/**
 * Adjusts stock for a product.
 *
 * @param id - Product identifier
 * @param type - Adjustment type
 * @param quantity - Quantity to adjust
 * @param reason - Optional reason recorded for the adjustment
 * @returns The updated stock totals: `total`, `sold`, and `available`
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
 * Fetches paginated stock history for a product.
 *
 * @param id - The product identifier
 * @param page - Page number (1-indexed). Defaults to 1
 * @param limit - Number of items per page. Defaults to 20
 * @returns An object with `items` (the requested page of `StockHistory` records) and `total` (the total number of history entries for the product)
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
