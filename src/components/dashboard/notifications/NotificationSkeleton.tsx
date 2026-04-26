export const NotificationSkeleton = () => (
  <div className="space-y-md animate-pulse">
    {[0, 1].map((g) => (
      <div key={g}>
        {/* 날짜 구분선 skeleton */}
        <div className="flex items-center gap-sm mb-xs">
          <div className="w-20 h-3 rounded bg-light-border dark:bg-dark-border" />
          <div className="flex-1 h-px bg-light-border dark:bg-dark-border" />
        </div>

        <div className="rounded-lg border border-light-border dark:border-dark-border overflow-hidden bg-light-surface dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-sm px-md py-sm">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-light-border dark:bg-dark-border mt-2" />
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-light-border dark:bg-dark-border" />
              <div className="flex-1 space-y-xs">
                <div className="flex gap-sm">
                  <div className="w-10 h-4 rounded bg-light-border dark:bg-dark-border" />
                  <div className="w-48 h-4 rounded bg-light-border dark:bg-dark-border" />
                </div>
                <div className="w-full h-3 rounded bg-light-border dark:bg-dark-border" />
                <div className="w-3/4 h-3 rounded bg-light-border dark:bg-dark-border" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
