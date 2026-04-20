/**
 * 상품 관리 페이지 로딩 스켈레톤
 *
 * - ProductTable 구조를 모사 (헤더 + StatSummaryBar + 필터 + 행 목록 + 푸터)
 * - animate-pulse: JS 타이머 없이 CSS만으로 처리 → 성능 안전
 */

const SK = 'bg-light-secondary dark:bg-dark-secondary rounded';

export const ProductsPageSkeleton = () => (
  <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md animate-pulse">
    {/* 페이지 헤더: 타이틀(좌) + CSV Export + 상품 등록(우) */}
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-sm mb-md">
      <div className="flex flex-col gap-xs">
        <div className={`h-6 w-24 ${SK}`} />
        <div className={`h-3.5 w-40 ${SK}`} />
      </div>
      <div className="flex items-center gap-xs">
        <div className={`h-7 w-24 ${SK}`} />
        <div className={`h-7 w-24 ${SK}`} />
      </div>
    </div>

    {/* StatSummaryBar: 4개 집계 카드 */}
    <div className="grid grid-cols-4 gap-xs mb-md">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`h-16 rounded-md ${SK}`} />
      ))}
    </div>

    {/* 필터 바: 검색 + 상태 + 정렬 + 초기화 */}
    <div className="flex flex-wrap items-center gap-sm mb-md">
      <div className={`h-8 flex-1 min-w-[200px] ${SK}`} />
      <div className={`h-8 w-28 ${SK}`} />
      <div className={`h-8 w-32 ${SK}`} />
      <div className={`h-8 w-16 ${SK}`} />
    </div>

    {/* 테이블 헤더 행 */}
    <div className={`h-px w-full ${SK} mb-sm`} />
    <div className="hidden md:grid md:grid-cols-6 gap-sm mb-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`h-4 ${SK}`} />
      ))}
    </div>
    <div className={`h-px w-full ${SK} mb-md`} />

    {/* 데이터 행 × 5 (데스크탑/태블릿) */}
    <div className="hidden md:flex flex-col gap-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-sm items-center py-sm border-b border-light-border dark:border-dark-border last:border-0">
          <div className="flex items-center gap-sm col-span-2">
            <div className={`w-10 h-10 rounded-md ${SK} flex-shrink-0`} />
            <div className={`h-4 flex-1 ${SK}`} />
          </div>
          <div className={`h-4 w-20 ${SK}`} />
          <div className={`h-4 w-16 ${SK}`} />
          <div className={`h-5 w-14 rounded-full ${SK}`} />
          <div className={`h-7 w-12 ml-auto ${SK}`} />
        </div>
      ))}
    </div>

    {/* 모바일 카드 스켈레톤 × 4 */}
    <div className="md:hidden flex flex-col gap-sm">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`h-24 rounded-md ${SK}`} />
      ))}
    </div>

    {/* 푸터 */}
    <div className="flex items-center justify-between mt-md pt-md border-t border-light-border dark:border-dark-border">
      <div className="flex items-center gap-xs">
        <div className={`h-7 w-16 ${SK}`} />
        <div className={`h-4 w-20 ${SK}`} />
      </div>
      <div className="flex gap-xs">
        <div className={`h-7 w-12 ${SK}`} />
        <div className={`h-7 w-7 ${SK}`} />
        <div className={`h-7 w-7 ${SK}`} />
        <div className={`h-7 w-7 ${SK}`} />
        <div className={`h-7 w-12 ${SK}`} />
      </div>
    </div>
  </div>
);
