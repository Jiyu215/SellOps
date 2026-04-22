import type {
  ProductDetail,
  ProductCreateBody,
  ProductUpdateBody,
  StockAdjustBody,
  StockHistory,
} from '@/features/products/types/product.type'

// 상품 상세 조회
export async function fetchProductDetail(id: string): Promise<ProductDetail> {
  const res = await fetch(`/api/products/${id}`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error('상품 조회 실패')
  }
  return res.json()
}

// 상품 생성
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

// 상품 수정
export async function updateProduct(id: string, body: ProductUpdateBody): Promise<void> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('상품 수정 실패')
}

// 상품코드 중복 확인
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

// 이미지 업로드
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

// 이미지 삭제
export async function deleteImage(productId: string, imageId: string): Promise<void> {
  const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('이미지 삭제 실패')
}

// 이미지 순서 변경
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

// 재고 조정
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

// 재고 이력 조회
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