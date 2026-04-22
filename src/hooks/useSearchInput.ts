'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SEARCH_DEBOUNCE_DELAY_MS } from '@/constants/config';

interface UseSearchInputOptions {
  /** 초기 검색어 (URL 복원·북마크 공유 지원) */
  initialValue?: string;
  /**
   * 검색어가 확정됐을 때 호출되는 콜백
   * - 공백 제거(normalize) 후 이전 값과 같으면 호출 생략
   * - onSearch 참조가 매 렌더마다 바뀌어도 내부 ref로 항상 최신 함수를 참조
   *   (useOrderFilter의 handleSearch는 searchParams 변경 시 새 참조를 생성하므로
   *    ref 없이 deps에 넣으면 debounce 클로저가 stale 함수를 잡을 수 있음)
   */
  onSearch: (value: string) => void;
  /** 디바운스 지연 ms (기본: SEARCH_DEBOUNCE_DELAY_MS = 300) */
  delay?: number;
}

export interface UseSearchInputReturn {
  /** 입력창 표시 전용 로컬 상태 (URL 값이 아님) */
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
}

/**
 * 검색 입력 훅 — debounce + 한글 IME 처리
 *
 * ### 한글 IME 처리 전략
 * 브라우저는 한글 조합 중(ㅎ→하→한)에도 onChange를 발화하므로,
 * 부분 완성 문자열로 URL 쿼리가 매 키스트로크마다 갱신되는 문제가 발생한다.
 *
 * - `onCompositionStart`: 조합 중 플래그 ON → onChange에서 검색 보류
 * - `onCompositionEnd`: 조합 완료 → debounce 없이 즉시 검색 실행
 * - Chrome 이벤트 순서: compositionEnd → onChange (동일 값으로 중복 발화)
 *   → lastTriggeredRef로 마지막 실행 값 추적, 동일 값 재호출 차단
 *
 * ### AbortController
 * 현재는 동기 클라이언트 필터링이라 취소 효과 없음.
 * 실제 API 연동 시 `onSearch(value, signal)` 형태로 확장해
 * 이전 요청을 취소하고 최신 응답만 반영할 수 있다.
 *
 * @example
 * ```tsx
 * const { inputValue, ...handlers } = useSearchInput({
 *   initialValue: filter.search,
 *   onSearch: handleSearch,
 * });
 * <input value={inputValue} {...handlers} />
 * ```
 */
export function useSearchInput({
  initialValue = '',
  onSearch,
  delay = SEARCH_DEBOUNCE_DELAY_MS,
}: UseSearchInputOptions): UseSearchInputReturn {
  const [inputValue, setInputValue] = useState(initialValue);

  // ref로 관리 → 상태 변경 없이 유지, 불필요한 리렌더 방지
  const isComposingRef     = useRef(false);
  const lastTriggeredRef   = useRef(initialValue);
  const debounceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputValueRef      = useRef(initialValue);
  const prevInitialRef     = useRef(initialValue);

  // onSearch 최신 참조 유지 — deps 없이 항상 현재 함수를 호출
  const onSearchRef = useRef(onSearch);
  useEffect(() => { onSearchRef.current = onSearch; }, [onSearch]);

  useEffect(()=>{
    const normalized = initialValue.replace(/\s+/g, '');
    const shouldSyncInput = inputValueRef.current === prevInitialRef.current;

    if (shouldSyncInput) {
      // Sync the input from the URL only while the user has not diverged locally.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(initialValue);
      inputValueRef.current = initialValue;
      lastTriggeredRef.current = normalized;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
    prevInitialRef.current = initialValue;
  },[initialValue]);

  // 언마운트 시 펜딩 타이머·요청 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  /** 공백 제거 후 중복 방지 → onSearch 호출 */
  const executeSearch = useCallback((value: string) => {
    const normalized = value.replace(/\s+/g, '');
    if (lastTriggeredRef.current === normalized) return;
    lastTriggeredRef.current = normalized;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    onSearchRef.current(normalized);
  }, []); // deps 없음: ref만 사용하므로 항상 안정적인 참조

  /** 일반 타이핑: delay ms debounce 후 실행 */
  const triggerDebounced = useCallback((value: string) => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      executeSearch(value);
    }, delay);
  }, [delay, executeSearch]);

  /**
   * 조합 완료(compositionEnd) 전용: debounce 없이 즉시 실행
   * 진행 중인 debounce 타이머도 취소해 중복 실행 방지
   */
  const triggerImmediate = useCallback((value: string) => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    executeSearch(value);
  }, [executeSearch]);

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    triggerImmediate(e.currentTarget.value);
  }, [triggerImmediate]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    inputValueRef.current = nextValue;
    setInputValue(nextValue);
    // 조합 중이 아닐 때만 debounce 검색 실행
    // 조합 완료는 onCompositionEnd에서 처리
    if (!isComposingRef.current) triggerDebounced(nextValue);
  }, [triggerDebounced]);

  return { inputValue, onInputChange, onCompositionStart, onCompositionEnd };
}
