/**
 * productDetailService 유닛 테스트
 *
 * Supabase 마이그레이션 후 서비스 함수들은 HTTP fetch를 통해 API Routes를 호출한다.
 * 각 테스트에서 global fetch를 mock하여 실제 네트워크 호출 없이 검증한다.
 *
 * getProductDetail → src/dal/products.ts 로 이동됨 (server-only DAL)
 */

import {
  checkProductCode,
  adjustStock,
  getStockHistory,
  createProduct,
  updateProduct,
} from './productDetailService';

// ── fetch mock 설정 ───────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('checkProductCode', () => {
  test('사용 가능한 코드에 대해 available: true를 반환한다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ available: true }));

    const result = await checkProductCode('BRAND-NEW-CODE');
    expect(result.available).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('check-code'),
    );
  });

  test('이미 사용 중인 코드에 대해 available: false를 반환한다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ available: false }));

    const result = await checkProductCode('KB-MXS-BLK');
    expect(result.available).toBe(false);
  });

  test('excludeId를 쿼리 파라미터로 전달한다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ available: true }));

    await checkProductCode('KB-MXS-BLK', 'prod-001');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('excludeId=prod-001'),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('adjustStock', () => {
  test('입고 조정 시 응답 재고 데이터를 반환한다', async () => {
    const mockStock = { total: 110, sold: 50, available: 60 };
    mockFetch.mockReturnValueOnce(mockResponse(mockStock));

    const result = await adjustStock('prod-001', 'in', 10);
    expect(result.total).toBe(110);
    expect(result.available).toBe(60);
    expect(result.sold).toBe(50);
  });

  test('출고 조정 시 응답 재고 데이터를 반환한다', async () => {
    const mockStock = { total: 100, sold: 50, available: 45 };
    mockFetch.mockReturnValueOnce(mockResponse(mockStock));

    const result = await adjustStock('prod-001', 'out', 5);
    expect(result.available).toBe(45);
  });

  test('API 에러 시 예외를 던진다', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ error: '가용 재고보다 많은 수량입니다.' }, false, 400),
    );

    await expect(adjustStock('prod-001', 'out', 9999)).rejects.toThrow(
      '가용 재고보다 많은 수량입니다.',
    );
  });

  test('type, quantity, reason을 body에 포함하여 POST 요청한다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ total: 100, sold: 50, available: 55 }));

    await adjustStock('prod-001', 'in', 5, '테스트 사유');

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.type).toBe('in');
    expect(body.quantity).toBe(5);
    expect(body.reason).toBe('테스트 사유');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getStockHistory', () => {
  test('이력 데이터와 total을 반환한다', async () => {
    const mockHistory = {
      items: [
        { product_id: 'prod-001', type: 'in', quantity: 100, reason: null, created_at: '2024-01-01T00:00:00Z' },
      ],
      total: 1,
    };
    mockFetch.mockReturnValueOnce(mockResponse(mockHistory));

    const result = await getStockHistory('prod-001');
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  test('각 이력 항목이 필수 필드를 갖는다', async () => {
    const mockHistory = {
      items: [
        { product_id: 'prod-001', type: 'in', quantity: 10, reason: '초기 입고', created_at: '2024-01-01T00:00:00Z' },
      ],
      total: 1,
    };
    mockFetch.mockReturnValueOnce(mockResponse(mockHistory));

    const result = await getStockHistory('prod-001');
    const item = result.items[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('type');
    expect(item).toHaveProperty('quantity');
    expect(item).toHaveProperty('operator');
    expect(item).toHaveProperty('createdAt');
  });

  test('page, limit을 쿼리 파라미터로 전달한다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ items: [], total: 0 }));

    await getStockHistory('prod-001', 2, 10);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('createProduct', () => {
  test('생성된 상품 id를 반환한다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 'new-prod-123' }, true, 201));

    const result = await createProduct({
      name:             '새 상품',
      productCode:      'NEW-001',
      price:            10000,
      summary:          '요약',
      shortDescription: '간단 설명',
      description:      '상세 설명',
      status:           'active',
    });

    expect(result.id).toBe('new-prod-123');
  });

  test('API 에러 시 예외를 던진다', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ error: '이미 사용 중인 상품코드입니다.' }, false, 409),
    );

    await expect(
      createProduct({
        name: '상품', productCode: 'DUP-001', price: 0,
        summary: '', shortDescription: '', description: '', status: 'active',
      }),
    ).rejects.toThrow('이미 사용 중인 상품코드입니다.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('updateProduct', () => {
  test('성공 시 에러 없이 완료된다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}, true, 200));

    await expect(updateProduct('prod-001', { name: '수정된 상품명' })).resolves.toBeUndefined();
  });

  test('API 에러 시 예외를 던진다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}, false, 500));

    await expect(updateProduct('prod-001', { name: '수정' })).rejects.toThrow();
  });
});
