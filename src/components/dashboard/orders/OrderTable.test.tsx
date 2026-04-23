import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OrderTable } from './OrderTable';
import * as useOrderFilterModule from '@/hooks/useOrderFilter';
import type { Order } from '@/types/dashboard';

// ── window.matchMedia 모킹 ────────────────────────────────────────────────────
// OrderTable이 useMediaQuery를 사용하므로 jsdom 환경에서 matchMedia 모킹 필요

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

describe('orders variant server pagination', () => {
  test('uses server total/page and delegates page changes', () => {
    const handlePageChange = jest.fn();

    render(
      <OrderTable
        orders={MOCK_ORDERS}
        variant="orders"
        pagination={{
          total: 42,
          page:  2,
          limit: 20,
          onPageChange: handlePageChange,
        }}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('PREVIOUS'));
    expect(handlePageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText('NEXT PAGE'));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});

// ── useOrderFilter 모킹 ───────────────────────────────────────────────────────
// useSearchParams(next/navigation)를 내부에서 사용하므로 훅 전체를 모킹

jest.mock('@/hooks/useOrderFilter');

const mockHandleSearch               = jest.fn();
const mockHandleOrderStatus          = jest.fn();
const mockHandlePaymentStatus        = jest.fn();
const mockHandleShippingStatus       = jest.fn();
const mockSetCurrentPage             = jest.fn();

function mockFilterReturn(overrides: Partial<ReturnType<typeof useOrderFilterModule.useOrderFilter>> = {}) {
  (useOrderFilterModule.useOrderFilter as jest.Mock).mockReturnValue({
    filter: {
      search: '',
      orderStatus:   'all',
      paymentStatus: 'all',
      shippingStatus: 'all',
      paymentMethod: 'all',
    },
    currentPage:                1,
    handleSearch:               mockHandleSearch,
    handleOrderStatusChange:    mockHandleOrderStatus,
    handlePaymentStatusChange:  mockHandlePaymentStatus,
    handleShippingStatusChange: mockHandleShippingStatus,
    setCurrentPage:             mockSetCurrentPage,
    handlePaymentChange:        jest.fn(),
    ...overrides,
  });
}

// ── 최소 목 주문 데이터 ────────────────────────────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-20260001',
    customer: { name: '홍길동', email: 'hong@test.com', phone: '010-0000-0001', tier: '일반' },
    products: [{ name: '기계식 키보드', sku: 'KB-001', quantity: 1, unitPrice: 89000 }],
    totalAmount: 89000,
    paymentMethod: 'card',
    orderStatus: 'order_confirmed', paymentStatus: 'payment_completed', shippingStatus: 'shipping_ready',
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'o2',
    orderNumber: 'ORD-20260002',
    customer: { name: '김영희', email: 'kim@test.com', phone: '010-0000-0002', tier: 'VIP' },
    products: [{ name: '무선 마우스', sku: 'MS-002', quantity: 2, unitPrice: 45000 }],
    totalAmount: 90000,
    paymentMethod: 'kakao_pay',
    orderStatus: 'order_confirmed', paymentStatus: 'payment_completed', shippingStatus: 'shipping_in_progress',
    createdAt: '2026-03-21T11:00:00Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

// 디바운스(setTimeout)를 포함하므로 가짜 타이머 전역 적용
beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllTimers();
  mockHandleSearch.mockClear();
  mockHandleOrderStatus.mockClear();
  mockHandlePaymentStatus.mockClear();
  mockHandleShippingStatus.mockClear();
  mockSetCurrentPage.mockClear();
  mockFilterReturn();
});

// ── 렌더링 ────────────────────────────────────────────────────────────────────

describe('기본 렌더링', () => {
  test('검색 입력창이 렌더링된다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  test('초기 검색어가 입력창에 표시된다', () => {
    mockFilterReturn({
      filter: {
        search: '홍길동',
        orderStatus: 'all',
        paymentStatus: 'all',
        shippingStatus: 'all',
        paymentMethod: 'all',
      },
    });
    render(<OrderTable orders={MOCK_ORDERS} />);
    expect(screen.getByRole('searchbox')).toHaveValue('홍길동');
  });
});

// ── 비조합 입력 (영문·숫자) ─────────────────────────────────────────────────

describe('비조합 입력 (IME 미사용)', () => {
  test('영문 입력 후 300ms 후에 검색을 수행한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'ORD' } });
    expect(mockHandleSearch).not.toHaveBeenCalled(); // 디바운스 중

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledWith('ORD');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });

  test('빠른 연속 입력 시 마지막 값으로만 검색한다 (디바운스)', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'O' } });
    fireEvent.change(input, { target: { value: 'OR' } });
    fireEvent.change(input, { target: { value: 'ORD' } });

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
    expect(mockHandleSearch).toHaveBeenCalledWith('ORD');
  });

  test('입력창 값을 즉시 표시한다 (controlled input)', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'abc' } });

    // inputValue는 디바운스 없이 즉시 반영됨 (UX 유지)
    expect(input).toHaveValue('abc');
  });
});

// ── IME 조합 중 동작 ──────────────────────────────────────────────────────────

describe('IME 조합 중 (한글 입력)', () => {
  test('조합 시작 후 변경 이벤트에서 검색을 수행하지 않는다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ㅎ' } });
    fireEvent.change(input, { target: { value: '하' } });
    fireEvent.change(input, { target: { value: '한' } });

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).not.toHaveBeenCalled();
  });

  test('조합 중에도 입력창 값은 즉시 반영된다 (UX 유지)', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '하' } });

    expect(input).toHaveValue('하');
  });

  test('조합 완료(compositionEnd) 시 즉시 검색한다 (디바운스 없음)', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.compositionEnd(input);

    // compositionEnd는 즉시 실행 — 타이머 진행 불필요
    expect(mockHandleSearch).toHaveBeenCalledWith('홍');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });

  test('여러 글자 조합 완료 후 검색한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.change(input, { target: { value: '홍길' } });
    fireEvent.change(input, { target: { value: '홍길동' } });
    fireEvent.compositionEnd(input);

    expect(mockHandleSearch).not.toHaveBeenCalledWith('홍');
    expect(mockHandleSearch).not.toHaveBeenCalledWith('홍길');
    expect(mockHandleSearch).toHaveBeenCalledWith('홍길동');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });
});

// ── 조합 완료 후 후속 입력 ────────────────────────────────────────────────────

describe('조합 완료 후 후속 입력', () => {
  test('조합 완료 후 비조합 입력이 정상 동작한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    // 한글 조합 → 즉시 검색
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.compositionEnd(input);
    mockHandleSearch.mockClear();

    // 조합 완료 후 영문 추가 입력 → 디바운스 후 검색
    fireEvent.change(input, { target: { value: '홍a' } });
    expect(mockHandleSearch).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledWith('홍a');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });

  test('연속 조합에서도 각 조합 완료마다 즉시 검색한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    // 첫 번째 조합
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.compositionEnd(input);

    // 두 번째 조합
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍길' } });
    fireEvent.compositionEnd(input);

    expect(mockHandleSearch).toHaveBeenCalledTimes(2);
    expect(mockHandleSearch).toHaveBeenNthCalledWith(1, '홍');
    expect(mockHandleSearch).toHaveBeenNthCalledWith(2, '홍길');
  });
});

// ── 중복 검색 방지 ────────────────────────────────────────────────────────────

describe('중복 검색 방지', () => {
  test('compositionEnd 후 동일 값 onChange가 발화해도 검색을 한 번만 수행한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    // Chrome: compositionEnd → onChange 순으로 같은 값이 두 번 오는 상황 시뮬레이션
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.compositionEnd(input); // triggerSearchImmediate → handleSearch('홍') 호출
    fireEvent.change(input, { target: { value: '홍' } }); // triggerSearchDebounced 등록

    // 디바운스 타이머 실행 → 동일 값이므로 lastTriggeredRef에 의해 차단
    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });
});

// ── 디바운스 타이밍 ───────────────────────────────────────────────────────────

describe('디바운스 (300ms)', () => {
  test('입력 직후 검색을 수행하지 않는다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'abc' } });

    expect(mockHandleSearch).not.toHaveBeenCalled();
  });

  test('299ms 시점에는 검색을 수행하지 않는다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'abc' } });
    act(() => { jest.advanceTimersByTime(299); });

    expect(mockHandleSearch).not.toHaveBeenCalled();
  });

  test('300ms 경과 후 검색을 수행한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'abc' } });
    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledWith('abc');
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });

  test('compositionEnd는 디바운스 없이 즉시 검색한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.compositionEnd(input);

    // 타이머 진행 없이도 즉시 호출됨
    expect(mockHandleSearch).toHaveBeenCalledWith('홍');
  });

  test('compositionEnd가 진행 중인 디바운스 타이머를 취소한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    // 영문 입력 → 디바운스 타이머 등록
    fireEvent.change(input, { target: { value: 'O' } });

    // 한글 조합 완료 → 디바운스 취소 + 즉시 '홍' 검색
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    fireEvent.compositionEnd(input);

    // 취소된 'O' 디바운스가 나중에 실행되지 않아야 함
    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
    expect(mockHandleSearch).toHaveBeenCalledWith('홍');
  });
});

// ── 공백 처리 ─────────────────────────────────────────────────────────────────

describe('공백 처리 (모든 공백 제거)', () => {
  test('앞뒤 공백을 제거한 값으로 검색한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: '  홍길동  ' } });
    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledWith('홍길동');
  });

  test('중간 공백도 모두 제거한 값으로 검색한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: '홍 길 동' } });
    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).toHaveBeenCalledWith('홍길동');
  });

  test('공백만 있는 입력은 검색하지 않는다', () => {
    // filter.search가 ''인 상태에서 공백 입력 → '' → lastTriggeredRef('')와 동일 → 차단
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: '   ' } });
    act(() => { jest.advanceTimersByTime(300); });

    expect(mockHandleSearch).not.toHaveBeenCalled();
  });

  test('입력창에는 공백 포함 원본값이 표시된다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: '홍 길 동' } });

    // inputValue는 공백 제거 없이 원본 표시 (사용자가 타이핑 중임을 반영)
    expect(input).toHaveValue('홍 길 동');
  });

  test('compositionEnd에서도 모든 공백을 제거한 값으로 검색한다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: ' 홍 길 ' } });
    fireEvent.compositionEnd(input);

    expect(mockHandleSearch).toHaveBeenCalledWith('홍길');
  });
});

// ── 입력값 보존 (URL 업데이트에 의한 텍스트 소실 방지) ─────────────────────────

describe('입력값 보존', () => {
  test('URL filter.search가 바뀌어도 사용자가 입력한 inputValue를 덮어쓰지 않는다', () => {
    const { rerender } = render(<OrderTable orders={MOCK_ORDERS} />);
    const input = screen.getByRole('searchbox');

    // 사용자가 'ab' 입력
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(input).toHaveValue('ab');

    // URL이 'a'로 갱신됨 (이전 keystroke의 지연 응답)
    mockFilterReturn({
      filter: {
        search: 'a',
        orderStatus: 'all',
        paymentStatus: 'all',
        shippingStatus: 'all',
        paymentMethod: 'all',
      },
    });
    rerender(<OrderTable orders={MOCK_ORDERS} />);

    // inputValue는 사용자가 마지막으로 입력한 'ab'를 유지해야 함
    expect(input).toHaveValue('ab');
  });

  test('페이지 최초 진입 시 URL 검색어로 입력창을 초기화한다', () => {
    mockFilterReturn({
      filter: {
        search: '홍길동',
        orderStatus: 'all',
        paymentStatus: 'all',
        shippingStatus: 'all',
        paymentMethod: 'all',
      },
    });
    render(<OrderTable orders={MOCK_ORDERS} />);

    expect(screen.getByRole('searchbox')).toHaveValue('홍길동');
  });
});

// ── 상태 필터 ─────────────────────────────────────────────────────────────────

describe('상태 필터', () => {
  test('주문 상태 필터 select 변경 시 handleOrderStatusChange가 호출된다', () => {
    render(<OrderTable orders={MOCK_ORDERS} />);
    const select = screen.getByRole('combobox', { name: '주문 상태 필터' });

    fireEvent.change(select, { target: { value: 'order_confirmed' } });

    expect(mockHandleOrderStatus).toHaveBeenCalledWith('order_confirmed');
  });
});

describe('orders variant API 결과 표시', () => {
  test('orders variant에서는 내부 검색 필터를 다시 적용하지 않는다', () => {
    mockFilterReturn({
      filter: {
        search: '없는 주문',
        orderStatus: 'all',
        paymentStatus: 'all',
        shippingStatus: 'all',
        paymentMethod: 'all',
      },
    });

    render(<OrderTable orders={MOCK_ORDERS} variant="orders" />);

    expect(screen.getAllByText('ORD-20260001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ORD-20260002').length).toBeGreaterThan(0);
  });
});
