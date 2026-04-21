import type {
  ProductListQuery,
  ProductListResponse,
  ProductStatus,
} from '@/features/products/types/product.type'

export async function fetchProductList(
  query: ProductListQuery
): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  if (query.search)  params.set('search', query.search)
  if (query.status)  params.set('status', query.status)
  if (query.sort)    params.set('sort', query.sort)
  if (query.page)    params.set('page', String(query.page))
  if (query.limit)   params.set('limit', String(query.limit))

  const res = await fetch(`/api/products?${params.toString()}`, {
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('상품 목록 조회 실패')
  return res.json() as Promise<ProductListResponse>
}

export async function bulkUpdateStatus(
  ids: string[],
  status: ProductStatus
): Promise<void> {
  const res = await fetch('/api/products/bulk-status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status }),
  })
  if (!res.ok) throw new Error('상태 변경 실패')
}

export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  const res = await fetch('/api/products/bulk-delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('삭제 실패')
}

export async function exportProductsCSV(query: ProductListQuery): Promise<void> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)

  const res = await fetch(`/api/products/export?${params.toString()}`)
  if (!res.ok) throw new Error('CSV 내보내기 실패')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `products_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}