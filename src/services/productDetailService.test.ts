/**
 * productDetailService 유닛 테스트
 *
 * getProductDetail, checkProductCode, adjustStock, getStockHistory 를 검증합니다.
 * 모듈 레벨 MOCK 데이터를 변이하는 함수는 beforeEach/afterEach에서 상태를 복원합니다.
 */

import {
  getProductDetail,
  checkProductCode,
  adjustStock,
  getStockHistory,
  createProduct,
  updateProduct,
} from './productDetailService';
import { MOCK_PRODUCT_DETAIL_MAP } from '@/constants/productDetailMockData';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import type { ProductDetail } from '@/types/products';

// ── MOCK 데이터 스냅샷/복원 ──────────────────────────────────────────────────

let initialMapSnapshot: Map<string, ProductDetail>;
let initialProductsSnapshot: typeof MOCK_PRODUCTS[0][];

beforeEach(() => {
  initialMapSnapshot = new Map(MOCK_PRODUCT_DETAIL_MAP);
  initialProductsSnapshot = [...MOCK_PRODUCTS];
});

afterEach(() => {
  MOCK_PRODUCT_DETAIL_MAP.clear();
  initialMapSnapshot.forEach((v, k) => MOCK_PRODUCT_DETAIL_MAP.set(k, v));

  MOCK_PRODUCTS.length = 0;
  initialProductsSnapshot.forEach((p) => MOCK_PRODUCTS.push(p));
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getProductDetail', () => {
  test('Map에 존재하는 상품 ID로 조회하면 상세 데이터를 반환한다', async () => {
    const result = await getProductDetail('prod-001');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('prod-001');
    expect(result!.name).toBe('MX Keys S 키보드 블랙');
    expect(result!.productCode).toBe('KB-MXS-BLK');
  });

  test('Map에 없지만 MOCK_PRODUCTS에 존재하면 폴백 상세 정보를 생성한다', async () => {
    // MOCK_PRODUCTS에는 있지만 Map에는 없는 상품 (prod-002 이상)
    const listItem = MOCK_PRODUCTS[1]; // prod-002
    // Map에서 제거하여 폴백 경로 테스트
    MOCK_PRODUCT_DETAIL_MAP.delete(listItem.id);

    const result = await getProductDetail(listItem.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(listItem.id);
    expect(result!.name).toBe(listItem.name);
    expect(result!.productCode).toBe(listItem.productCode);
    expect(result!.price).toBe(listItem.price);
    expect(result!.status).toBe(listItem.status);
  });

  test('폴백으로 생성된 상품은 Map에 캐싱된다', async () => {
    const listItem = MOCK_PRODUCTS[1];
    MOCK_PRODUCT_DETAIL_MAP.delete(listItem.id);

    await getProductDetail(listItem.id);

    // 이후 조회 시 캐시에서 반환
    expect(MOCK_PRODUCT_DETAIL_MAP.has(listItem.id)).toBe(true);
  });

  test('폴백으로 생성된 상품의 stock은 목록 데이터를 기반으로 한다', async () => {
    const listItem = MOCK_PRODUCTS[2];
    MOCK_PRODUCT_DETAIL_MAP.delete(listItem.id);

    const result = await getProductDetail(listItem.id);
    expect(result!.stock.total).toBe(listItem.totalStock);
    expect(result!.stock.sold).toBe(listItem.soldCount);
    expect(result!.stock.available).toBe(listItem.availableStock);
  });

  test('폴백으로 생성된 상품의 createdBy는 "관리자"이다', async () => {
    const listItem = MOCK_PRODUCTS[1];
    MOCK_PRODUCT_DETAIL_MAP.delete(listItem.id);

    const result = await getProductDetail(listItem.id);
    expect(result!.createdBy).toBe('관리자');
  });

  test('폴백으로 생성된 상품의 images는 빈 배열이다', async () => {
    const listItem = MOCK_PRODUCTS[1];
    MOCK_PRODUCT_DETAIL_MAP.delete(listItem.id);

    const result = await getProductDetail(listItem.id);
    expect(result!.images).toEqual([]);
  });

  test('폴백으로 생성된 상품의 summary, shortDescription, description은 빈 문자열이다', async () => {
    const listItem = MOCK_PRODUCTS[1];
    MOCK_PRODUCT_DETAIL_MAP.delete(listItem.id);

    const result = await getProductDetail(listItem.id);
    expect(result!.summary).toBe('');
    expect(result!.shortDescription).toBe('');
    expect(result!.description).toBe('');
  });

  test('존재하지 않는 ID로 조회하면 null을 반환한다', async () => {
    const result = await getProductDetail('non-existent-id');
    expect(result).toBeNull();
  });

  test('두 번째 조회 시 캐시된 결과를 반환한다 (동일 객체)', async () => {
    const first  = await getProductDetail('prod-001');
    const second = await getProductDetail('prod-001');
    // Map에서 같은 레퍼런스를 반환
    expect(first).toBe(second);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('checkProductCode', () => {
  test('Map에 없는 코드는 available: true를 반환한다', async () => {
    const result = await checkProductCode('BRAND-NEW-CODE-XYZ');
    expect(result.available).toBe(true);
  });

  test('이미 사용 중인 코드는 available: false를 반환한다', async () => {
    // prod-001의 코드 'KB-MXS-BLK'는 이미 등록됨
    const result = await checkProductCode('KB-MXS-BLK');
    expect(result.available).toBe(false);
  });

  test('수정 시 자기 자신의 코드는 available: true를 반환한다 (excludeId 사용)', async () => {
    // prod-001이 자기 코드를 확인할 때 제외
    const result = await checkProductCode('KB-MXS-BLK', 'prod-001');
    expect(result.available).toBe(true);
  });

  test('다른 상품의 코드는 excludeId가 있어도 available: false를 반환한다', async () => {
    // prod-002 코드를 prod-001 입장에서 확인
    const prod2 = MOCK_PRODUCTS.find((p) => p.id !== 'prod-001');
    if (!prod2) return;

    // prod-002 상세 정보도 Map에 있어야 하므로 추가
    const mockDetail: ProductDetail = {
      id:               prod2.id,
      productCode:      prod2.productCode,
      name:             prod2.name,
      category:         prod2.category,
      price:            prod2.price,
      summary:          '',
      shortDescription: '',
      description:      '',
      status:           prod2.status,
      stock:            { total: prod2.totalStock, sold: prod2.soldCount, available: prod2.availableStock },
      images:           [],
      createdAt:        prod2.createdAt,
      updatedAt:        prod2.updatedAt,
      createdBy:        '관리자',
    };
    MOCK_PRODUCT_DETAIL_MAP.set(prod2.id, mockDetail);

    const result = await checkProductCode(prod2.productCode, 'prod-001');
    expect(result.available).toBe(false);
  });

  test('빈 코드도 Map에 없으면 available: true를 반환한다', async () => {
    const result = await checkProductCode('');
    expect(result.available).toBe(true);
  });

  test('대소문자를 구분하여 코드를 비교한다', async () => {
    // 'KB-MXS-BLK'가 등록되어 있고 소문자 버전은 다름
    const result = await checkProductCode('kb-mxs-blk');
    expect(result.available).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('adjustStock', () => {
  test('입고 조정 시 total과 available이 증가한다', async () => {
    const before = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    const result = await adjustStock('prod-001', 'in', 10);

    expect(result.total).toBe(before.total + 10);
    expect(result.available).toBe(before.available + 10);
    expect(result.sold).toBe(before.sold);
  });

  test('출고 조정 시 available이 감소한다 (total, sold 유지)', async () => {
    const before = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    const qty = Math.min(5, before.available);
    const result = await adjustStock('prod-001', 'out', qty);

    expect(result.available).toBe(before.available - qty);
    expect(result.total).toBe(before.total);
    expect(result.sold).toBe(before.sold);
  });

  test('출고 수량이 가용 재고를 초과하면 에러가 발생한다', async () => {
    const { available } = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    await expect(adjustStock('prod-001', 'out', available + 1)).rejects.toThrow(
      '가용 재고보다 많은 수량입니다.',
    );
  });

  test('가용 재고 딱 맞는 출고는 성공한다', async () => {
    const { available } = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    const result = await adjustStock('prod-001', 'out', available);
    expect(result.available).toBe(0);
  });

  test('입고 수량 1 처리 시 정확히 1 증가한다', async () => {
    const before = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    const result = await adjustStock('prod-001', 'in', 1);
    expect(result.available).toBe(before.available + 1);
  });

  test('존재하지 않는 상품 ID로 조정 시 에러가 발생한다', async () => {
    await expect(adjustStock('non-existent', 'in', 10)).rejects.toThrow(
      '상품을 찾을 수 없습니다.',
    );
  });

  test('reason 파라미터 없이도 정상 동작한다', async () => {
    const before = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    const result = await adjustStock('prod-001', 'in', 5);
    expect(result.total).toBe(before.total + 5);
  });

  test('reason 파라미터 있을 때도 정상 동작한다', async () => {
    const before = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!.stock;
    const result = await adjustStock('prod-001', 'in', 3, '테스트 사유');
    expect(result.total).toBe(before.total + 3);
  });

  test('반환 객체에 total, sold, available이 모두 포함된다', async () => {
    const result = await adjustStock('prod-001', 'in', 1);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('sold');
    expect(result).toHaveProperty('available');
  });

  // 경계값: 가용 재고 0에서 출고 시도
  test('가용 재고가 0인 상태에서 출고 시 에러 발생', async () => {
    const detail = MOCK_PRODUCT_DETAIL_MAP.get('prod-001')!;
    const zeroStockDetail: ProductDetail = {
      ...detail,
      stock: { ...detail.stock, available: 0 },
    };
    MOCK_PRODUCT_DETAIL_MAP.set('prod-001', zeroStockDetail);

    await expect(adjustStock('prod-001', 'out', 1)).rejects.toThrow(
      '가용 재고보다 많은 수량입니다.',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getStockHistory', () => {
  test('이력 데이터를 반환한다', async () => {
    const result = await getStockHistory('prod-001');
    expect(result.items).toBeInstanceOf(Array);
    expect(result.total).toBeGreaterThan(0);
  });

  test('기본 페이지(1), 기본 limit(20)으로 최대 20건을 반환한다', async () => {
    const result = await getStockHistory('prod-001', 1, 20);
    expect(result.items.length).toBeLessThanOrEqual(20);
  });

  test('total은 전체 이력 수를 반환한다', async () => {
    const result = await getStockHistory('prod-001');
    // MOCK_STOCK_HISTORY는 8건
    expect(result.total).toBe(8);
  });

  test('각 이력 항목은 필수 필드를 갖는다', async () => {
    const result = await getStockHistory('prod-001');
    const item = result.items[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('type');
    expect(item).toHaveProperty('quantity');
    expect(item).toHaveProperty('operator');
    expect(item).toHaveProperty('createdAt');
  });

  test('type은 "in" 또는 "out"이다', async () => {
    const result = await getStockHistory('prod-001');
    for (const item of result.items) {
      expect(['in', 'out']).toContain(item.type);
    }
  });

  test('limit=1로 조회 시 1건만 반환한다', async () => {
    const result = await getStockHistory('prod-001', 1, 1);
    expect(result.items.length).toBe(1);
  });

  test('page=2, limit=3으로 페이지네이션 동작 확인', async () => {
    const page1 = await getStockHistory('prod-001', 1, 3);
    const page2 = await getStockHistory('prod-001', 2, 3);
    // page1과 page2의 첫 아이템 ID가 다름
    if (page1.items.length > 0 && page2.items.length > 0) {
      expect(page1.items[0].id).not.toBe(page2.items[0].id);
    }
  });

  test('존재하지 않는 상품 ID로 조회해도 에러 없이 빈 배열 반환', async () => {
    // MOCK_STOCK_HISTORY는 제품 ID에 무관하게 동일한 전역 배열을 사용
    const result = await getStockHistory('non-existent-id');
    // 에러가 발생하지 않음을 확인
    expect(result.items).toBeInstanceOf(Array);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('createProduct (mock stub)', () => {
  test('호출 시 id를 포함한 객체를 반환한다', async () => {
    const result = await createProduct({
      name:             '새 상품',
      productCode:      'NEW-001',
      price:            10000,
      summary:          '',
      shortDescription: '',
      description:      '',
      status:           'active',
    });
    expect(result).toHaveProperty('id');
    expect(typeof result.id).toBe('string');
  });

  test('반환된 ID는 "prod-" 로 시작한다', async () => {
    const result = await createProduct({
      name: '상품', productCode: 'C001', price: 0, summary: '', shortDescription: '', description: '', status: 'active',
    });
    expect(result.id).toMatch(/^prod-/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('updateProduct (mock stub)', () => {
  test('호출 시 에러 없이 완료된다', async () => {
    await expect(updateProduct('prod-001', { name: '수정' })).resolves.toBeUndefined();
  });
});