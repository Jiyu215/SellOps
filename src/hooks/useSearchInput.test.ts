import { renderHook, act } from '@testing-library/react';
import { useSearchInput } from './useSearchInput';

// ── 타이머 설정 ───────────────────────────────────────────────────────────────

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllTimers();
});

// ── 기본 렌더링 및 초기값 ─────────────────────────────────────────────────────

describe('초기값', () => {
  test('initialValue가 없으면 inputValue는 빈 문자열이다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() =>
      useSearchInput({ initialValue: '', onSearch }),
    );
    expect(result.current.inputValue).toBe('');
  });

  test('initialValue로 inputValue를 초기화한다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() =>
      useSearchInput({ initialValue: '홍길동', onSearch }),
    );
    expect(result.current.inputValue).toBe('홍길동');
  });
});

// ── onInputChange — 디바운스 검색 ─────────────────────────────────────────────

describe('onInputChange — 디바운스', () => {
  test('입력 즉시 inputValue를 업데이트한다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({
        target: { value: 'abc' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.inputValue).toBe('abc');
  });

  test('300ms 전에는 onSearch가 호출되지 않는다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({
        target: { value: 'abc' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => { jest.advanceTimersByTime(299); });
    expect(onSearch).not.toHaveBeenCalled();
  });

  test('300ms 후 onSearch가 호출된다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({
        target: { value: 'abc' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => { jest.advanceTimersByTime(300); });
    expect(onSearch).toHaveBeenCalledWith('abc');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  test('연속 입력 시 마지막 값으로만 onSearch가 호출된다 (디바운스)', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({ target: { value: 'a' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(100); });

    act(() => {
      result.current.onInputChange({ target: { value: 'ab' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(100); });

    act(() => {
      result.current.onInputChange({ target: { value: 'abc' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('abc');
  });
});

// ── 공백 처리 (normalize) ─────────────────────────────────────────────────────

describe('공백 처리', () => {
  test('공백을 제거한 값으로 onSearch를 호출한다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({ target: { value: 'a b c' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  test('모두 공백이면 공백 제거 후 이전값과 다를 경우 빈 문자열로 onSearch를 호출한다', () => {
    const onSearch = jest.fn();
    // initialValue를 'abc'로 설정하면 lastTriggeredRef='abc' → 공백입력 normalize='', 달라서 호출됨
    const { result } = renderHook(() =>
      useSearchInput({ initialValue: 'abc', onSearch }),
    );

    act(() => {
      result.current.onInputChange({ target: { value: '   ' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(onSearch).toHaveBeenCalledWith('');
  });

  test('초기값이 빈 문자열이고 공백만 입력하면 onSearch가 호출되지 않는다 (중복 방지)', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch })); // initialValue=''

    act(() => {
      result.current.onInputChange({ target: { value: '   ' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    // normalize('   ')='' === initialValue '' → 중복으로 호출 생략
    expect(onSearch).not.toHaveBeenCalled();
  });
});

// ── 중복 방지 ─────────────────────────────────────────────────────────────────

describe('중복 방지 (deduplication)', () => {
  test('동일한 값으로 두 번 입력해도 onSearch는 한 번만 호출된다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({ target: { value: 'abc' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    act(() => {
      result.current.onInputChange({ target: { value: 'abc' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  test('initialValue와 동일한 값 입력 시 onSearch가 호출되지 않는다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() =>
      useSearchInput({ initialValue: 'abc', onSearch }),
    );

    act(() => {
      result.current.onInputChange({ target: { value: 'abc' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(onSearch).not.toHaveBeenCalled();
  });
});

// ── 한글 IME (compositionStart / compositionEnd) ───────────────────────────────

describe('한글 IME 처리', () => {
  test('compositionStart 중에는 onSearch가 호출되지 않는다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    // 조합 시작
    act(() => { result.current.onCompositionStart(); });

    // onChange 발화 (조합 중)
    act(() => {
      result.current.onInputChange({ target: { value: '가' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(onSearch).not.toHaveBeenCalled();
  });

  test('compositionEnd 시 즉시 onSearch가 호출된다 (디바운스 없음)', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    // 조합 시작 → onChange (디바운스 대기 중)
    act(() => { result.current.onCompositionStart(); });
    act(() => {
      result.current.onInputChange({ target: { value: '가' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // 조합 완료 → 즉시 검색
    act(() => {
      result.current.onCompositionEnd({
        currentTarget: { value: '가나다' },
      } as React.CompositionEvent<HTMLInputElement>);
    });

    // 타이머 진행 없이도 호출됨
    expect(onSearch).toHaveBeenCalledWith('가나다');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  test('compositionEnd는 진행 중인 디바운스 타이머를 취소한다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    // 일반 타이핑 디바운스 시작
    act(() => {
      result.current.onInputChange({ target: { value: 'a' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // compositionEnd 즉시 실행
    act(() => {
      result.current.onCompositionEnd({
        currentTarget: { value: 'abc' },
      } as React.CompositionEvent<HTMLInputElement>);
    });

    expect(onSearch).toHaveBeenCalledWith('abc');

    // 300ms 지나도 추가 호출 없음 (타이머 취소됨)
    act(() => { jest.advanceTimersByTime(300); });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  test('compositionEnd 후 동일한 값이면 onSearch가 다시 호출되지 않는다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch }));

    // 첫 번째 compositionEnd
    act(() => {
      result.current.onCompositionEnd({
        currentTarget: { value: '홍길동' },
      } as React.CompositionEvent<HTMLInputElement>);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);

    // 동일한 값으로 두 번째 compositionEnd
    act(() => {
      result.current.onCompositionEnd({
        currentTarget: { value: '홍길동' },
      } as React.CompositionEvent<HTMLInputElement>);
    });
    expect(onSearch).toHaveBeenCalledTimes(1); // 중복 방지
  });
});

// ── 커스텀 딜레이 ─────────────────────────────────────────────────────────────

describe('커스텀 delay', () => {
  test('delay=500이면 500ms 후에 onSearch가 호출된다', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() => useSearchInput({ onSearch, delay: 500 }));

    act(() => {
      result.current.onInputChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => { jest.advanceTimersByTime(499); });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1); });
    expect(onSearch).toHaveBeenCalledWith('test');
  });
});

// ── onSearch 최신 참조 유지 ───────────────────────────────────────────────────

describe('onSearch 최신 참조 유지', () => {
  test('onSearch 참조가 바뀌어도 최신 함수가 호출된다', () => {
    const firstSearch  = jest.fn();
    const secondSearch = jest.fn();

    let currentOnSearch = firstSearch;
    const { result, rerender } = renderHook(() =>
      useSearchInput({ onSearch: currentOnSearch }),
    );

    // onSearch 교체 후 rerender
    currentOnSearch = secondSearch;
    rerender();

    act(() => {
      result.current.onInputChange({ target: { value: 'abc' } } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => { jest.advanceTimersByTime(300); });

    expect(firstSearch).not.toHaveBeenCalled();
    expect(secondSearch).toHaveBeenCalledWith('abc');
  });
});

// ── 언마운트 정리 ─────────────────────────────────────────────────────────────

describe('언마운트 시 정리', () => {
  test('언마운트 후 디바운스 타이머가 실행되어도 onSearch가 호출되지 않는다', () => {
    const onSearch = jest.fn();
    const { result, unmount } = renderHook(() => useSearchInput({ onSearch }));

    act(() => {
      result.current.onInputChange({ target: { value: 'abc' } } as React.ChangeEvent<HTMLInputElement>);
    });

    unmount();

    act(() => { jest.advanceTimersByTime(300); });
    // 타이머는 정리되었으므로 onSearch 호출 없음
    expect(onSearch).not.toHaveBeenCalled();
  });
});