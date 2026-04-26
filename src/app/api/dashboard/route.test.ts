/**
 * @jest-environment node
 */

jest.mock('next/headers', () => ({}), { virtual: true });
jest.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T) => fn,
}), { virtual: true });

type MockRouteResponse = {
  body: unknown;
  status: number;
};

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation(
      (body: unknown, init?: { status?: number }): MockRouteResponse => ({
        body,
        status: init?.status ?? 200,
      }),
    ),
  },
}));

jest.mock('@/lib/api/requireAuth');
jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }));
jest.mock('@/dal/orders', () => ({ getOrders: jest.fn() }));

import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getOrders } from '@/dal/orders';
import { requireAuth } from '@/lib/api/requireAuth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { GET } from './route';

type AuthResult = Awaited<ReturnType<typeof requireAuth>>;
type AuthOk = Extract<AuthResult, { ok: true }>;
type AuthFail = Extract<AuthResult, { ok: false }>;

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>;
const mockGetOrders = getOrders as jest.MockedFunction<typeof getOrders>;

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response'];

function makeUnauthedReturn(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401_RESPONSE });
}

function makeAuthedReturn(): Promise<AuthOk> {
  return Promise.resolve({
    ok: true,
    user: { id: 'u1', email: 'admin@sellops.com' } as User,
  });
}

function createRevenueOrdersQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockResolvedValue({
      data: [
        { id: 'o1', total_amount: 100000 },
        { id: 'o2', total_amount: 250000 },
      ],
      error: null,
    }),
  };
}

function createTodayOrderCountQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockResolvedValue({
      data: null,
      count: 4,
      error: null,
    }),
  };
}

function createShortTermOrdersQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockResolvedValue({
      data: [
        { id: 'o1', total_amount: 100000, created_at: '2026-04-23T10:00:00.000Z' },
        { id: 'o2', total_amount: 250000, created_at: '2026-04-24T10:00:00.000Z' },
      ],
      error: null,
    }),
  };
}

function createMonthlySalesOrdersQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockResolvedValue({
      data: [
        { id: 'm1', total_amount: 300000, created_at: '2026-04-10T10:00:00.000Z' },
        { id: 'm2', total_amount: 200000, created_at: '2026-04-20T10:00:00.000Z' },
        { id: 'm3', total_amount: 150000, created_at: '2026-03-05T10:00:00.000Z' },
      ],
      error: null,
    }),
  };
}

function createProductsQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [
        { id: 'p1', name: '키보드', product_code: 'PRD-001', stock_available: 3 },
        { id: 'p2', name: '마우스', product_code: 'PRD-002', stock_available: 12 },
      ],
      error: null,
    }),
  };
}

function createDemandOrdersQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockResolvedValue({
      data: [{ id: 'o1' }, { id: 'o2' }],
      error: null,
    }),
  };
}

function createCompletedOrdersForTopProductsQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockResolvedValue({
      data: [
        { id: 'o1', created_at: '2026-04-24T10:00:00.000Z' },
        { id: 'o2', created_at: '2026-04-23T10:00:00.000Z' },
      ],
      error: null,
    }),
  };
}

function createOrderItemsQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({
      data: [
        {
          order_id: 'o1',
          product_id: 'p1',
          product_name: '키보드',
          product_code: 'PRD-001',
          price: 1000,
          quantity: 90,
        },
        {
          order_id: 'o2',
          product_id: 'p2',
          product_name: '마우스',
          product_code: 'PRD-002',
          price: 2000,
          quantity: 60,
        },
      ],
      error: null,
    }),
  };
}

function createCategoryOrdersQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockResolvedValue({
      data: [{ id: 'o1' }, { id: 'o2' }],
      error: null,
    }),
  };
}

function createProductsCategoryQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({
      data: [
        { id: 'p1', category_id: 'c1' },
        { id: 'p2', category_id: null },
      ],
      error: null,
    }),
  };
}

function createCategoriesQueryResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn(),
    in: jest.fn().mockResolvedValue({
      data: [{ id: 'c1', name: '입력장치' }],
      error: null,
    }),
  };
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('미인증이면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn);

    const response = await GET(new Request('http://localhost/api/dashboard'));

    expect(response).toBe(MOCK_401_RESPONSE);
    expect(mockGetSupabaseAdmin).not.toHaveBeenCalled();
  });

  test('인증되면 주간 매출/주문, 인기상품, 재고부족, 최근주문을 실제 데이터 형태로 반환한다', async () => {
    const revenueQuery = createRevenueOrdersQueryResult();
    const countQuery = createTodayOrderCountQueryResult();
    const demandOrdersQuery = createDemandOrdersQueryResult();
    const topProductOrdersQuery = createCompletedOrdersForTopProductsQueryResult();
    const shortTermOrdersQuery = createShortTermOrdersQueryResult();
    const monthlySalesOrdersQuery = createMonthlySalesOrdersQueryResult();
    const secondDemandOrdersQuery = createDemandOrdersQueryResult();
    const categoryOrdersQuery = createCategoryOrdersQueryResult();
    const productsQuery = createProductsQueryResult();
    const productCategoryQuery = createProductsCategoryQueryResult();
    const categoriesQuery = createCategoriesQueryResult();
    const orderItemsQuery = createOrderItemsQueryResult();
    let idSelectCount = 0;

    const mockSupabaseAdmin = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'products_with_stock') return productsQuery;
        if (table === 'order_items') return orderItemsQuery;
        if (table === 'products') return productCategoryQuery;
        if (table === 'categories') return categoriesQuery;
        if (table === 'orders') {
          const query = {
            select(selection: string, options?: unknown) {
              if (options && typeof options === 'object') return countQuery;
              if (selection === 'id, total_amount') return revenueQuery;
              if (selection === 'id') {
                idSelectCount += 1;
                if (idSelectCount === 1) return demandOrdersQuery;
                if (idSelectCount === 2) return secondDemandOrdersQuery;
                return categoryOrdersQuery;
              }
              if (selection === 'id, created_at') return topProductOrdersQuery;
              if (selection === 'id, total_amount, created_at') {
                if (!shortTermOrdersQuery.gte.mock.calls.length) return shortTermOrdersQuery;
                return monthlySalesOrdersQuery;
              }
              return undefined;
            },
          };

          return query;
        }
        return undefined;
      }),
    };

    categoriesQuery.order
      .mockReturnValueOnce({
        order: jest.fn().mockResolvedValue({
          data: [{ id: 'c1', name: '입력장치' }],
          error: null,
        }),
      });

    mockRequireAuth.mockImplementation(makeAuthedReturn);
    mockGetSupabaseAdmin.mockReturnValue(mockSupabaseAdmin as never);
    mockGetOrders.mockResolvedValue({
      items: [
        {
          id: 'o1',
          orderNumber: 'SO-2026-0001',
          customer: { name: '홍길동', email: '', phone: '' },
          products: [],
          totalAmount: 350000,
          paymentMethod: 'card',
          orderStatus: 'order_confirmed',
          paymentStatus: 'payment_completed',
          shippingStatus: 'shipping_ready',
          createdAt: '2026-04-24T10:00:00.000Z',
        },
      ],
      total: 12,
      page: 2,
      limit: 5,
    });

    const request = new Request(
      'http://localhost/api/dashboard?search=hong&orderStatus=order_confirmed&page=2',
    );

    const response = await GET(request) as MockRouteResponse;
    const body = response.body as {
      kpiData: Array<{ id: string; value: string | number }>;
      dailyData: Array<{ date: string; revenue: number; orders: number; stockRiskCount: number }>;
      salesData: Array<{ month: string; revenue: number; orders: number; target: number }>;
      categoryData: Array<{ name: string; value: number; color: string }>;
      inventoryItems: Array<{ sku: string; currentStock: number }>;
      orders: Array<{ orderNumber: string }>;
      ordersPagination: { total: number; page: number; limit: number };
      topProducts: {
        today: Array<{ sku: string; revenue: number }>;
        week: Array<{ sku: string; revenue: number }>;
        month: Array<{ sku: string; revenue: number }>;
      };
    };

    expect(response.status).toBe(200);
    expect(mockGetSupabaseAdmin).toHaveBeenCalledTimes(2);

    expect(revenueQuery.eq).toHaveBeenCalledWith('order_status', 'order_completed');
    expect(revenueQuery.eq).toHaveBeenCalledWith('payment_status', 'payment_completed');
    expect(revenueQuery.neq).toHaveBeenCalledWith('shipping_status', 'return_completed');

    expect(demandOrdersQuery.eq).toHaveBeenCalledWith('order_status', 'order_completed');

    expect(topProductOrdersQuery.eq).toHaveBeenCalledWith('payment_status', 'payment_completed');
    expect(topProductOrdersQuery.eq).toHaveBeenCalledWith('shipping_status', 'shipping_completed');
    expect(topProductOrdersQuery.neq).toHaveBeenCalledWith('order_status', 'order_cancelled');

    expect(shortTermOrdersQuery.eq).toHaveBeenCalledWith('payment_status', 'payment_completed');
    expect(shortTermOrdersQuery.eq).toHaveBeenCalledWith('shipping_status', 'shipping_completed');
    expect(shortTermOrdersQuery.neq).toHaveBeenCalledWith('order_status', 'order_cancelled');

    expect(monthlySalesOrdersQuery.eq).toHaveBeenCalledWith('payment_status', 'payment_completed');
    expect(monthlySalesOrdersQuery.eq).toHaveBeenCalledWith('shipping_status', 'shipping_completed');
    expect(monthlySalesOrdersQuery.neq).toHaveBeenCalledWith('order_status', 'order_cancelled');

    expect(categoryOrdersQuery.eq).toHaveBeenCalledWith('payment_status', 'payment_completed');
    expect(categoryOrdersQuery.eq).toHaveBeenCalledWith('shipping_status', 'shipping_completed');
    expect(categoryOrdersQuery.neq).toHaveBeenCalledWith('order_status', 'order_cancelled');

    expect(orderItemsQuery.in).toHaveBeenCalledWith('order_id', ['o1', 'o2']);
    expect(productCategoryQuery.in).toHaveBeenCalledWith('id', ['p1', 'p2']);
    expect(categoriesQuery.eq).toHaveBeenCalledWith('is_active', true);

    expect(mockGetOrders).toHaveBeenCalledWith(
      mockSupabaseAdmin,
      expect.objectContaining({
        search: 'hong',
        orderStatus: 'order_confirmed',
        page: 2,
        limit: 5,
      }),
    );

    expect(body.kpiData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'kpi-revenue', value: '350,000' }),
        expect.objectContaining({ id: 'kpi-orders', value: 4 }),
        expect.objectContaining({ id: 'kpi-stock-critical', value: 2 }),
      ]),
    );

    expect(body.dailyData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ revenue: 100000, orders: 1, stockRiskCount: 2 }),
        expect.objectContaining({ revenue: 250000, orders: 1, stockRiskCount: 2 }),
      ]),
    );

    expect(body.salesData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ revenue: 500000, orders: 2, target: 0 }),
        expect.objectContaining({ revenue: 150000, orders: 1, target: 0 }),
      ]),
    );

    expect(body.categoryData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '입력장치', value: 43 }),
        expect.objectContaining({ name: '미분류', value: 57 }),
      ]),
    );

    expect(body.inventoryItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: 'PRD-001', currentStock: 3 }),
        expect.objectContaining({ sku: 'PRD-002', currentStock: 12 }),
      ]),
    );

    expect(body.orders).toEqual([expect.objectContaining({ orderNumber: 'SO-2026-0001' })]);

    expect(body.ordersPagination).toEqual({
      total: 12,
      page: 2,
      limit: 5,
    });

    expect(body.topProducts.today).toEqual([]);

    expect(body.topProducts.week).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: 'PRD-001', revenue: 90000 }),
      ]),
    );
  });
  test('카테고리 매출이 없어도 활성 카테고리와 미분류를 0%로 반환한다', async () => {
    const revenueQuery = createRevenueOrdersQueryResult();
    const countQuery = createTodayOrderCountQueryResult();
    const demandOrdersQuery = createDemandOrdersQueryResult();
    const topProductOrdersQuery = createCompletedOrdersForTopProductsQueryResult();
    const shortTermOrdersQuery = createShortTermOrdersQueryResult();
    const monthlySalesOrdersQuery = createMonthlySalesOrdersQueryResult();
    const secondDemandOrdersQuery = createDemandOrdersQueryResult();
    const categoryOrdersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const productsQuery = createProductsQueryResult();
    const categoriesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };
    const orderItemsQuery = createOrderItemsQueryResult();
    let idSelectCount = 0;

    const mockSupabaseAdmin = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'products_with_stock') return productsQuery;
        if (table === 'order_items') return orderItemsQuery;
        if (table === 'categories') return categoriesQuery;
        if (table === 'orders') {
          return {
            select(selection: string, options?: unknown) {
              if (options && typeof options === 'object') return countQuery;
              if (selection === 'id, total_amount') return revenueQuery;
              if (selection === 'id') {
                idSelectCount += 1;
                if (idSelectCount === 1) return demandOrdersQuery;
                if (idSelectCount === 2) return secondDemandOrdersQuery;
                return categoryOrdersQuery;
              }
              if (selection === 'id, created_at') return topProductOrdersQuery;
              if (selection === 'id, total_amount, created_at') {
                if (!shortTermOrdersQuery.gte.mock.calls.length) return shortTermOrdersQuery;
                return monthlySalesOrdersQuery;
              }
              return undefined;
            },
          };
        }
        return undefined;
      }),
    };

    categoriesQuery.order
      .mockReturnValueOnce({
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'c1', name: '입력장치' },
            { id: 'c2', name: '허브/확장' },
          ],
          error: null,
        }),
      });

    mockRequireAuth.mockImplementation(makeAuthedReturn);
    mockGetSupabaseAdmin.mockReturnValue(mockSupabaseAdmin as never);
    mockGetOrders.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 5,
    });

    const response = await GET(new Request('http://localhost/api/dashboard')) as MockRouteResponse;
    const body = response.body as {
      categoryData: Array<{ name: string; value: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.categoryData).toEqual([
      expect.objectContaining({ name: '입력장치', value: 0 }),
      expect.objectContaining({ name: '허브/확장', value: 0 }),
      expect.objectContaining({ name: '미분류', value: 0 }),
    ]);
  });
});
