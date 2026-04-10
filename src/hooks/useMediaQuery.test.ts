import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

// ── window.matchMedia 모킹 ────────────────────────────────────────────────────

type MatchMediaMock = {
  matches: boolean;
  media:   string;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  dispatchEvent: jest.Mock;
  // 테스트 헬퍼: 리스너를 트리거하기 위한 내부 맵
  _listeners: Set<() => void>;
  _trigger: (matches: boolean) => void;
};

let mediaQueryMocks: Map<string, MatchMediaMock> = new Map();

function createMatchMediaMock(query: string, matches: boolean): MatchMediaMock {
  const mock: MatchMediaMock = {
    matches,
    media: query,
    _listeners: new Set(),
    addEventListener: jest.fn((event: string, listener: () => void) => {
      if (event === 'change') mock._listeners.add(listener);
    }),
    removeEventListener: jest.fn((event: string, listener: () => void) => {
      if (event === 'change') mock._listeners.delete(listener);
    }),
    dispatchEvent: jest.fn(),
    _trigger: (newMatches: boolean) => {
      mock.matches = newMatches;
      mock._listeners.forEach((listener) => listener());
    },
  };
  return mock;
}

beforeEach(() => {
  mediaQueryMocks = new Map();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn((query: string) => {
      if (!mediaQueryMocks.has(query)) {
        mediaQueryMocks.set(query, createMatchMediaMock(query, false));
      }
      return mediaQueryMocks.get(query)!;
    }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── 초기값 ───────────────────────────────────────────────────────────────────

describe('초기값', () => {
  test('쿼리가 일치하면 true를 반환한다', () => {
    // 첫 번째 matchMedia 호출 전에 mock 결과 설정
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn((query: string) => createMatchMediaMock(query, true)),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'));
    expect(result.current).toBe(true);
  });

  test('쿼리가 일치하지 않으면 false를 반환한다', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn((query: string) => createMatchMediaMock(query, false)),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'));
    expect(result.current).toBe(false);
  });
});

// ── 변경 이벤트 감지 ──────────────────────────────────────────────────────────

describe('미디어 쿼리 변경 이벤트', () => {
  test('쿼리가 일치하게 되면 true로 업데이트된다', () => {
    const mock = createMatchMediaMock('(min-width: 1280px)', false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mock),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'));
    expect(result.current).toBe(false);

    act(() => {
      mock._trigger(true);
    });

    expect(result.current).toBe(true);
  });

  test('쿼리가 일치하지 않게 되면 false로 업데이트된다', () => {
    const mock = createMatchMediaMock('(max-width: 767px)', true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mock),
    });

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);

    act(() => {
      mock._trigger(false);
    });

    expect(result.current).toBe(false);
  });

  test('여러 번 변경 이벤트를 수신할 수 있다', () => {
    const mock = createMatchMediaMock('(min-width: 768px)', false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mock),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    act(() => { mock._trigger(true); });
    expect(result.current).toBe(true);

    act(() => { mock._trigger(false); });
    expect(result.current).toBe(false);

    act(() => { mock._trigger(true); });
    expect(result.current).toBe(true);
  });
});

// ── 이벤트 리스너 등록/해제 ───────────────────────────────────────────────────

describe('이벤트 리스너 등록 및 해제', () => {
  test('마운트 시 change 이벤트 리스너를 등록한다', () => {
    const mock = createMatchMediaMock('(min-width: 1280px)', false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mock),
    });

    renderHook(() => useMediaQuery('(min-width: 1280px)'));
    expect(mock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('언마운트 시 change 이벤트 리스너를 해제한다', () => {
    const mock = createMatchMediaMock('(min-width: 1280px)', false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mock),
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1280px)'));
    unmount();
    expect(mock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('등록한 리스너와 해제하는 리스너가 동일한 함수이다', () => {
    const mock = createMatchMediaMock('(min-width: 1280px)', false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mock),
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1280px)'));

    const addedListener   = mock.addEventListener.mock.calls[0][1];
    unmount();
    const removedListener = mock.removeEventListener.mock.calls[0][1];

    expect(addedListener).toBe(removedListener);
  });
});

// ── query 변경 ────────────────────────────────────────────────────────────────

describe('query 변경 시 리스너 교체', () => {
  test('query prop이 바뀌면 새 query로 matchMedia를 호출한다', () => {
    const mockFn = jest.fn((query: string) => createMatchMediaMock(query, false));
    Object.defineProperty(window, 'matchMedia', { writable: true, value: mockFn });

    const { rerender } = renderHook(({ q }) => useMediaQuery(q), {
      initialProps: { q: '(min-width: 1280px)' },
    });

    expect(mockFn).toHaveBeenCalledWith('(min-width: 1280px)');

    rerender({ q: '(max-width: 767px)' });
    expect(mockFn).toHaveBeenCalledWith('(max-width: 767px)');
  });

  test('query prop이 바뀌면 이전 리스너가 해제된다', () => {
    const mocks: Map<string, MatchMediaMock> = new Map();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn((query: string) => {
        if (!mocks.has(query)) mocks.set(query, createMatchMediaMock(query, false));
        return mocks.get(query)!;
      }),
    });

    const { rerender } = renderHook(({ q }) => useMediaQuery(q), {
      initialProps: { q: '(min-width: 1280px)' },
    });

    rerender({ q: '(max-width: 767px)' });

    const firstMock = mocks.get('(min-width: 1280px)');
    expect(firstMock?.removeEventListener).toHaveBeenCalled();
  });
});

// ── 경계값 ────────────────────────────────────────────────────────────────────

describe('경계값 및 회귀 케이스', () => {
  test('빈 쿼리 문자열도 matchMedia에 전달한다', () => {
    const mockFn = jest.fn((query: string) => createMatchMediaMock(query, false));
    Object.defineProperty(window, 'matchMedia', { writable: true, value: mockFn });

    renderHook(() => useMediaQuery(''));
    expect(mockFn).toHaveBeenCalledWith('');
  });

  test('같은 쿼리로 여러 인스턴스가 독립적으로 동작한다', () => {
    const mocks: MatchMediaMock[] = [];
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn((query: string) => {
        const mock = createMatchMediaMock(query, false);
        mocks.push(mock);
        return mock;
      }),
    });

    const { result: r1 } = renderHook(() => useMediaQuery('(min-width: 1280px)'));
    const { result: r2 } = renderHook(() => useMediaQuery('(min-width: 1280px)'));

    act(() => { mocks[0]._trigger(true); });
    expect(r1.current).toBe(true);
    // r2는 별도 인스턴스이므로 r1의 변경에 영향받지 않음
    expect(r2.current).toBe(false);
  });
});