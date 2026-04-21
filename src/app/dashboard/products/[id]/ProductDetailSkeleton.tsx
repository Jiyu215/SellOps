// 스켈레톤 공통 클래스
const SK = 'bg-light-secondary dark:bg-dark-secondary rounded animate-pulse';

const SkLine = ({ className = '' }: { className?: string }) => (
  <div className={`${SK} h-4 ${className}`} />
);

/**
 * 상품 상세 페이지 로딩 스켈레톤
 * 2-Column (메인 + 사이드) 레이아웃을 반영
 */
export const ProductDetailSkeleton = () => (
  <div className="flex flex-col gap-md pb-xxl">
    {/* PageHeader */}
    <div className="h-12 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border -mx-md px-md flex items-center gap-sm">
      <div className={`${SK} h-4 w-20`} />
      <div className={`${SK} h-4 flex-1 max-w-xs`} />
      <div className="ml-auto flex gap-sm">
        <div className={`${SK} h-8 w-20`} />
        <div className={`${SK} h-8 w-20`} />
      </div>
    </div>

    {/* 2-Column 레이아웃 */}
    <div className="flex flex-col lg:flex-row gap-md items-start">

      {/* MainColumn */}
      <div className="flex-1 min-w-0 flex flex-col gap-md">

        {/* 기본 정보 카드 */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border p-lg flex flex-col gap-md">
          <div className={`${SK} h-5 w-24`} />
          <div className="flex flex-col gap-xs">
            <div className={`${SK} h-3 w-16`} />
            <div className={`${SK} h-10 w-full`} />
          </div>
          <div className="flex flex-col sm:flex-row gap-md">
            <div className="flex-1 flex flex-col gap-xs">
              <div className={`${SK} h-3 w-20`} />
              <div className={`${SK} h-10 w-full`} />
            </div>
            <div className="flex-1 flex flex-col gap-xs">
              <div className={`${SK} h-3 w-14`} />
              <div className={`${SK} h-10 w-full`} />
            </div>
          </div>
        </div>

        {/* 상품 설명 카드 */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border p-lg flex flex-col gap-md">
          <div className={`${SK} h-5 w-24`} />
          <div className="flex flex-col gap-xs">
            <div className={`${SK} h-3 w-20`} />
            <div className={`${SK} h-10 w-full`} />
          </div>
          <div className="flex flex-col gap-xs">
            <div className={`${SK} h-3 w-20`} />
            <div className={`${SK} h-20 w-full`} />
          </div>
          <div className="flex flex-col gap-xs">
            <div className={`${SK} h-3 w-24`} />
            <div className={`${SK} h-48 w-full`} />
          </div>
        </div>

        {/* 이미지 관리 카드 */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border p-lg flex flex-col gap-md">
          <div className={`${SK} h-5 w-24`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${SK} aspect-square rounded-md`} />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${SK} aspect-square rounded-md`} />
            ))}
          </div>
        </div>
      </div>

      {/* SideColumn */}
      <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-md">
        {/* 상태 카드 */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border p-lg flex flex-col gap-md">
          <div className={`${SK} h-5 w-20`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${SK} h-14 rounded-md`} />
          ))}
        </div>

        {/* 재고 카드 */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border p-lg flex flex-col gap-md">
          <div className={`${SK} h-5 w-20`} />
          <div className="grid grid-cols-3 gap-xs">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${SK} h-14 rounded-md`} />
            ))}
          </div>
          <SkLine className="w-full" />
          <SkLine className="w-4/5" />
          <SkLine className="w-full" />
        </div>

        {/* 정보 카드 */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border p-lg flex flex-col gap-md">
          <div className={`${SK} h-5 w-12`} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-sm">
              <SkLine className="w-16" />
              <SkLine className="w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
