import { renderHook, act } from '@testing-library/react';
import { useProductFilter } from './useProductFilter';

// ── next/navigation 모킹 ──────────────────────────────────────────────────────

const mockReplace = jest.fn();
let mockSearchParamsString = '';

jest.mock('next/navigation', () => ({
  useRouter:       jest.fn(() => ({ replace: mockReplace })),
  useSearchParams: jest.fn(() => new URLSearchParams(mockSearchParamsString)),
  usePathname:     jest.fn(() => '/dashboard/products'),
}));

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParamsString = '';
});

// ── 초기 상태 파싱 ─────────────────────────────────────────────────────────────

describe('초기 상태 파싱', () => {
  test('URL 파라미터 없으면 기본값 반환', () => {
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.search).toBe('');
    expect(result.current.filter.status).toBe('');
    expect(result.current.filter.sort).toBe('createdAt_desc');
    expect(result.current.filter.page).toBe(1);
    expect(result.current.filter.limit).toBe(20);
  });

  test('p_search 파라미터를 검색어로 읽는다', () => {
    mockSearchParamsString = 'p_search=키보드';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.search).toBe('키보드');
  });

  test('p_status 파라미터를 상태 필터로 읽는다', () => {
    mockSearchParamsString = 'p_status=active';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.status).toBe('active');
  });

  test('p_sort 파라미터를 정렬 기준으로 읽는다', () => {
    mockSearchParamsString = 'p_sort=price_asc';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.sort).toBe('price_asc');
  });

  test('p_page 파라미터를 페이지 번호로 읽는다', () => {
    mockSearchParamsString = 'p_page=3';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.page).toBe(3);
  });

  test('p_limit 파라미터를 페이지 크기로 읽는다', () => {
    mockSearchParamsString = 'p_limit=50';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.limit).toBe(50);
  });

  test('유효하지 않은 p_status 값은 빈 문자열로 폴백', () => {
    mockSearchParamsString = 'p_status=invalid_status';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.status).toBe('');
  });

  test('유효하지 않은 p_sort 값은 기본 정렬로 폴백', () => {
    mockSearchParamsString = 'p_sort=unknown_sort';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.sort).toBe('createdAt_desc');
  });

  test('유효하지 않은 p_page 값은 1로 폴백', () => {
    mockSearchParamsString = 'p_page=abc';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.page).toBe(1);
  });

  test('음수 p_page 값은 1로 폴백', () => {
    mockSearchParamsString = 'p_page=-5';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.page).toBe(1);
  });

  test('유효하지 않은 p_limit 값은 기본값(20)으로 폴백', () => {
    mockSearchParamsString = 'p_limit=999';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.filter.limit).toBe(20);
  });

  test('모든 상태 값(active/hidden/sold_out) 파싱', () => {
    for (const status of ['active', 'hidden', 'sold_out']) {
      mockSearchParamsString = `p_status=${status}`;
      const { result } = renderHook(() => useProductFilter());
      expect(result.current.filter.status).toBe(status);
    }
  });

  test('모든 유효한 limit 값(10/20/50/100) 파싱', () => {
    for (const limit of [10, 20, 50, 100]) {
      mockSearchParamsString = `p_limit=${limit}`;
      const { result } = renderHook(() => useProductFilter());
      expect(result.current.filter.limit).toBe(limit);
    }
  });
});

// ── isFiltered ────────────────────────────────────────────────────────────────

describe('isFiltered', () => {
  test('기본값 상태에서 isFiltered는 false', () => {
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.isFiltered).toBe(false);
  });

  test('검색어가 있으면 isFiltered는 true', () => {
    mockSearchParamsString = 'p_search=키보드';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.isFiltered).toBe(true);
  });

  test('상태 필터가 있으면 isFiltered는 true', () => {
    mockSearchParamsString = 'p_status=active';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.isFiltered).toBe(true);
  });

  test('기본이 아닌 정렬이 있으면 isFiltered는 true', () => {
    mockSearchParamsString = 'p_sort=price_asc';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.isFiltered).toBe(true);
  });

  test('기본이 아닌 limit이 있으면 isFiltered는 true', () => {
    mockSearchParamsString = 'p_limit=50';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.isFiltered).toBe(true);
  });

  test('페이지만 변경된 경우 isFiltered는 false', () => {
    mockSearchParamsString = 'p_page=3';
    const { result } = renderHook(() => useProductFilter());
    expect(result.current.isFiltered).toBe(false);
  });
});

// ── handleSearch ──────────────────────────────────────────────────────────────

describe('handleSearch', () => {
  test('검색어를 URL에 반영하고 페이지를 1로 초기화한다', () => {
    mockSearchParamsString = 'p_page=3';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleSearch('키보드');
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_search=');
    expect(calledUrl).not.toContain('p_page='); // 페이지 초기화
  });

  test('빈 검색어는 URL에서 p_search 제거', () => {
    mockSearchParamsString = 'p_search=키보드';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleSearch('');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('p_search');
  });
});

// ── handleStatusChange ────────────────────────────────────────────────────────

describe('handleStatusChange', () => {
  test('상태 필터를 URL에 반영하고 페이지를 1로 초기화한다', () => {
    mockSearchParamsString = 'p_page=2';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleStatusChange('active');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_status=active');
    expect(calledUrl).not.toContain('p_page=');
  });

  test('빈 문자열(전체) 선택 시 URL에서 p_status 제거', () => {
    mockSearchParamsString = 'p_status=active';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleStatusChange('');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('p_status');
  });
});

// ── handleSortChange ──────────────────────────────────────────────────────────

describe('handleSortChange', () => {
  test('정렬 기준을 URL에 반영하고 페이지를 1로 초기화한다', () => {
    mockSearchParamsString = 'p_page=2';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleSortChange('price_asc');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_sort=price_asc');
    expect(calledUrl).not.toContain('p_page=');
  });

  test('기본 정렬(createdAt_desc) 선택 시 URL에서 p_sort 제거', () => {
    mockSearchParamsString = 'p_sort=price_asc';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleSortChange('createdAt_desc');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('p_sort');
  });
});

// ── handlePageChange ──────────────────────────────────────────────────────────

describe('handlePageChange', () => {
  test('페이지 번호를 URL에 반영한다', () => {
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handlePageChange(2);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_page=2');
  });

  test('1페이지로 설정 시 URL에서 p_page 제거 (기본값 정리)', () => {
    mockSearchParamsString = 'p_page=3';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handlePageChange(1);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('p_page');
  });

  test('함수형 업데이트로 이전 페이지 기반 계산', () => {
    mockSearchParamsString = 'p_page=3';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handlePageChange((prev) => prev + 1);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_page=4');
  });
});

// ── handleLimitChange ─────────────────────────────────────────────────────────

describe('handleLimitChange', () => {
  test('페이지 크기를 URL에 반영하고 페이지를 1로 초기화한다', () => {
    mockSearchParamsString = 'p_page=3';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleLimitChange(50);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_limit=50');
    expect(calledUrl).not.toContain('p_page=');
  });

  test('기본 limit(20) 선택 시 URL에서 p_limit 제거', () => {
    mockSearchParamsString = 'p_limit=50';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleLimitChange(20);
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('p_limit');
  });
});

// ── handleReset ───────────────────────────────────────────────────────────────

describe('handleReset', () => {
  test('모든 필터를 초기화하면 URL이 깨끗해진다', () => {
    mockSearchParamsString = 'p_search=키보드&p_status=active&p_sort=price_asc&p_page=3&p_limit=50';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleReset();
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toBe('/dashboard/products');
  });
});

// ── URL 깔끔함 유지 ───────────────────────────────────────────────────────────

describe('URL 기본값 정리', () => {
  test('기본값은 URL 파라미터에 포함하지 않는다', () => {
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleStatusChange('');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toBe('/dashboard/products');
  });

  test('router.replace는 scroll:false로 호출된다', () => {
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleStatusChange('active');
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.any(String),
      { scroll: false },
    );
  });

  test('기존 다른 파라미터는 유지된다', () => {
    mockSearchParamsString = 'p_search=키보드&p_sort=price_asc';
    const { result } = renderHook(() => useProductFilter());

    act(() => {
      result.current.handleStatusChange('active');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('p_search=');
    expect(calledUrl).toContain('p_sort=price_asc');
    expect(calledUrl).toContain('p_status=active');
  });
});
