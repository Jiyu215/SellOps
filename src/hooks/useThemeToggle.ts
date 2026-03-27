'use client';

import { useState, useLayoutEffect, useCallback } from 'react';

const THEME_KEY = 'sellops-theme';

/**
 * 다크/라이트 모드 토글 훅
 * - localStorage 기반 영속성
 * - <html> 태그에 'dark' 클래스 적용
 * - useLayoutEffect 사용: DOM 반영 후 state 동기화, 깜박임 방지
 */
export const useThemeToggle = () => {
  // 초기값을 DOM에서 직접 읽어 동기화
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return saved ? saved === 'dark' : prefersDark;
  });

  // 초기 마운트 시 DOM 클래스 적용 (state 변경 없음)
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return { isDark, toggle };
};
