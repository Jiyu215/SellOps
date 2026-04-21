/**
 * productDetailMockData 유닛 테스트
 *
 * MOCK_PRODUCT_DETAIL, MOCK_STOCK_HISTORY, MOCK_PRODUCT_DETAIL_MAP의
 * 데이터 무결성 및 구조를 검증합니다.
 */

import {
  MOCK_PRODUCT_DETAIL,
  MOCK_STOCK_HISTORY,
  MOCK_PRODUCT_DETAIL_MAP,
} from './productDetailMockData';

// ─────────────────────────────────────────────────────────────────────────────

describe('MOCK_PRODUCT_DETAIL', () => {
  test('id가 비어 있지 않은 문자열이다', () => {
    expect(typeof MOCK_PRODUCT_DETAIL.id).toBe('string');
    expect(MOCK_PRODUCT_DETAIL.id.length).toBeGreaterThan(0);
  });

  test('id 값은 "prod-001"이다', () => {
    expect(MOCK_PRODUCT_DETAIL.id).toBe('prod-001');
  });

  test('productCode 값은 "KB-MXS-BLK"이다', () => {
    expect(MOCK_PRODUCT_DETAIL.productCode).toBe('KB-MXS-BLK');
  });

  test('name이 비어 있지 않다', () => {
    expect(MOCK_PRODUCT_DETAIL.name.length).toBeGreaterThan(0);
  });

  test('price는 양의 정수이다', () => {
    expect(Number.isInteger(MOCK_PRODUCT_DETAIL.price)).toBe(true);
    expect(MOCK_PRODUCT_DETAIL.price).toBeGreaterThan(0);
  });

  test('status는 valid한 ProductStatus이다', () => {
    const validStatuses = ['active', 'hidden', 'sold_out'];
    expect(validStatuses).toContain(MOCK_PRODUCT_DETAIL.status);
  });

  test('status는 "active"이다', () => {
    expect(MOCK_PRODUCT_DETAIL.status).toBe('active');
  });

  test('stock 객체에 total, sold, available 필드가 있다', () => {
    expect(MOCK_PRODUCT_DETAIL.stock).toHaveProperty('total');
    expect(MOCK_PRODUCT_DETAIL.stock).toHaveProperty('sold');
    expect(MOCK_PRODUCT_DETAIL.stock).toHaveProperty('available');
  });

  test('stock.total은 0 이상의 정수이다', () => {
    expect(Number.isInteger(MOCK_PRODUCT_DETAIL.stock.total)).toBe(true);
    expect(MOCK_PRODUCT_DETAIL.stock.total).toBeGreaterThanOrEqual(0);
  });

  test('stock.available은 stock.total 이하이다', () => {
    expect(MOCK_PRODUCT_DETAIL.stock.available).toBeLessThanOrEqual(
      MOCK_PRODUCT_DETAIL.stock.total,
    );
  });

  test('images는 배열이다', () => {
    expect(Array.isArray(MOCK_PRODUCT_DETAIL.images)).toBe(true);
  });

  test('images 각 항목에 id, type, url, fileName, fileSize가 있다', () => {
    for (const img of MOCK_PRODUCT_DETAIL.images) {
      expect(img).toHaveProperty('id');
      expect(img).toHaveProperty('type');
      expect(img).toHaveProperty('url');
      expect(img).toHaveProperty('fileName');
      expect(img).toHaveProperty('fileSize');
    }
  });

  test('images의 type은 valid한 ImageType이다', () => {
    const validTypes = ['main', 'list', 'small', 'thumbnail', 'extra'];
    for (const img of MOCK_PRODUCT_DETAIL.images) {
      expect(validTypes).toContain(img.type);
    }
  });

  test('createdAt은 유효한 ISO 8601 문자열이다', () => {
    const d = new Date(MOCK_PRODUCT_DETAIL.createdAt);
    expect(d.toString()).not.toBe('Invalid Date');
    expect(MOCK_PRODUCT_DETAIL.createdAt).toContain('T');
  });

  test('updatedAt은 유효한 ISO 8601 문자열이다', () => {
    const d = new Date(MOCK_PRODUCT_DETAIL.updatedAt);
    expect(d.toString()).not.toBe('Invalid Date');
  });

  test('createdBy는 비어 있지 않은 문자열이다', () => {
    expect(typeof MOCK_PRODUCT_DETAIL.createdBy).toBe('string');
    expect(MOCK_PRODUCT_DETAIL.createdBy.length).toBeGreaterThan(0);
  });

  test('summary는 문자열이다', () => {
    expect(typeof MOCK_PRODUCT_DETAIL.summary).toBe('string');
  });

  test('shortDescription은 문자열이다', () => {
    expect(typeof MOCK_PRODUCT_DETAIL.shortDescription).toBe('string');
  });

  test('description은 문자열이다', () => {
    expect(typeof MOCK_PRODUCT_DETAIL.description).toBe('string');
  });

  test('category는 비어 있지 않은 문자열이다', () => {
    expect(typeof MOCK_PRODUCT_DETAIL.category).toBe('string');
    expect(MOCK_PRODUCT_DETAIL.category.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MOCK_STOCK_HISTORY', () => {
  test('배열이다', () => {
    expect(Array.isArray(MOCK_STOCK_HISTORY)).toBe(true);
  });

  test('8개의 이력이 있다', () => {
    expect(MOCK_STOCK_HISTORY.length).toBe(8);
  });

  test('각 항목에 id, type, quantity, operator, createdAt이 있다', () => {
    for (const item of MOCK_STOCK_HISTORY) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('operator');
      expect(item).toHaveProperty('createdAt');
    }
  });

  test('type은 모두 "in" 또는 "out"이다', () => {
    for (const item of MOCK_STOCK_HISTORY) {
      expect(['in', 'out']).toContain(item.type);
    }
  });

  test('quantity는 모두 양의 정수이다', () => {
    for (const item of MOCK_STOCK_HISTORY) {
      expect(Number.isInteger(item.quantity)).toBe(true);
      expect(item.quantity).toBeGreaterThan(0);
    }
  });

  test('id는 모두 고유하다', () => {
    const ids = MOCK_STOCK_HISTORY.map((h) => h.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('createdAt은 모두 유효한 ISO 8601 문자열이다', () => {
    for (const item of MOCK_STOCK_HISTORY) {
      const d = new Date(item.createdAt);
      expect(d.toString()).not.toBe('Invalid Date');
    }
  });

  test('입고(in) 이력이 최소 1건 이상 있다', () => {
    const inItems = MOCK_STOCK_HISTORY.filter((h) => h.type === 'in');
    expect(inItems.length).toBeGreaterThan(0);
  });

  test('출고(out) 이력이 최소 1건 이상 있다', () => {
    const outItems = MOCK_STOCK_HISTORY.filter((h) => h.type === 'out');
    expect(outItems.length).toBeGreaterThan(0);
  });

  test('첫 번째 이력의 reason은 "초기 입고"이다', () => {
    expect(MOCK_STOCK_HISTORY[0].reason).toBe('초기 입고');
  });

  test('operator는 비어 있지 않은 문자열이다', () => {
    for (const item of MOCK_STOCK_HISTORY) {
      expect(typeof item.operator).toBe('string');
      expect(item.operator.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MOCK_PRODUCT_DETAIL_MAP', () => {
  test('Map 인스턴스이다', () => {
    expect(MOCK_PRODUCT_DETAIL_MAP).toBeInstanceOf(Map);
  });

  test('최소 1개의 항목을 포함한다', () => {
    expect(MOCK_PRODUCT_DETAIL_MAP.size).toBeGreaterThanOrEqual(1);
  });

  test('"prod-001" 키가 존재한다', () => {
    expect(MOCK_PRODUCT_DETAIL_MAP.has('prod-001')).toBe(true);
  });

  test('"prod-001" 값이 MOCK_PRODUCT_DETAIL과 동일한 객체이다', () => {
    const mapValue = MOCK_PRODUCT_DETAIL_MAP.get('prod-001');
    expect(mapValue).toBe(MOCK_PRODUCT_DETAIL);
  });

  test('Map의 각 값은 필수 ProductDetail 필드를 갖는다', () => {
    for (const detail of MOCK_PRODUCT_DETAIL_MAP.values()) {
      expect(detail).toHaveProperty('id');
      expect(detail).toHaveProperty('productCode');
      expect(detail).toHaveProperty('name');
      expect(detail).toHaveProperty('price');
      expect(detail).toHaveProperty('status');
      expect(detail).toHaveProperty('stock');
      expect(detail).toHaveProperty('images');
      expect(detail).toHaveProperty('createdAt');
      expect(detail).toHaveProperty('updatedAt');
      expect(detail).toHaveProperty('createdBy');
    }
  });

  test('Map의 key는 해당 상품의 id와 일치한다', () => {
    for (const [key, detail] of MOCK_PRODUCT_DETAIL_MAP.entries()) {
      expect(key).toBe(detail.id);
    }
  });
});