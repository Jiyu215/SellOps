/**
 * 대시보드 로딩 스켈레톤
 *
 * - CSS animate-pulse만 사용 (JS 타이머·setInterval 없음 → 성능 안전)
 * - 각 섹션 높이/레이아웃을 실제 컴포넌트와 동일하게 맞춰 CLS 최소화
 * - bg-light-secondary/dark-secondary: 테마 토큰 기반 스켈레톤 블록 색상
 */

// ── 공통 헬퍼 ────────────────────────────────────────────────────────────────

/** 테마 색상이 적용된 스켈레톤 블록 기본 클래스 */
const SK = 'bg-light-secondary dark:bg-dark-secondary rounded';

/** 카드 외형 공통 클래스 (실제 컴포넌트의 section/article과 동일) */
const CARD = 'bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md';

// ── 1. KPI 카드 그리드 ────────────────────────────────────────────────────────

const KPICardSkeleton = () => (
  <article className={`${CARD} border-l-4 border-light-border dark:border-dark-border animate-pulse`}>
    {/* 아이콘 원 + 변동률 뱃지 */}
    <div className="flex items-center justify-between mb-md">
      <div className={`w-10 h-10 rounded-full ${SK}`} />
      <div className={`w-14 h-5 rounded-full ${SK}`} />
    </div>
    {/* 주요 수치 */}
    <div className={`w-36 h-8 mb-xs ${SK}`} />
    {/* 레이블 */}
    <div className={`w-24 h-4 mb-md ${SK}`} />
    {/* 목표 대비 프로그레스바 */}
    <div className={`h-1.5 rounded-full ${SK}`} />
    {/* 달성률 텍스트 */}
    <div className={`w-28 h-3 mt-xs ${SK}`} />
  </article>
);

export const KPICardGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
    <KPICardSkeleton />
    <KPICardSkeleton />
    <KPICardSkeleton />
  </div>
);

// ── 2. 단기 추이 차트 (SalesShortTermChart) ───────────────────────────────────

export const SalesShortTermChartSkeleton = () => (
  <section className={`${CARD} animate-pulse`}>
    {/* 헤더 */}
    <div className="flex items-center justify-between mb-md">
      <div>
        <div className={`w-36 h-5 mb-xs ${SK}`} />
        <div className={`w-24 h-3 ${SK}`} />
      </div>
      {/* 범례 */}
      <div className="hidden sm:flex items-center gap-md">
        <div className={`w-20 h-4 ${SK}`} />
        <div className={`w-20 h-4 ${SK}`} />
      </div>
    </div>
    {/* 차트 영역 — 실제 h-56 sm:h-72 에 맞춤 */}
    <div className={`h-56 sm:h-72 rounded-lg ${SK}`} />
  </section>
);

// ── 3a. 장기 추이 Combo 차트 (SalesComboChart) ────────────────────────────────

export const SalesComboChartSkeleton = () => (
  <section className={`${CARD} h-full animate-pulse`}>
    {/* 헤더: 제목 + 연도 토글 */}
    <div className="flex items-center justify-between mb-md">
      <div className={`w-32 h-5 ${SK}`} />
      <div className={`w-28 h-8 rounded-md ${SK}`} />
    </div>
    {/* 범례 */}
    <div className="flex items-center gap-md mb-sm">
      <div className={`w-20 h-4 ${SK}`} />
      <div className={`w-24 h-4 ${SK}`} />
    </div>
    {/* 차트 영역 */}
    <div className={`h-56 sm:h-64 rounded-lg ${SK}`} />
  </section>
);

// ── 3b. 카테고리 도넛 차트 (CategoryDoughnutChart) ────────────────────────────

export const CategoryDoughnutChartSkeleton = () => (
  <section className={`${CARD} h-full animate-pulse`}>
    {/* 헤더 */}
    <div className={`w-32 h-5 mb-md ${SK}`} />
    {/* 도넛 원형 */}
    <div className="flex justify-center mb-md">
      <div className={`w-40 h-40 rounded-full ${SK}`} />
    </div>
    {/* 범례 리스트 — 4줄 */}
    <div className="flex flex-col gap-sm">
      {[72, 56, 64, 48].map((w) => (
        <div key={w} className="flex items-center justify-between">
          <div className="flex items-center gap-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${SK}`} />
            <div className={`h-3 rounded ${SK}`} style={{ width: `${w}px` }} />
          </div>
          <div className={`w-16 h-3 ${SK}`} />
        </div>
      ))}
    </div>
  </section>
);

// ── 4a. 인기 상품 Top5 (TopProductsCard) ─────────────────────────────────────

const TopProductRowSkeleton = () => (
  <li className="px-md py-sm lg:px-sm lg:py-xs xl:px-md xl:py-sm flex flex-col gap-xs">
    {/* Row 1: 순위 + 제품명 + 매출 */}
    <div className="flex items-center gap-sm">
      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 ${SK}`} />
      <div className={`flex-1 h-4 ${SK}`} />
      <div className={`w-16 h-4 flex-shrink-0 ${SK}`} />
    </div>
    {/* Row 2: 카테고리 + 변화율 + 수량 */}
    <div className="flex items-center justify-between">
      <div className={`w-20 h-3 ${SK}`} />
      <div className={`w-14 h-3 ${SK}`} />
    </div>
    {/* Row 3: 프로그레스바 */}
    <div className={`h-1 rounded-full ${SK}`} />
  </li>
);

export const TopProductsCardSkeleton = () => (
  <section className={`${CARD} h-full animate-pulse`}>
    {/* 헤더: 트로피 아이콘 + 제목 + 기간 탭 */}
    <div className="flex items-center justify-between mb-sm">
      <div className="flex items-center gap-xs">
        <div className={`w-5 h-5 ${SK}`} />
        <div className={`w-28 h-5 ${SK}`} />
      </div>
      <div className={`w-24 h-7 rounded-md ${SK}`} />
    </div>
    {/* 5개 제품 행 */}
    <ul className="divide-y divide-light-border dark:divide-dark-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <TopProductRowSkeleton key={i} />
      ))}
    </ul>
  </section>
);

// ── 4b. 재고 부족 현황 (LowStockTable) ───────────────────────────────────────

const LowStockRowSkeleton = () => (
  <tr className="border-b border-light-border dark:border-dark-border">
    {/* 상품명 */}
    <td className="py-sm px-sm pl-0">
      <div className={`w-32 h-4 mb-xs ${SK}`} />
      <div className={`w-20 h-3 ${SK}`} />
    </td>
    {/* 카테고리 */}
    <td className="py-sm px-sm hidden sm:table-cell">
      <div className={`w-16 h-5 rounded-full ${SK}`} />
    </td>
    {/* 현재 재고 */}
    <td className="py-sm px-sm">
      <div className={`w-8 h-5 rounded ${SK}`} />
    </td>
    {/* 임계 재고 */}
    <td className="py-sm px-sm hidden lg:table-cell">
      <div className={`w-8 h-5 rounded ${SK}`} />
    </td>
    {/* 상태 뱃지 */}
    <td className="py-sm px-sm">
      <div className={`w-14 h-5 rounded-full ${SK}`} />
    </td>
    {/* 액션 */}
    <td className="py-sm px-sm hidden xl:table-cell">
      <div className={`w-16 h-7 rounded-md ${SK}`} />
    </td>
  </tr>
);

export const LowStockTableSkeleton = () => (
  <section className={`${CARD} h-full animate-pulse`}>
    {/* 헤더: 제목 + 뱃지 */}
    <div className="flex items-center justify-between mb-md">
      <div className="flex items-center gap-sm">
        <div className={`w-36 h-5 ${SK}`} />
        <div className={`w-16 h-5 rounded-full ${SK}`} />
      </div>
      <div className={`w-20 h-4 ${SK}`} />
    </div>
    {/* 테이블 (데스크탑) */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-light-border dark:border-dark-border">
            {['pl-0 w-1/3', 'hidden sm:table-cell', '', 'hidden lg:table-cell', '', 'hidden xl:table-cell'].map((cls, i) => (
              <th key={i} className={`py-sm px-sm ${cls}`}>
                <div className={`h-3 w-14 ${SK}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => <LowStockRowSkeleton key={i} />)}
        </tbody>
      </table>
    </div>
    {/* 모바일 카드 (sm 미만) */}
    <div className="sm:hidden flex flex-col gap-sm">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`rounded-md border border-light-border dark:border-dark-border p-sm flex flex-col gap-xs ${SK} bg-opacity-30`}>
          <div className={`w-32 h-4 ${SK}`} />
          <div className="flex justify-between">
            <div className={`w-16 h-4 ${SK}`} />
            <div className={`w-14 h-5 rounded-full ${SK}`} />
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ── 5. 최근 주문 내역 (OrderTable) ────────────────────────────────────────────

const OrderRowSkeleton = () => (
  <tr className="border-b border-light-border dark:border-dark-border">
    {/* 주문번호 */}
    <td className="py-sm px-sm pl-0">
      <div className={`w-24 h-4 mb-xs ${SK}`} />
      <div className={`w-20 h-3 ${SK}`} />
    </td>
    {/* 고객정보: 아바타 + 이름 + 등급 */}
    <td className="py-sm px-sm">
      <div className="flex items-center gap-sm">
        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${SK}`} />
        <div>
          <div className={`w-20 h-4 mb-xs ${SK}`} />
          <div className={`w-10 h-3 rounded-sm ${SK}`} />
        </div>
      </div>
    </td>
    {/* 상품상세 */}
    <td className="py-sm px-sm">
      <div className={`w-32 h-4 mb-xs ${SK}`} />
      <div className={`w-24 h-3 ${SK}`} />
    </td>
    {/* 결제금액 */}
    <td className="py-sm px-sm">
      <div className={`w-20 h-5 ${SK}`} />
    </td>
    {/* 결제방식 (xl) */}
    <td className="py-sm px-sm hidden xl:table-cell">
      <div className={`w-16 h-5 rounded-full ${SK}`} />
    </td>
    {/* 배송상태 */}
    <td className="py-sm px-sm">
      <div className={`w-16 h-5 rounded-full ${SK}`} />
    </td>
  </tr>
);

export const OrderTableSkeleton = () => (
  <section className={`${CARD} animate-pulse`}>
    {/* 헤더 */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-md">
      <div>
        <div className={`w-32 h-5 mb-xs ${SK}`} />
        <div className={`w-48 h-3 ${SK}`} />
      </div>
      {/* 검색바 + 필터 + CSV */}
      <div className="flex items-center gap-sm">
        <div className={`flex-1 sm:w-56 h-8 rounded-md ${SK}`} />
        <div className={`w-20 h-8 rounded-md ${SK}`} />
        <div className={`w-24 h-8 rounded-md hidden sm:block ${SK}`} />
      </div>
    </div>

    {/* 데스크탑 테이블 (lg 이상) */}
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-light-border dark:border-dark-border">
            {['pl-0', '', '', '', 'hidden xl:table-cell', ''].map((cls, i) => (
              <th key={i} className={`py-sm px-sm ${cls}`}>
                <div className={`h-3 w-14 ${SK}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)}
        </tbody>
      </table>
    </div>

    {/* 모바일 카드 목록 (lg 미만) */}
    <div className="lg:hidden flex flex-col gap-sm">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-light-border dark:border-dark-border rounded-md p-sm flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <div className={`w-24 h-4 ${SK}`} />
            <div className={`w-16 h-5 rounded-full ${SK}`} />
          </div>
          <div className="grid grid-cols-2 gap-xs">
            <div className="flex items-center gap-xs">
              <div className={`w-8 h-8 rounded-full flex-shrink-0 ${SK}`} />
              <div className={`flex-1 h-4 ${SK}`} />
            </div>
            <div className="text-right">
              <div className={`w-20 h-4 ml-auto ${SK}`} />
            </div>
          </div>
          <div className={`h-3 w-full ${SK}`} />
        </div>
      ))}
    </div>

    {/* 페이지네이션 푸터 */}
    <div className="flex items-center justify-between mt-md pt-sm border-t border-light-border dark:border-dark-border">
      <div className={`w-40 h-4 ${SK}`} />
      <div className="flex items-center gap-xs">
        <div className={`w-20 h-8 rounded-md ${SK}`} />
        <div className={`w-24 h-8 rounded-md ${SK}`} />
      </div>
    </div>
  </section>
);

// ── 전체 대시보드 스켈레톤 ────────────────────────────────────────────────────

/**
 * 대시보드 메인 페이지 전체 스켈레톤
 * page.tsx의 레이아웃 구조(섹션 순서·grid 비율)와 1:1 대응
 */
export const DashboardSkeleton = () => (
  <div className="flex flex-col gap-md sm:gap-lg max-w-screen-2xl mx-auto">

    {/* 1. KPI 카드 */}
    <KPICardGridSkeleton />

    {/* 2. 단기 추이 차트 */}
    <SalesShortTermChartSkeleton />

    {/* 3. 장기 추이 + 카테고리 도넛 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-stretch">
      <div className="lg:col-span-2">
        <SalesComboChartSkeleton />
      </div>
      <div className="lg:col-span-1">
        <CategoryDoughnutChartSkeleton />
      </div>
    </div>

    {/* 4. 인기 상품 + 재고 부족 현황 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-md sm:gap-lg items-stretch">
      <div className="lg:col-span-1">
        <TopProductsCardSkeleton />
      </div>
      <div className="lg:col-span-2 min-w-0">
        <LowStockTableSkeleton />
      </div>
    </div>

    {/* 5. 최근 주문 내역 */}
    <OrderTableSkeleton />

  </div>
);
