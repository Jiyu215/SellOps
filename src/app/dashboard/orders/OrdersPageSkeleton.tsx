/**
 * 주문 관리 페이지 로딩 스켈레톤
 *
 * - OrderTable 카드 외형만 모사 (헤더 + 행 목록 + 푸터)
 * - animate-pulse: JS 타이머 없이 CSS만으로 처리 → 성능 안전
 */

const SK = 'bg-light-secondary dark:bg-dark-secondary rounded';

export const OrdersPageSkeleton = () => (
  <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md animate-pulse">
    {/* 카드 헤더: 제목(좌) + 검색·필터·CSV(우) */}
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-sm mb-md">
      <div className="flex flex-col gap-xs">
        <div className={`h-6 w-36 ${SK}`} />
        <div className={`h-3.5 w-48 ${SK}`} />
      </div>
      <div className="flex items-center gap-sm">
        <div className={`h-8 w-60 ${SK}`} />
        <div className={`h-8 w-28 ${SK}`} />
        <div className={`h-8 w-28 ${SK}`} />
      </div>
    </div>

    {/* 테이블 헤더 행 */}
    <div className={`h-px w-full ${SK} mb-sm`} />
    <div className="hidden lg:grid grid-cols-6 gap-sm mb-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`h-4 ${SK}`} />
      ))}
    </div>
    <div className={`h-px w-full ${SK} mb-md`} />

    {/* 데이터 행 × 5 */}
    <div className="flex flex-col gap-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="hidden lg:grid grid-cols-6 gap-sm items-center py-sm border-b border-light-border dark:border-dark-border last:border-0">
          <div className={`h-4 w-28 ${SK}`} />
          <div className="flex items-center gap-sm">
            <div className={`w-8 h-8 rounded-full ${SK} flex-shrink-0`} />
            <div className={`h-4 flex-1 ${SK}`} />
          </div>
          <div className={`h-4 ${SK}`} />
          <div className={`h-4 w-20 ${SK}`} />
          <div className={`h-4 w-16 ${SK}`} />
          <div className={`h-4 w-16 ${SK}`} />
        </div>
      ))}
      {/* 모바일 카드 스켈레톤 × 3 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`lg:hidden h-24 rounded-md ${SK}`} />
      ))}
    </div>

    {/* 푸터 */}
    <div className="flex items-center justify-between mt-md pt-md border-t border-light-border dark:border-dark-border">
      <div className={`h-4 w-40 ${SK}`} />
      <div className="flex gap-xs">
        <div className={`h-7 w-24 ${SK}`} />
        <div className={`h-7 w-12 ${SK}`} />
        <div className={`h-7 w-24 ${SK}`} />
      </div>
    </div>
  </div>
);
