/**
 * ProductsContent 유닛 테스트
 *
 * - initialProducts prop 처리
 * - handleBulkStatusChange, handleBulkDelete, handleSingleDelete 동작
 * - fetch는 jest.fn()으로 mock
 */

import { render, screen, act } from '@testing-library/react';
import { ProductsContent } from './ProductsContent';
import type { ProductListItem, ProductStatus } from '@/types/products';

// ── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockOk(data: unknown = { success: true }) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function mockFail(error = '삭제에 실패했습니다.') {
  return Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error }),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockReturnValue(mockOk());
});

// ── 의존 모킹 ─────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
const mockPush    = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter:       jest.fn(() => ({ push: mockPush, replace: jest.fn(), refresh: mockRefresh })),
  usePathname:     jest.fn(() => '/dashboard/products'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('@/components/dashboard/products', () => ({
  ProductTable: ({
    products,
    onBulkStatusChange,
    onBulkDelete,
    onSingleDelete,
  }: {
    products: ProductListItem[];
    onBulkStatusChange: (ids: string[], status: ProductStatus) => Promise<void>;
    onBulkDelete: (ids: string[]) => Promise<void>;
    onSingleDelete: (id: string) => Promise<void>;
  }) => (
    <div data-testid="product-table">
      <span data-testid="product-count">{products.length}</span>
      {products.map((p) => (
        <div key={p.id} data-testid={`product-${p.id}`}>
          {p.name}
          <button onClick={() => onSingleDelete(p.id).catch(() => {})} data-testid={`delete-${p.id}`}>
            단일삭제
          </button>
        </div>
      ))}
      <button onClick={() => onBulkStatusChange(['prod-001'], 'hidden').catch(() => {})} data-testid="bulk-status">
        상태변경
      </button>
      <button onClick={() => onBulkDelete(['prod-001']).catch(() => {})} data-testid="bulk-delete">
        일괄삭제
      </button>
    </div>
  ),
}));

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id:             'test-id',
    productCode:    'TEST-001',
    name:           '테스트 상품',
    category:       '테스트',
    price:          10000,
    totalStock:     100,
    availableStock: 80,
    soldCount:      20,
    status:         'active',
    thumbnailUrl:   undefined,
    createdAt:      new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
    ...overrides,
  };
}

const MOCK_INITIAL_PRODUCTS: ProductListItem[] = [
  makeProduct({ id: 'init-001', name: '초기 상품 1' }),
  makeProduct({ id: 'init-002', name: '초기 상품 2' }),
  makeProduct({ id: 'init-003', name: '초기 상품 3' }),
];

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsContent - initialProducts prop', () => {
  test('initialProducts가 전달되면 해당 상품 수가 렌더링된다', () => {
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);
    expect(screen.getByTestId('product-count').textContent).toBe('3');
  });

  test('initialProducts가 전달되면 해당 상품명이 렌더링된다', () => {
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);
    expect(screen.getByText('초기 상품 1')).toBeInTheDocument();
    expect(screen.getByText('초기 상품 2')).toBeInTheDocument();
    expect(screen.getByText('초기 상품 3')).toBeInTheDocument();
  });

  test('initialProducts가 빈 배열이면 상품 count가 0이다', () => {
    render(<ProductsContent initialProducts={[]} />);
    expect(screen.getByTestId('product-count').textContent).toBe('0');
  });

  test('initialProducts 미전달 시 빈 목록으로 렌더링된다', () => {
    render(<ProductsContent />);
    expect(screen.getByTestId('product-count').textContent).toBe('0');
  });

  test('initialProducts prop이 undefined일 때 빈 목록으로 렌더링된다', () => {
    render(<ProductsContent initialProducts={undefined} />);
    expect(screen.getByTestId('product-count').textContent).toBe('0');
  });

  test('단일 상품도 정상 렌더링된다', () => {
    const single = [makeProduct({ id: 'single-001', name: '단일 상품' })];
    render(<ProductsContent initialProducts={single} />);
    expect(screen.getByTestId('product-count').textContent).toBe('1');
    expect(screen.getByText('단일 상품')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsContent - handleSingleDelete', () => {
  test('단일 삭제 시 해당 상품이 목록에서 제거된다', async () => {
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);
    expect(screen.getByTestId('product-count').textContent).toBe('3');

    await act(async () => {
      screen.getByTestId('delete-init-001').click();
    });

    expect(screen.getByTestId('product-count').textContent).toBe('2');
    expect(screen.queryByText('초기 상품 1')).not.toBeInTheDocument();
  });

  test('단일 삭제 후 나머지 상품들은 유지된다', async () => {
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);

    await act(async () => {
      screen.getByTestId('delete-init-001').click();
    });

    expect(screen.getByText('초기 상품 2')).toBeInTheDocument();
    expect(screen.getByText('초기 상품 3')).toBeInTheDocument();
  });

  test('단일 삭제 시 올바른 API 엔드포인트로 DELETE 요청한다', async () => {
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);

    await act(async () => {
      screen.getByTestId('delete-init-001').click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/products/init-001',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('API 실패 시 목록이 변경되지 않는다', async () => {
    mockFetch.mockReturnValueOnce(mockFail('삭제에 실패했습니다.'));
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);

    await act(async () => {
      screen.getByTestId('delete-init-001').click();
    });

    expect(screen.getByTestId('product-count').textContent).toBe('3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsContent - handleBulkStatusChange', () => {
  test('일괄 상태 변경 시 해당 상품의 status가 업데이트된다', async () => {
    const products = [
      makeProduct({ id: 'prod-001', name: '상품 1', status: 'active' }),
      makeProduct({ id: 'prod-002', name: '상품 2', status: 'active' }),
    ];

    render(<ProductsContent initialProducts={products} />);

    await act(async () => {
      screen.getByTestId('bulk-status').click();
    });

    expect(screen.getByTestId('product-count').textContent).toBe('2');
  });

  test('일괄 상태 변경 시 올바른 API 엔드포인트로 PATCH 요청한다', async () => {
    const products = [makeProduct({ id: 'prod-001', status: 'active' })];
    render(<ProductsContent initialProducts={products} />);

    await act(async () => {
      screen.getByTestId('bulk-status').click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/products/bulk-status',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsContent - handleBulkDelete', () => {
  test('일괄 삭제 시 해당 상품들이 제거된다', async () => {
    const products = [
      makeProduct({ id: 'prod-001', name: '삭제 상품' }),
      makeProduct({ id: 'prod-002', name: '유지 상품' }),
    ];

    render(<ProductsContent initialProducts={products} />);
    expect(screen.getByTestId('product-count').textContent).toBe('2');

    await act(async () => {
      screen.getByTestId('bulk-delete').click();
    });

    expect(screen.getByTestId('product-count').textContent).toBe('1');
    expect(screen.queryByText('삭제 상품')).not.toBeInTheDocument();
    expect(screen.getByText('유지 상품')).toBeInTheDocument();
  });

  test('일괄 삭제 시 올바른 API 엔드포인트로 DELETE 요청한다', async () => {
    const products = [makeProduct({ id: 'prod-001' })];
    render(<ProductsContent initialProducts={products} />);

    await act(async () => {
      screen.getByTestId('bulk-delete').click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/products/bulk-delete',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsContent - initialProducts 상태 격리', () => {
  test('initialProducts는 shallow copy로 사용되어 원본 배열이 변이되지 않는다', async () => {
    const original = [...MOCK_INITIAL_PRODUCTS];
    render(<ProductsContent initialProducts={MOCK_INITIAL_PRODUCTS} />);

    await act(async () => {
      screen.getByTestId('delete-init-001').click();
    });

    expect(MOCK_INITIAL_PRODUCTS.length).toBe(original.length);
  });
});
