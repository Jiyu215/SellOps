import type { ProductListItem, SortOption, ProductStatusSummary } from '@/types/products';

// ── 숫자 포맷 ─────────────────────────────────────────────────────────────────

/**
 * 숫자를 콤팩트 표기로 변환
 * - 1,000 미만 : 원본 그대로
 * - 1,000 이상 : K (소수 1자리 + 반올림)
 * - 1,000,000 이상 : M (소수 1자리 + 반올림)
 *
 * @example
 * formatCompactNumber(1200) → '1.2K'
 * formatCompactNumber(1200000) → '1.2M'
 * formatCompactNumber(999) → '999'
 */
export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${Math.round(n / 100_000) / 10}M`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 100) / 10}K`;
  }
  return String(n);
}

/**
 * 가격을 원화 표시로 포맷
 * @example formatPrice(139000) → '₩139,000'
 */
export function formatPrice(price: number): string {
  return `₩${price.toLocaleString('ko-KR')}`;
}

/**
 * ISO 날짜 문자열을 'YYYY.MM.DD' 형식으로 변환
 * KST(UTC+9) 기준 날짜 사용
 */
export function formatProductDate(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y  = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}.${mo}.${dd}`;
}

/**
 * CSV 내보내기용 날짜+시간 문자열 (파일명 접미사용)
 * @example getCsvTimestamp() → '20260419_143022'
 */
export function getCsvTimestamp(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y  = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d  = String(kst.getUTCDate()).padStart(2, '0');
  const h  = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  const s  = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${d}_${h}${mi}${s}`;
}

// ── 필터링 ────────────────────────────────────────────────────────────────────

/**
 * 상품 목록을 검색어로 필터링
 * - 상품명(name) LIKE
 * - 상품코드(productCode) LIKE
 */
export function filterProductsBySearch(
  products: ProductListItem[],
  search: string,
): ProductListItem[] {
  const q = search.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => {
    // 상품명·코드의 공백을 제거한 뒤 비교 (검색어도 useSearchInput에서 이미 공백 제거됨)
    const name = p.name.replace(/\s+/g, '').toLowerCase();
    const code = p.productCode.replace(/\s+/g, '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });
}

// ── 정렬 ─────────────────────────────────────────────────────────────────────

/** 상품 목록 정렬 (새 배열 반환, 원본 불변) */
export function sortProducts(
  products: ProductListItem[],
  sort: SortOption,
): ProductListItem[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case 'createdAt_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'createdAt_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'updatedAt_desc':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'name_asc':
        return a.name.localeCompare(b.name, 'ko');
      case 'name_desc':
        return b.name.localeCompare(a.name, 'ko');
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'available_asc':
        return a.availableStock - b.availableStock;
      case 'available_desc':
        return b.availableStock - a.availableStock;
      default:
        return 0;
    }
  });
}

// ── 집계 ─────────────────────────────────────────────────────────────────────

/** 전체 상품 목록에서 상태별 집계 계산 */
export function computeStatusSummary(products: ProductListItem[]): ProductStatusSummary {
  return products.reduce(
    (acc, p) => {
      acc.total++;
      acc[p.status]++;
      return acc;
    },
    { total: 0, active: 0, hidden: 0, sold_out: 0 } as ProductStatusSummary,
  );
}

// ── CSV 내보내기 ──────────────────────────────────────────────────────────────

/**
 * 상품 목록을 CSV 파일로 다운로드
 * @param products 내보낼 상품 목록 (현재 필터 조건 반영, 페이지네이션 무관 전체)
 * @returns 'success' | 'error'
 */
export function exportProductsToCSV(products: ProductListItem[]): 'success' | 'error' {
  try {
    const STATUS_LABEL: Record<string, string> = {
      active: '판매중', hidden: '숨김', sold_out: '품절',
    };

    const headers = [
      '상품코드', '상품명', '카테고리', '판매가',
      '전체재고', '판매수량', '가용재고', '상태', '등록일', '수정일',
    ];

    const rows = products.map((p) => [
      p.productCode,
      p.name,
      p.category,
      p.price,
      p.totalStock,
      p.soldCount,
      p.availableStock,
      STATUS_LABEL[p.status] ?? p.status,
      formatProductDate(p.createdAt),
      formatProductDate(p.updatedAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `products_${getCsvTimestamp()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return 'success';
  } catch {
    return 'error';
  }
}
