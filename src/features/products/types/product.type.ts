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

export type ImageType = 'main' | 'list' | 'small' | 'thumbnail' | 'extra'
export type ImageFormat = 'jpg' | 'png' | 'gif' | 'webp'

export type ProductImage = {
  id: string
  product_id: string
  type: ImageType
  url: string
  width: number | null
  height: number | null
  size_mb: number | null
  format: ImageFormat | null
  order: number
}

export type Stock = {
  product_id: string
  total: number
  sold: number
  available: number   // 뷰에서 total - sold 계산값
}

export type StockHistory = {
  product_id: string
  type: 'in' | 'out'
  quantity: number
  reason: string | null
  created_at: string
}

export type ProductDetail = {
  id: string
  name: string
  price: number
  product_code: string
  category_id: string | null
  category_name: string
  summary: string
  short_description: string | null
  description: string
  status: ProductStatus
  created_at: string
  updated_at: string
  // 조인 데이터
  stock: Stock
  images: ProductImage[]
}

export type ProductCreateBody = {
  name: string
  price: number
  product_code: string
  category_id?: string | null
  summary: string
  short_description?: string
  description: string
  status: ProductStatus
}

export type ProductUpdateBody = Partial<ProductCreateBody>

export type StockAdjustBody = {
  type: 'in' | 'out'
  quantity: number
  reason?: string
}
