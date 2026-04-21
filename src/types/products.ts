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

// ============================================================
// 상품 상세·등록 전용 타입
// ============================================================

// ── 이미지 타입 ───────────────────────────────────────────
export type ImageType = 'main' | 'list' | 'small' | 'thumbnail' | 'extra';

// ── 상품 이미지 ───────────────────────────────────────────
export interface ProductImage {
  id:        string;
  type:      ImageType;
  url:       string;
  fileName:  string;
  fileSize:  number;   // bytes
  order?:    number;   // extra 이미지 정렬 순서
  createdAt: string;   // ISO 8601
}

// ── 재고 현황 ─────────────────────────────────────────────
export interface StockInfo {
  total:     number;   // 전체 입고 수량
  sold:      number;   // 판매 수량
  available: number;   // 가용 재고
}

// ── 재고 조정 유형 ────────────────────────────────────────
export type StockAdjustmentType = 'in' | 'out';

// ── 재고 이력 ─────────────────────────────────────────────
export interface StockHistory {
  id:        string;
  productId: string;
  type:      StockAdjustmentType;
  quantity:  number;
  reason?:   string;
  operator:  string;
  createdAt: string;   // ISO 8601
}

// ── 상품 상세 ─────────────────────────────────────────────
export interface ProductDetail {
  id:               string;
  productCode:      string;
  name:             string;
  category:         string;
  price:            number;
  summary:          string;            // 요약 설명 (최대 200자)
  shortDescription: string;            // 간단 설명 (최대 500자)
  description:      string;            // 상세 설명 (HTML)
  status:           ProductStatus;
  stock:            StockInfo;
  images:           ProductImage[];
  createdAt:        string;
  updatedAt:        string;
  createdBy:        string;
}

// ── 폼 데이터 ─────────────────────────────────────────────
export interface ProductFormData {
  name:             string;
  productCode:      string;
  price:            number | '';
  summary:          string;
  shortDescription: string;
  description:      string;
  status:           ProductStatus;
}

// ── 폼 에러 ───────────────────────────────────────────────
export interface ProductFormErrors {
  name?:        string;
  productCode?: string;
  price?:       string;
}

// ── 상품코드 중복확인 상태 ─────────────────────────────────
export type CodeCheckState = 'idle' | 'checking' | 'available' | 'taken' | 'error';

// ── 임시저장 데이터 ───────────────────────────────────────
export interface ProductDraft {
  data:      ProductFormData;
  savedAt:   number;   // Date.now()
  expiresAt: number;   // savedAt + 7일
}
