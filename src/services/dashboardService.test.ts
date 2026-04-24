import { getDashboardData } from './dashboardService'

const mockFetch = jest.fn()
global.fetch = mockFetch

function mockResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getDashboardData', () => {
  test('GET /api/dashboard를 호출해 응답을 반환한다', async () => {
    const mockData = {
      kpiData: [],
      dailyData: [],
      salesData: [],
      categoryData: [],
      inventoryItems: [],
      orders: [],
      topProducts: { today: [], week: [], month: [] },
    }
    mockFetch.mockReturnValueOnce(mockResponse(mockData))

    const result = await getDashboardData()

    expect(mockFetch).toHaveBeenCalledWith('/api/dashboard', { cache: 'no-store' })
    expect(result).toEqual(mockData)
  })

  test('API 실패 시 예외를 던진다', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ error: 'failed' }, false, 500))

    await expect(getDashboardData()).rejects.toThrow('대시보드 데이터 로드 실패')
  })
})
