// 스켈레톤 공통 클래스
const SK = 'bg-light-secondary dark:bg-dark-secondary rounded animate-pulse';

const SkeletonLine = ({ className }: { className?: string }) => (
  <div className={`${SK} h-4 ${className ?? ''}`} />
);

const SkeletonSection = ({ rows = 3, title = true }: { rows?: number; title?: boolean }) => (
  <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md flex flex-col gap-md">
    {title && <div className={`${SK} h-5 w-36`} />}
    <div className="flex flex-col gap-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className={i % 2 === 0 ? 'w-full' : 'w-4/5'} />
      ))}
    </div>
  </div>
);

/**
 * 주문 상세 페이지 로딩 스켈레톤
 */
export const OrderDetailSkeleton = () => (
  <div className="flex flex-col gap-md">
    {/* 뒤로가기 링크 자리 */}
    <div className={`${SK} h-5 w-32`} />

    {/* 섹션 1: 기본 정보 */}
    <SkeletonSection rows={3} />

    {/* 섹션 2: 고객 / 배송 2단 */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
      <SkeletonSection rows={4} />
      <SkeletonSection rows={4} />
    </div>

    {/* 섹션 3: 상품 / 결제 */}
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md flex flex-col gap-md">
      <div className={`${SK} h-5 w-40`} />
      {/* 테이블 행 스켈레톤 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-md">
          <div className={`${SK} h-4 flex-1`} />
          <div className={`${SK} h-4 w-16`} />
          <div className={`${SK} h-4 w-12`} />
          <div className={`${SK} h-4 w-20`} />
        </div>
      ))}
      <div className="border-t border-light-border dark:border-dark-border pt-md flex flex-col gap-sm items-end">
        <div className={`${SK} h-4 w-48`} />
        <div className={`${SK} h-4 w-40`} />
        <div className={`${SK} h-6 w-56`} />
      </div>
    </div>

    {/* 섹션 4: 메모 */}
    <SkeletonSection rows={2} />

    {/* 섹션 5: 액션 */}
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md flex justify-end gap-sm">
      <div className={`${SK} h-8 w-24`} />
      <div className={`${SK} h-8 w-24`} />
    </div>
  </div>
);
