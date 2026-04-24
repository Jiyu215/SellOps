import { getDashboardData } from './dashboardService';

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

describe('getDashboardData', () => {
  test('GET /api/dashboard를 호출하고 응답을 반환한다', async () => {
    const mockData = {
      kpiData: [],
      dailyData: [],
      salesData: [],
      categoryData: [],
      inventoryItems: [],
      orders: [],
      ordersPagination: { total: 0, page: 1, limit: 5 },
      topProducts: { today: [], week: [], month: [] },
    };
    mockFetch.mockReturnValueOnce(mockResponse(mockData));

    const result = await getDashboardData();

    expect(mockFetch).toHaveBeenCalledWith('/api/dashboard', { cache: 'no-store' });
    expect(result).toEqual(mockData);
  });

  test('주문 테이블 query를 쿼리스트링으로 전달한다', async () => {
    const mockData = {
      kpiData: [],
      dailyData: [],
      salesData: [],
      categoryData: [],
      inventoryItems: [],
      orders: [],
      ordersPagination: { total: 12, page: 2, limit: 5 },
      topProducts: { today: [], week: [], month: [] },
    };
    mockFetch.mockReturnValueOnce(mockResponse(mockData));

    await getDashboardData({
      search: 'hong',
      orderStatus: 'order_confirmed',
      page: 2,
      limit: 5,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/dashboard?search=hong&orderStatus=order_confirmed&page=2&limit=5',
      { cache: 'no-store' },
    );
  });

  test('API 실패 시 예외를 던진다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ error: 'failed' }, false, 500));

    await expect(getDashboardData()).rejects.toThrow('대시보드 데이터 로드 실패');
  });
});
