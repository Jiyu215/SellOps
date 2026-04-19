'use client';

import { useState, useEffect } from 'react';

/**
 * CSS 미디어 쿼리 매칭 훅
 *
 * ### SSR 안전성
 * - 서버 렌더링 시 `window`가 없으므로 초기값은 `false`
 * - 클라이언트 하이드레이션 후 `useEffect`에서 실제 값으로 갱신
 * - 하이드레이션 불일치 없음: 서버·클라이언트 모두 `false`로 출발
 *
 * ### 사용 예
 * ```tsx
 * const isDesktop = useMediaQuery('(min-width: 1280px)');
 * const isMobile  = useMediaQuery('(max-width: 767px)');
 * ```
 *
 * @param query - 표준 CSS 미디어 쿼리 문자열
 * @returns 현재 뷰포트가 쿼리와 일치하면 `true`, 아니면 `false`
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // 리스너를 통해 간접 설정 → effect body 내 직접 setState 방지
    const sync = () => setMatches(mql.matches);
    mql.addEventListener('change', sync);
    sync(); // 최초 클라이언트 값 적용
    return () => mql.removeEventListener('change', sync);
  }, [query]); // query가 바뀌면 새 리스너로 교체

  return matches;
}
