import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { ProductTable } from './ProductTable';
import * as useProductFilterModule from '@/hooks/useProductFilter';
import type { ProductListItem } from '@/types/products';

// ── window.matchMedia 모킹 ────────────────────────────────────────────────────
// ProductTable이 useMediaQuery를 사용하므로 jsdom 환경에서 matchMedia 모킹 필요

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

// ── createPortal 모킹 ─────────────────────────────────────────────────────────
// ConfirmModal이 createPortal을 사용하므로 jsdom 환경에서 단순화

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// ── useProductFilter 모킹 ─────────────────────────────────────────────────────
// useSearchParams(next/navigation)를 내부에서 사용하므로 훅 전체를 모킹

jest.mock('@/hooks/useProductFilter');

const mockHandleSearch        = jest.fn();
const mockHandleStatusChange  = jest.fn();
const mockHandleSortChange    = jest.fn();
const mockHandlePageChange    = jest.fn();
const mockHandleLimitChange   = jest.fn();
const mockHandleReset         = jest.fn();

function mockFilterReturn(overrides: Partial<ReturnType<typeof useProductFilterModule.useProductFilter>> = {}) {
  (useProductFilterModule.useProductFilter as jest.Mock).mockReturnValue({
    filter: {
      search: '',
      status: '',
      sort: 'createdAt_desc',
      page: 1,
      limit: 20,
    },
    isFiltered: false,
    handleSearch:       mockHandleSearch,
    handleStatusChange: mockHandleStatusChange,
    handleSortChange:   mockHandleSortChange,
    handlePageChange:   mockHandlePageChange,
    handleLimitChange:  mockHandleLimitChange,
    handleReset:        mockHandleReset,
    ...overrides,
  });
}

// ── 테스트용 목 상품 데이터 ────────────────────────────────────────────────────

const MOCK_PRODUCTS: ProductListItem[] = [
  {
    id: 'p1',
    productCode: 'KB-001',
    name: '기계식 키보드 A',
    category: '키보드',
    price: 89000,
    totalStock: 100,
    availableStock: 80,
    soldCount: 20,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'p2',
    productCode: 'MS-001',
    name: '무선 마우스 B',
    category: '마우스',
    price: 45000,
    totalStock: 50,
    availableStock: 5,
    soldCount: 45,
    status: 'hidden',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
  },
  {
    id: 'p3',
    productCode: 'KB-002',
    name: '슬림 키보드 C',
    category: '키보드',
    price: 120000,
    totalStock: 30,
    availableStock: 0,
    soldCount: 30,
    status: 'sold_out',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-03-03T00:00:00Z',
  },
];

const DEFAULT_PROPS = {
  products: MOCK_PRODUCTS,
  onBulkStatusChange: jest.fn().mockResolvedValue(undefined),
  onBulkDelete: jest.fn().mockResolvedValue(undefined),
  onSingleDelete: jest.fn().mockResolvedValue(undefined),
};

// ─────────────────────────────────────────────────────────────────────────────

// 디바운스(setTimeout)를 포함하므로 가짜 타이머 전역 적용
beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  mockFilterReturn();
});

// ── 기본 렌더링 ───────────────────────────────────────────────────────────────

describe('기본 렌더링', () => {
  test('상품관리 제목이 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('상품관리')).toBeInTheDocument();
  });

  test('검색 입력창이 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  test('상태 필터 select가 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('combobox', { name: '상태 필터' })).toBeInTheDocument();
  });

  test('정렬 기준 select가 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('combobox', { name: '정렬 기준' })).toBeInTheDocument();
  });

  test('상품 이름이 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('기계식 키보드 A')).toBeInTheDocument();
    expect(screen.getByText('무선 마우스 B')).toBeInTheDocument();
    expect(screen.getByText('슬림 키보드 C')).toBeInTheDocument();
  });

  test('CSV Export 버튼이 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: 'CSV 내보내기' })).toBeInTheDocument();
  });

  test('상품 등록 링크가 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('link', { name: '새 상품 등록' })).toBeInTheDocument();
  });

  test('StatSummaryBar에 상품 집계가 표시된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    // 전체 3건, active 1건, hidden 1건, sold_out 1건
    const statGroup = screen.getByRole('group', { name: '상품 상태별 집계' });
    expect(statGroup).toBeInTheDocument();
  });

  test('초기 필터 상태 표시 — 초기 검색어가 입력창에 표시된다', () => {
    mockFilterReturn({
      filter: {
        search: '키보드',
        status: '',
        sort: 'createdAt_desc',
        page: 1,
        limit: 20,
      },
    });
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('searchbox')).toHaveValue('키보드');
  });
});

// ── 상태 필터 ─────────────────────────────────────────────────────────────────

describe('상태 필터', () => {
  test('상태 필터 select 변경 시 handleStatusChange가 호출된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const select = screen.getByRole('combobox', { name: '상태 필터' });

    fireEvent.change(select, { target: { value: 'active' } });

    expect(mockHandleStatusChange).toHaveBeenCalledWith('active');
  });

  test('정렬 기준 select 변경 시 handleSortChange가 호출된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const select = screen.getByRole('combobox', { name: '정렬 기준' });

    fireEvent.change(select, { target: { value: 'price_asc' } });

    expect(mockHandleSortChange).toHaveBeenCalledWith('price_asc');
  });

  test('isFiltered가 false이면 초기화 버튼이 비활성화된다', () => {
    mockFilterReturn({ isFiltered: false });
    render(<ProductTable {...DEFAULT_PROPS} />);
    const resetBtn = screen.getByRole('button', { name: '필터 초기화' });

    expect(resetBtn).toBeDisabled();
  });

  test('isFiltered가 true이면 초기화 버튼이 활성화된다', () => {
    mockFilterReturn({ isFiltered: true });
    render(<ProductTable {...DEFAULT_PROPS} />);
    const resetBtn = screen.getByRole('button', { name: '필터 초기화' });

    expect(resetBtn).not.toBeDisabled();
  });

  test('초기화 버튼 클릭 시 handleReset이 호출된다', () => {
    mockFilterReturn({ isFiltered: true });
    render(<ProductTable {...DEFAULT_PROPS} />);
    const resetBtn = screen.getByRole('button', { name: '필터 초기화' });

    fireEvent.click(resetBtn);

    expect(mockHandleReset).toHaveBeenCalledTimes(1);
  });
});

// ── StatSummaryBar 클릭 ───────────────────────────────────────────────────────

describe('StatSummaryBar 클릭', () => {
  test('전체 버튼 클릭 시 handleStatusChange("")가 호출된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    // title 속성으로 찾기 (accessible name은 "3 전체" 형태)
    const allBtn = screen.getByTitle('전체: 3건');

    fireEvent.click(allBtn);

    expect(mockHandleStatusChange).toHaveBeenCalledWith('');
  });

  test('판매중 버튼 클릭 시 handleStatusChange("active")가 호출된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const activeBtn = screen.getByTitle('판매중: 1건');

    fireEvent.click(activeBtn);

    expect(mockHandleStatusChange).toHaveBeenCalledWith('active');
  });
});

// ── 비조합 검색 입력 ──────────────────────────────────────────────────────────

describe('비조합 입력 (IME 미사용)', () => {
  test('영문 입력 후 300ms 후에 검색을 수행한다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'KB' } });
    expect(mockHandleSearch).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledWith('KB');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });

  test('빠른 연속 입력 시 마지막 값으로만 검색한다 (디바운스)', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'K' } });
    fireEvent.change(input, { target: { value: 'KB' } });
    fireEvent.change(input, { target: { value: 'KB-' } });

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
    expect(mockHandleSearch).toHaveBeenCalledWith('KB-');
  });

  test('입력창 값을 즉시 표시한다 (controlled input)', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'KB' } });

    expect(input).toHaveValue('KB');
  });
});

// ── IME 조합 중 동작 ──────────────────────────────────────────────────────────

describe('IME 조합 중 (한글 입력)', () => {
  test('조합 시작 후 변경 이벤트에서 검색을 수행하지 않는다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ㅋ' } });
    fireEvent.change(input, { target: { value: '키' } });
    fireEvent.change(input, { target: { value: '키보' } });

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).not.toHaveBeenCalled();
  });

  test('조합 완료(compositionEnd) 시 즉시 검색한다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '키보드' } });
    fireEvent.compositionEnd(input);

    expect(mockHandleSearch).toHaveBeenCalledWith('키보드');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });
});

// ── 체크박스 선택 ─────────────────────────────────────────────────────────────

describe('체크박스 선택', () => {
  test('상품 체크박스 선택 시 BulkActionBar가 나타난다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // 첫 번째는 전체 선택 체크박스, 이후는 개별 상품 체크박스
    // 헤더 체크박스 포함: [헤더, p1, p2, p3]
    const firstProductCheckbox = checkboxes.find(cb =>
      cb.getAttribute('aria-label') === '기계식 키보드 A 선택'
    );
    expect(firstProductCheckbox).toBeTruthy();

    fireEvent.click(firstProductCheckbox!);

    expect(screen.getByText('1개')).toBeInTheDocument();
    expect(screen.getByText(/선택됨/)).toBeInTheDocument();
  });

  test('전체 선택 체크박스 클릭 시 현재 페이지 모두 선택된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);

    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' });
    fireEvent.click(headerCheckbox);

    // BulkActionBar에 3개 선택됨 표시
    expect(screen.getByText('3개')).toBeInTheDocument();
  });

  test('선택 취소 버튼 클릭 시 선택이 초기화된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);

    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' });
    fireEvent.click(headerCheckbox);

    expect(screen.getByText('3개')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: '선택 취소' });
    fireEvent.click(clearBtn);

    // BulkActionBar 사라짐 (선택 없음)
    expect(screen.queryByText('3개')).not.toBeInTheDocument();
  });

  test('2개 선택 후 FilterBar 대신 BulkActionBar가 표시된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);

    const firstCheckbox = screen.getByRole('checkbox', { name: '기계식 키보드 A 선택' });
    const secondCheckbox = screen.getByRole('checkbox', { name: '무선 마우스 B 선택' });

    fireEvent.click(firstCheckbox);
    fireEvent.click(secondCheckbox);

    expect(screen.getByText('2개')).toBeInTheDocument();
    // 상태 변경 버튼이 있어야 함
    expect(screen.getByRole('button', { name: /상태 변경/ })).toBeInTheDocument();
  });
});

// ── 일괄 상태 변경 ────────────────────────────────────────────────────────────

describe('일괄 상태 변경', () => {
  async function selectAllAndOpenStatusMenu() {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' });
    fireEvent.click(headerCheckbox);

    const statusBtn = screen.getByRole('button', { name: /상태 변경/ });
    fireEvent.click(statusBtn);
  }

  test('상태 변경 드롭다운에 변경 옵션이 표시된다', async () => {
    await selectAllAndOpenStatusMenu();

    expect(screen.getByRole('menuitem', { name: '판매중으로 변경' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '숨김으로 변경' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '품절로 변경' })).toBeInTheDocument();
  });

  test('상태 변경 옵션 클릭 시 확인 모달이 열린다', async () => {
    await selectAllAndOpenStatusMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: '판매중으로 변경' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('상태를 변경하시겠습니까?')).toBeInTheDocument();
  });

  test('확인 모달에서 취소 클릭 시 모달이 닫힌다', async () => {
    await selectAllAndOpenStatusMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: '판매중으로 변경' }));

    const cancelBtn = screen.getByRole('button', { name: '취소' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('확인 모달에서 확인 클릭 시 onBulkStatusChange가 호출된다', async () => {
    await selectAllAndOpenStatusMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: '판매중으로 변경' }));

    // 모달 내 확인 버튼은 여러 "상태 변경" 버튼 중 두 번째(모달 내)
    const statusBtns = screen.getAllByRole('button', { name: '상태 변경' });
    const confirmBtn = statusBtns[statusBtns.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(DEFAULT_PROPS.onBulkStatusChange).toHaveBeenCalledWith(
        expect.arrayContaining(['p1', 'p2', 'p3']),
        'active',
      );
    });
  });
});

// ── 일괄 삭제 ────────────────────────────────────────────────────────────────

describe('일괄 삭제', () => {
  test('선택 삭제 버튼 클릭 시 삭제 확인 모달이 열린다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' });
    fireEvent.click(headerCheckbox);

    const deleteBtn = screen.getByRole('button', { name: /선택 삭제/ });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('상품을 삭제하시겠습니까?')).toBeInTheDocument();
  });

  test('삭제 확인 모달에서 확인 클릭 시 onBulkDelete가 호출된다', async () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' });
    fireEvent.click(headerCheckbox);

    const deleteBtn = screen.getByRole('button', { name: /선택 삭제/ });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: '삭제' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(DEFAULT_PROPS.onBulkDelete).toHaveBeenCalledWith(
        expect.arrayContaining(['p1', 'p2', 'p3']),
      );
    });
  });
});

// ── 빈 상태 ───────────────────────────────────────────────────────────────────

describe('빈 상태', () => {
  test('상품이 없을 때 "등록된 상품이 없습니다" 메시지 표시', () => {
    render(<ProductTable {...DEFAULT_PROPS} products={[]} />);
    expect(screen.getByText('등록된 상품이 없습니다.')).toBeInTheDocument();
  });

  test('필터 적용 후 상품이 없을 때 "검색 결과가 없습니다" 메시지 표시', () => {
    mockFilterReturn({
      isFiltered: true,
      filter: {
        search: '없는상품',
        status: '',
        sort: 'createdAt_desc',
        page: 1,
        limit: 20,
      },
    });
    // 검색 결과가 없도록 products는 전달하지만 필터 결과를 빈 배열로 시뮬레이션
    // (실제 필터는 내부 useMemo에서 처리되므로 상품이 없는 빈 배열을 전달)
    render(<ProductTable {...DEFAULT_PROPS} products={[]} />);
    expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  test('빈 상태(필터 없음)에서 상품 등록 링크가 표시된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} products={[]} />);
    expect(screen.getByRole('link', { name: '상품 등록' })).toBeInTheDocument();
  });

  test('빈 상태(필터 있음)에서 필터 초기화 버튼이 표시된다', () => {
    mockFilterReturn({ isFiltered: true });
    render(<ProductTable {...DEFAULT_PROPS} products={[]} />);
    // EmptyState 내 초기화 버튼
    const resetBtns = screen.getAllByRole('button', { name: '필터 초기화' });
    expect(resetBtns.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 페이지네이션 ──────────────────────────────────────────────────────────────

describe('페이지네이션', () => {
  test('상품이 있을 때 페이지네이션이 표시된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('navigation', { name: '페이지 탐색' })).toBeInTheDocument();
  });

  test('상품이 없을 때 페이지네이션이 표시되지 않는다', () => {
    render(<ProductTable {...DEFAULT_PROPS} products={[]} />);
    expect(screen.queryByRole('navigation', { name: '페이지 탐색' })).not.toBeInTheDocument();
  });

  test('페이지당 항목 수 select 변경 시 handleLimitChange가 호출된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const limitSelect = screen.getByRole('combobox', { name: '페이지당 항목 수' });

    fireEvent.change(limitSelect, { target: { value: '50' } });

    expect(mockHandleLimitChange).toHaveBeenCalledWith(50);
  });

  test('1페이지일 때 이전 페이지 버튼이 비활성화된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const prevBtn = screen.getByRole('button', { name: '이전 페이지' });

    expect(prevBtn).toBeDisabled();
  });

  test('마지막 페이지일 때 다음 페이지 버튼이 비활성화된다', () => {
    // 20개 limit에 3개 상품이므로 1페이지 = 마지막 페이지
    render(<ProductTable {...DEFAULT_PROPS} />);
    const nextBtn = screen.getByRole('button', { name: '다음 페이지' });

    expect(nextBtn).toBeDisabled();
  });

  test('현재 페이지 번호가 aria-current="page"로 표시된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const page1Btn = screen.getByRole('button', { name: '1페이지' });

    expect(page1Btn).toHaveAttribute('aria-current', 'page');
  });
});

// ── CSV 내보내기 ──────────────────────────────────────────────────────────────

describe('CSV 내보내기', () => {
  test('상품이 있을 때 CSV Export 버튼이 활성화된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const exportBtn = screen.getByRole('button', { name: 'CSV 내보내기' });

    expect(exportBtn).not.toBeDisabled();
  });

  test('상품이 없을 때 CSV Export 버튼이 비활성화된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} products={[]} />);
    const exportBtn = screen.getByRole('button', { name: 'CSV 내보내기' });

    expect(exportBtn).toBeDisabled();
  });

  test('exportLoading이 true일 때 CSV Export 버튼이 비활성화된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} exportLoading={true} />);
    const exportBtn = screen.getByRole('button', { name: 'CSV 내보내기' });

    expect(exportBtn).toBeDisabled();
  });
});

// ── 모달 Escape 닫기 ──────────────────────────────────────────────────────────

describe('확인 모달 Escape 닫기', () => {
  test('모달이 열린 상태에서 Escape 키를 누르면 닫힌다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' });
    fireEvent.click(headerCheckbox);

    const deleteBtn = screen.getByRole('button', { name: /선택 삭제/ });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ── 단일 삭제 ─────────────────────────────────────────────────────────────────

describe('단일 삭제', () => {
  test('삭제 버튼 클릭 시 해당 상품명이 포함된 확인 모달이 열린다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const deleteBtn = screen.getByRole('button', { name: '기계식 키보드 A 삭제' });

    fireEvent.click(deleteBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // 모달 범위 내에서 상품명 확인 (테이블 링크와 중복 방지)
    expect(within(dialog).getByText(/기계식 키보드 A/)).toBeInTheDocument();
  });

  test('확인 모달에서 취소 클릭 시 모달이 닫힌다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const deleteBtn = screen.getByRole('button', { name: '기계식 키보드 A 삭제' });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: '취소' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('확인 클릭 시 onSingleDelete가 해당 상품 id로 호출된다', async () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const deleteBtn = screen.getByRole('button', { name: '기계식 키보드 A 삭제' });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: '삭제' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(DEFAULT_PROPS.onSingleDelete).toHaveBeenCalledWith('p1');
    });
  });

  test('삭제 확인 후 모달이 닫힌다', async () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const deleteBtn = screen.getByRole('button', { name: '기계식 키보드 A 삭제' });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: '삭제' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('각 상품마다 개별 삭제 버튼이 렌더링된다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);

    expect(screen.getByRole('button', { name: '기계식 키보드 A 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무선 마우스 B 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '슬림 키보드 C 삭제' })).toBeInTheDocument();
  });

  test('Escape 키로도 단일 삭제 모달이 닫힌다', () => {
    render(<ProductTable {...DEFAULT_PROPS} />);
    const deleteBtn = screen.getByRole('button', { name: '기계식 키보드 A 삭제' });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
