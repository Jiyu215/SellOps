// ============================================================
// 상품 관리 전용 TypeScript 타입 정의
// ============================================================

// ── 상품 상태 ────────────────────────────────────────────
export type ProductStatus = 'active' | 'hidden' | 'sold_out';

// ── 정렬 옵션 ────────────────────────────────────────────
export type SortOption =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'available_asc'
  | 'available_desc';

// ── 페이지당 항목 수 ──────────────────────────────────────
export type ProductPageLimit = 10 | 20 | 50 | 100;

// ── 상품 목록 아이템 ──────────────────────────────────────
export interface ProductListItem {
  id:             string;
  productCode:    string;  // 상품 코드 (SKU)
  name:           string;  // 상품명
  category:       string;  // 카테고리
  price:          number;  // 판매가 (KRW)
  totalStock:     number;  // 전체 재고
  availableStock: number;  // 가용 재고 (판매 가능 수량)
  soldCount:      number;  // 누적 판매 수량
  status:         ProductStatus;
  thumbnailUrl?:  string;
  createdAt:      string;  // ISO 8601
  updatedAt:      string;  // ISO 8601
}

// ── 상태별 집계 ───────────────────────────────────────────
export interface ProductStatusSummary {
  total:    number;
  active:   number;
  hidden:   number;
  sold_out: number;
}

// ── 필터 상태 ─────────────────────────────────────────────
export interface ProductFilter {
  search: string;
  status: ProductStatus | '';
  sort:   SortOption;
  page:   number;
  limit:  ProductPageLimit;
}

// ── API 응답 ──────────────────────────────────────────────
export interface ProductListResponse {
  items:   ProductListItem[];
  total:   number;
  page:    number;
  limit:   number;
  summary: ProductStatusSummary;
}

// ── 일괄 상태 변경 요청 ───────────────────────────────────
export interface BulkStatusChangeRequest {
  ids:    string[];
  status: ProductStatus;
}

// ── 일괄 삭제 요청 ────────────────────────────────────────
export interface BulkDeleteRequest {
  ids: string[];
}
