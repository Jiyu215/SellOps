import type {
  ProductDetail,
  ProductCreateBody,
  ProductUpdateBody,
  StockAdjustBody,
  StockHistory,
} from '@/features/products/types/product.type'

/**
 * Fetches detailed information for a product by its ID.
 *
 * @param id - The product's unique identifier
 * @returns The product detail object
 * @throws Error('NOT_FOUND') when the product does not exist (HTTP 404)
 * @throws Error('상품 조회 실패') for other HTTP error responses
 */
export async function fetchProductDetail(id: string): Promise<ProductDetail> {
  const res = await fetch(`/api/products/${id}`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error('상품 조회 실패')
  }
  return res.json()
}

/**
 * Creates a new product.
 *
 * @param body - Product creation payload
 * @returns An object containing the created product's `id`
 * @throws Error if the server responds with an error; message is the server-provided `error` or '상품 등록 실패'
 */
export async function createProduct(body: ProductCreateBody): Promise<{ id: string }> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '상품 등록 실패')
  }
  return res.json()
}

/**
 * Updates an existing product by its identifier.
 *
 * @param id - The product identifier
 * @param body - The update payload containing product fields to change
 * @throws Error - Throws `Error('상품 수정 실패')` when the server responds with a non-OK status
 */
export async function updateProduct(id: string, body: ProductUpdateBody): Promise<void> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('상품 수정 실패')
}

/**
 * Determines whether a product code is available.
 *
 * @param code - The product code to check for availability
 * @param excludeId - Optional product ID to exclude from the check (useful when validating an existing product)
 * @returns `true` if the code is available, `false` otherwise
 */
export async function checkProductCode(
  code: string,
  excludeId?: string
): Promise<boolean> {
  const params = new URLSearchParams({ code })
  if (excludeId) params.set('excludeId', excludeId)
  const res = await fetch(`/api/products/check-code?${params}`)
  const { available } = await res.json()
  return available
}

/**
 * Uploads an image file for a product.
 *
 * @param productId - The product identifier to attach the image to
 * @param file - The image file to upload
 * @param type - A string describing the image category or role
 * @param order - Optional display order for the image
 * @returns The created image resource returned by the server
 * @throws Error when the server responds with a non-OK status; message is the server `error` field or `"이미지 업로드 실패"`
 */
export async function uploadImage(
  productId: string,
  file: File,
  type: string,
  order?: number
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  if (order !== undefined) formData.append('order', String(order))

  const res = await fetch(`/api/products/${productId}/images`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '이미지 업로드 실패')
  }
  return res.json()
}

/**
 * Delete an image associated with a product.
 *
 * @param productId - The product identifier
 * @param imageId - The image identifier
 * @throws Error when the HTTP request fails (non-OK response)
 */
export async function deleteImage(productId: string, imageId: string): Promise<void> {
  const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('이미지 삭제 실패')
}

/**
 * Update the display order of images for a product.
 *
 * @param productId - The product identifier whose images will be reordered
 * @param orders - Array of objects specifying each image's `id` and its new `order`
 * @throws Error - `'순서 변경 실패'` when the server responds with a non-OK status
 */
export async function reorderImages(
  productId: string,
  orders: Array<{ id: string; order: number }>
): Promise<void> {
  const res = await fetch(`/api/products/${productId}/images/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  })
  if (!res.ok) throw new Error('순서 변경 실패')
}

/**
 * Adjusts the stock for a specific product.
 *
 * @param productId - The identifier of the product whose stock will be adjusted
 * @param body - Details of the stock adjustment (quantity, reason, metadata, etc.)
 * @returns The parsed JSON response returned by the server
 * @throws Error when the request fails; the error message is the server-provided `error` field or `'재고 조정 실패'`
 */
export async function adjustStock(productId: string, body: StockAdjustBody) {
  const res = await fetch(`/api/products/${productId}/stock/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '재고 조정 실패')
  }
  return res.json()
}

/**
 * Fetches paginated stock history for a specific product.
 *
 * @param productId - The product identifier
 * @param page - Page number to retrieve, starting at 1 (default: 1)
 * @param limit - Number of records per page (default: 20)
 * @returns An object with `items` (array of stock history records) and `total` (total number of records)
 */
export async function fetchStockHistory(
  productId: string,
  page = 1,
  limit = 20
): Promise<{ items: StockHistory[]; total: number }> {
  const res = await fetch(
    `/api/products/${productId}/stock/history?page=${page}&limit=${limit}`
  )
  if (!res.ok) throw new Error('재고 이력 조회 실패')
  return res.json()
}