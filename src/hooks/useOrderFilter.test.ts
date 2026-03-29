import { renderHook, act } from '@testing-library/react';
import { useOrderFilter } from './useOrderFilter';

// ── next/navigation 모킹 ──────────────────────────────────────────────────────

const mockReplace = jest.fn();
let mockSearchParamsString = '';

jest.mock('next/navigation', () => ({
  useRouter:       jest.fn(() => ({ replace: mockReplace })),
  useSearchParams: jest.fn(() => new URLSearchParams(mockSearchParamsString)),
  usePathname:     jest.fn(() => '/dashboard/dashboard'),
}));

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParamsString = '';
});

// ── 초기 상태 파싱 ─────────────────────────────────────────────────────────────

describe('초기 상태 파싱', () => {
  test('URL 파라미터 없으면 기본값 반환', () => {
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.filter.search).toBe('');
    expect(result.current.filter.status).toBe('all');
    expect(result.current.filter.paymentMethod).toBe('all');
    expect(result.current.currentPage).toBe(1);
  });

  test('order_search 파라미터를 검색어로 읽는다', () => {
    mockSearchParamsString = 'order_search=홍길동';
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.filter.search).toBe('홍길동');
  });

  test('order_status 파라미터를 상태 필터로 읽는다', () => {
    mockSearchParamsString = 'order_status=shipped';
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.filter.status).toBe('shipped');
  });

  test('order_page 파라미터를 페이지 번호로 읽는다', () => {
    mockSearchParamsString = 'order_page=3';
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.currentPage).toBe(3);
  });

  test('유효하지 않은 status 값은 "all"로 폴백', () => {
    mockSearchParamsString = 'order_status=invalid_status';
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.filter.status).toBe('all');
  });

  test('유효하지 않은 page 값은 1로 폴백', () => {
    mockSearchParamsString = 'order_page=abc';
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.currentPage).toBe(1);
  });

  test('음수 page 값은 1로 폴백', () => {
    mockSearchParamsString = 'order_page=-5';
    const { result } = renderHook(() => useOrderFilter());
    expect(result.current.currentPage).toBe(1);
  });
});

// ── handleSearch ──────────────────────────────────────────────────────────────

describe('handleSearch', () => {
  test('검색어를 URL에 반영하고 페이지를 1로 초기화한다', () => {
    mockSearchParamsString = 'order_page=3';
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.handleSearch('홍길동');
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('order_search=');
    expect(calledUrl).not.toContain('order_page='); // 페이지 초기화
  });

  test('빈 검색어는 URL에서 order_search 제거', () => {
    mockSearchParamsString = 'order_search=홍길동';
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.handleSearch('');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('order_search');
  });
});

// ── handleStatusChange ────────────────────────────────────────────────────────

describe('handleStatusChange', () => {
  test('상태 필터를 URL에 반영하고 페이지를 1로 초기화한다', () => {
    mockSearchParamsString = 'order_page=2';
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.handleStatusChange('shipped');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('order_status=shipped');
    expect(calledUrl).not.toContain('order_page=');
  });

  test('"all" 선택 시 URL에서 order_status 제거', () => {
    mockSearchParamsString = 'order_status=shipped';
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.handleStatusChange('all');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('order_status');
  });
});

// ── setCurrentPage ────────────────────────────────────────────────────────────

describe('setCurrentPage', () => {
  test('페이지 번호를 URL에 반영한다', () => {
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.setCurrentPage(2);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('order_page=2');
  });

  test('1페이지로 설정 시 URL에서 order_page 제거 (기본값 정리)', () => {
    mockSearchParamsString = 'order_page=3';
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.setCurrentPage(1);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('order_page');
  });

  test('함수형 업데이트로 이전 페이지 기반 계산', () => {
    mockSearchParamsString = 'order_page=3';
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.setCurrentPage((prev) => prev + 1);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('order_page=4');
  });
});

// ── URL 깔끔함 유지 ───────────────────────────────────────────────────────────

describe('URL 기본값 정리', () => {
  test('기본값은 URL 파라미터에 포함하지 않는다', () => {
    const { result } = renderHook(() => useOrderFilter());

    // 기본값("all")으로 상태 변경 시 파라미터 없는 URL
    act(() => {
      result.current.handleStatusChange('all');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    // 쿼리스트링 없이 pathname만 있어야 함
    expect(calledUrl).toBe('/dashboard/dashboard');
  });

  test('router.replace는 scroll:false로 호출된다', () => {
    const { result } = renderHook(() => useOrderFilter());

    act(() => {
      result.current.handleStatusChange('shipped');
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.any(String),
      { scroll: false },
    );
  });
});
