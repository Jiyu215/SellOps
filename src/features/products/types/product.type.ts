export type ProductStatus = 'active' | 'hidden' | 'sold_out';

export type ProductListItem = {
  id: string
  name: string
  price: number
  product_code: string
  status: ProductStatus
  updated_at: string

  // products_with_stock 뷰에서 조인
  stock_total: number
  stock_sold: number
  stock_available: number

  // 목록 이미지 (product_images에서 별도 조회)
  list_image_url: string | null
}

export type ProductListQuery = {
  search?: string
  status?: ProductStatus | ''
  sort?: SortOption
  page?: number
  limit?: 10 | 20 | 50 | 100
}

export type SortOption =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'available_asc'
  | 'available_desc'

export type ProductListResponse = {
  items: ProductListItem[]
  total: number
  page: number
  limit: number
  summary: {
    total: number
    active: number
    hidden: number
    sold_out: number
  }
}