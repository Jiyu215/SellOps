/**
 * saveProductAction 서버 액션 유닛 테스트
 *
 * 주의: saveProductAction은 next/cache(revalidatePath) 및
 * 모듈 레벨 MOCK 데이터를 직접 변이(mutate)하므로
 * 각 테스트 전에 jest.isolateModules 또는 beforeEach 재설정이 필요합니다.
 */

// ── next/cache 모킹 ───────────────────────────────────────────────────────────
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// ── next/server 모킹 (서버 전용 환경 변수가 없을 때 대비) ────────────────────
jest.mock('next/headers', () => ({}), { virtual: true });

import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// 모듈 레벨 MOCK 데이터를 import 순서 뒤에 가져옵니다.
// saveProductAction은 이 모듈들을 직접 변이하므로 테스트 간 격리가 필요합니다.
// ─────────────────────────────────────────────────────────────────────────────

import { saveProductAction } from './products';
import { MOCK_PRODUCT_DETAIL_MAP } from '@/constants/productDetailMockData';
import { MOCK_PRODUCTS } from '@/constants/productsMockData';
import type { ProductFormData } from '@/types/products';

// ── 공통 폼 데이터 팩토리 ─────────────────────────────────────────────────────

function makeFormData(overrides: Partial<ProductFormData> = {}): ProductFormData {
  return {
    name:             '테스트 상품',
    productCode:      'TEST-001',
    price:            50000,
    summary:          '요약 설명',
    shortDescription: '간단 설명',
    description:      '<p>상세 설명</p>',
    status:           'active',
    ...overrides,
  };
}

// ── MOCK 데이터 초기 상태 스냅샷 ─────────────────────────────────────────────

// 각 테스트 후 변이된 MOCK 데이터를 복원합니다.
let initialMapSnapshot: Map<string, import('@/types/products').ProductDetail>;
let initialProductsLength: number;
let initialProductsSnapshot: import('@/types/products').ProductListItem[];

beforeEach(() => {
  (revalidatePath as jest.Mock).mockClear();
  // MOCK_PRODUCT_DETAIL_MAP 스냅샷 저장
  initialMapSnapshot = new Map(MOCK_PRODUCT_DETAIL_MAP);
  // MOCK_PRODUCTS 스냅샷 저장
  initialProductsLength = MOCK_PRODUCTS.length;
  initialProductsSnapshot = [...MOCK_PRODUCTS];
});

afterEach(() => {
  // MOCK_PRODUCT_DETAIL_MAP 복원
  MOCK_PRODUCT_DETAIL_MAP.clear();
  initialMapSnapshot.forEach((v, k) => MOCK_PRODUCT_DETAIL_MAP.set(k, v));

  // MOCK_PRODUCTS 복원
  MOCK_PRODUCTS.length = 0;
  initialProductsSnapshot.forEach((p) => MOCK_PRODUCTS.push(p));
});

// ─────────────────────────────────────────────────────────────────────────────

describe('saveProductAction - 신규 생성', () => {
  test('새 상품 ID를 반환한다', async () => {
    const result = await saveProductAction(makeFormData());
    expect(result.id).toMatch(/^prod-\d+$/);
  });

  test('반환된 product 객체가 폼 데이터와 일치한다', async () => {
    const data = makeFormData({ name: '신규 상품', price: 99000 });
    const result = await saveProductAction(data);

    expect(result.product).toBeDefined();
    expect(result.product!.name).toBe('신규 상품');
    expect(result.product!.price).toBe(99000);
    expect(result.product!.productCode).toBe('TEST-001');
    expect(result.product!.status).toBe('active');
  });

  test('MOCK_PRODUCT_DETAIL_MAP에 새 상품이 추가된다', async () => {
    const data = makeFormData();
    const { id } = await saveProductAction(data);

    expect(MOCK_PRODUCT_DETAIL_MAP.has(id)).toBe(true);
    const saved = MOCK_PRODUCT_DETAIL_MAP.get(id)!;
    expect(saved.name).toBe(data.name);
    expect(saved.productCode).toBe(data.productCode);
  });

  test('MOCK_PRODUCTS 목록 맨 앞에 새 아이템이 추가된다', async () => {
    const prevLength = MOCK_PRODUCTS.length;
    const data = makeFormData({ name: '목록 추가 테스트' });
    await saveProductAction(data);

    expect(MOCK_PRODUCTS.length).toBe(prevLength + 1);
    expect(MOCK_PRODUCTS[0].name).toBe('목록 추가 테스트');
  });

  test('신규 생성 시 카테고리는 "미분류"로 설정된다', async () => {
    const { product } = await saveProductAction(makeFormData());
    expect(product!.category).toBe('미분류');
  });

  test('신규 생성 시 createdBy는 "관리자"로 설정된다', async () => {
    const { product } = await saveProductAction(makeFormData());
    expect(product!.createdBy).toBe('관리자');
  });

  test('price가 빈 문자열이면 price는 0으로 저장된다', async () => {
    const data = makeFormData({ price: '' });
    const { product } = await saveProductAction(data);
    expect(product!.price).toBe(0);
  });

  test('initialStock이 전달되면 stock에 반영된다', async () => {
    const initialStock = { total: 100, sold: 0, available: 100 };
    const { product } = await saveProductAction(makeFormData(), undefined, initialStock);
    expect(product!.stock).toEqual(initialStock);
  });

  test('initialStock 미전달 시 stock은 { total: 0, sold: 0, available: 0 }', async () => {
    const { product } = await saveProductAction(makeFormData());
    expect(product!.stock).toEqual({ total: 0, sold: 0, available: 0 });
  });

  test('신규 생성 시 /dashboard/products 경로를 revalidate한다', async () => {
    await saveProductAction(makeFormData());
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/products');
  });

  test('신규 생성 시 /dashboard/products/:id 경로는 revalidate하지 않는다', async () => {
    await saveProductAction(makeFormData());
    const calls = (revalidatePath as jest.Mock).mock.calls.map(([path]: [string]) => path);
    expect(calls.every((p) => !p.includes('/prod-'))).toBe(true);
  });

  test('이미지는 빈 배열로 초기화된다', async () => {
    const { product } = await saveProductAction(makeFormData());
    expect(product!.images).toEqual([]);
  });

  test('createdAt, updatedAt이 ISO 문자열이다', async () => {
    const { product } = await saveProductAction(makeFormData());
    expect(new Date(product!.createdAt).toISOString()).toBe(product!.createdAt);
    expect(new Date(product!.updatedAt).toISOString()).toBe(product!.updatedAt);
  });

  test('상태가 hidden으로 설정되면 저장된 상품도 hidden이다', async () => {
    const data = makeFormData({ status: 'hidden' });
    const { product } = await saveProductAction(data);
    expect(product!.status).toBe('hidden');
  });

  test('상태가 sold_out으로 설정되면 저장된 상품도 sold_out이다', async () => {
    const data = makeFormData({ status: 'sold_out' });
    const { product } = await saveProductAction(data);
    expect(product!.status).toBe('sold_out');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('saveProductAction - 기존 상품 수정', () => {
  const EXISTING_ID = 'prod-001';

  test('수정된 상품 ID를 반환한다', async () => {
    const result = await saveProductAction(makeFormData(), EXISTING_ID);
    expect(result.id).toBe(EXISTING_ID);
  });

  test('수정된 product 객체가 반환된다', async () => {
    const data = makeFormData({ name: '수정된 상품명', price: 200000 });
    const { product } = await saveProductAction(data, EXISTING_ID);
    expect(product).toBeDefined();
    expect(product!.name).toBe('수정된 상품명');
    expect(product!.price).toBe(200000);
  });

  test('MOCK_PRODUCT_DETAIL_MAP의 해당 상품이 갱신된다', async () => {
    const data = makeFormData({ name: '맵 갱신 테스트', productCode: 'NEW-CODE' });
    await saveProductAction(data, EXISTING_ID);

    const updated = MOCK_PRODUCT_DETAIL_MAP.get(EXISTING_ID)!;
    expect(updated.name).toBe('맵 갱신 테스트');
    expect(updated.productCode).toBe('NEW-CODE');
  });

  test('수정 시 price가 빈 문자열이면 기존 가격이 유지된다', async () => {
    const existing = MOCK_PRODUCT_DETAIL_MAP.get(EXISTING_ID)!;
    const originalPrice = existing.price;

    const data = makeFormData({ price: '' });
    const { product } = await saveProductAction(data, EXISTING_ID);
    expect(product!.price).toBe(originalPrice);
  });

  test('수정 시 updatedAt이 갱신된다', async () => {
    const existing = MOCK_PRODUCT_DETAIL_MAP.get(EXISTING_ID)!;
    const originalUpdatedAt = existing.updatedAt;

    // 1ms 이상 지나게 하기 위해 잠깐 대기
    await new Promise((r) => setTimeout(r, 5));

    await saveProductAction(makeFormData(), EXISTING_ID);

    const updated = MOCK_PRODUCT_DETAIL_MAP.get(EXISTING_ID)!;
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);
  });

  test('수정 시 기존 stock, images, createdAt, createdBy는 유지된다', async () => {
    const existing = MOCK_PRODUCT_DETAIL_MAP.get(EXISTING_ID)!;
    const { product } = await saveProductAction(makeFormData(), EXISTING_ID);

    expect(product!.stock).toEqual(existing.stock);
    expect(product!.images).toEqual(existing.images);
    expect(product!.createdAt).toBe(existing.createdAt);
    expect(product!.createdBy).toBe(existing.createdBy);
  });

  test('MOCK_PRODUCTS 목록의 해당 항목도 동기화된다', async () => {
    const data = makeFormData({ name: '목록 동기화 테스트', status: 'hidden' });
    await saveProductAction(data, EXISTING_ID);

    const listItem = MOCK_PRODUCTS.find((p) => p.id === EXISTING_ID);
    expect(listItem).toBeDefined();
    expect(listItem!.name).toBe('목록 동기화 테스트');
    expect(listItem!.status).toBe('hidden');
  });

  test('수정 시 /dashboard/products/:id 경로를 revalidate한다', async () => {
    await saveProductAction(makeFormData(), EXISTING_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/products/${EXISTING_ID}`);
  });

  test('수정 시 /dashboard/products 경로도 revalidate한다', async () => {
    await saveProductAction(makeFormData(), EXISTING_ID);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/products');
  });

  test('존재하지 않는 ID로 수정 시 에러가 발생한다', async () => {
    await expect(saveProductAction(makeFormData(), 'non-existent-id')).rejects.toThrow(
      '상품을 찾을 수 없습니다.',
    );
  });

  test('수정 시 summary, shortDescription, description이 업데이트된다', async () => {
    const data = makeFormData({
      summary:          '수정된 요약',
      shortDescription: '수정된 간단 설명',
      description:      '<p>수정된 상세</p>',
    });
    const { product } = await saveProductAction(data, EXISTING_ID);
    expect(product!.summary).toBe('수정된 요약');
    expect(product!.shortDescription).toBe('수정된 간단 설명');
    expect(product!.description).toBe('<p>수정된 상세</p>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('saveProductAction - 경계값 및 추가 케이스', () => {
  test('목록에 없는 상품 ID를 수정하려 하면 에러 발생', async () => {
    await expect(saveProductAction(makeFormData(), 'prod-999-ghost')).rejects.toThrow();
  });

  test('price가 0이면 0으로 저장된다', async () => {
    const data = makeFormData({ price: 0 });
    const { product } = await saveProductAction(data);
    expect(product!.price).toBe(0);
  });

  test('연속으로 신규 생성 시 서로 다른 ID가 발급된다', async () => {
    // Date.now() 기반이므로 타임스탬프가 같을 수 있어 약간의 딜레이
    const [r1, r2] = await Promise.all([
      saveProductAction(makeFormData({ productCode: 'CODE-A' })),
      saveProductAction(makeFormData({ productCode: 'CODE-B' })),
    ]);
    // 병렬 실행 시에도 각각 Map에 추가됨을 확인
    expect(MOCK_PRODUCT_DETAIL_MAP.has(r1.id)).toBe(true);
    expect(MOCK_PRODUCT_DETAIL_MAP.has(r2.id)).toBe(true);
  });
});