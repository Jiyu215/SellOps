/**
 * @jest-environment node
 *
 * GET /api/orders Route Handler 테스트.
 */

jest.mock('next/headers', () => ({}), { virtual: true })

type MockRouteResponse = {
  body: unknown
  status: number
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation(
      (body: unknown, init?: { status?: number }): MockRouteResponse => ({
        body,
        status: init?.status ?? 200,
      }),
    ),
  },
}))

jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/api/requireAuth')
jest.mock('@/dal/orders', () => ({ getOrders: jest.fn() }))

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api/requireAuth'
import { getOrders } from '@/dal/orders'
import { GET } from './route'
import type { OrderListResponse } from '@/features/orders/types/order.type'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>
const mockGetOrders = getOrders as jest.MockedFunction<typeof getOrders>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

const MOCK_ORDER_RESPONSE: OrderListResponse = {
  items: [
    {
      id:          'order-001',
      orderNumber: 'SO-2026-000001',
      customer:    { name: '홍길동', email: 'hong@example.com', phone: '010-1111-2222' },
      products:    [],
      totalAmount: 10000,
      paymentMethod:  'card',
      orderStatus:    'order_confirmed',
      paymentStatus:  'payment_completed',
      shippingStatus: 'shipping_ready',
      createdAt:      '2026-04-23T00:00:00.000Z',
    },
  ],
  total: 1,
  page:  1,
  limit: 20,
}

function makeUnauthedReturn(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401_RESPONSE })
}

function makeAuthedReturn(): Promise<AuthOk> {
  return Promise.resolve({
    ok: true,
    user: { id: 'u1', email: 'admin@sellops.com' } as User,
  })
}

function makeRequest(url = 'http://localhost/api/orders') {
  return new Request(url)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSupabaseAdmin.mockReturnValue({} as ReturnType<typeof getSupabaseAdmin>)
  mockGetOrders.mockResolvedValue(MOCK_ORDER_RESPONSE)
})

describe('GET /api/orders - 미인증 401', () => {
  test('requireAuth가 ok:false를 반환하면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const response = await GET(makeRequest())

    expect(response).toBe(MOCK_401_RESPONSE)
  })

  test('미인증이면 주문 조회를 호출하지 않는다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    await GET(makeRequest())

    expect(mockGetOrders).not.toHaveBeenCalled()
  })
})

describe('GET /api/orders - 성공', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('주문 목록 응답을 반환한다', async () => {
    const response = await GET(makeRequest()) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(MOCK_ORDER_RESPONSE)
  })

  test('query가 없으면 기본 page/limit으로 조회한다', async () => {
    await GET(makeRequest())

    expect(mockGetOrders).toHaveBeenCalledWith(expect.anything(), {
      search: '',
      page:   1,
      limit:  20,
    })
  })

  test('query string을 getOrders 인자로 전달한다', async () => {
    await GET(makeRequest(
      'http://localhost/api/orders?search=SO-2026&page=2&limit=50&orderStatus=order_confirmed&paymentStatus=payment_completed&shippingStatus=shipping_ready&paymentMethod=card'
    ))

    expect(mockGetOrders).toHaveBeenCalledWith(expect.anything(), {
      search:         'SO-2026',
      orderStatus:    'order_confirmed',
      paymentStatus:  'payment_completed',
      shippingStatus: 'shipping_ready',
      paymentMethod:  'card',
      page:           2,
      limit:          50,
    })
  })
})

describe('GET /api/orders - 잘못된 query 400', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test.each([
    ['page', 'abc'],
    ['page', '0'],
    ['limit', '30'],
    ['orderStatus', 'bad_status'],
    ['paymentStatus', 'bad_status'],
    ['shippingStatus', 'bad_status'],
    ['paymentMethod', 'cash'],
  ])('%s 값이 잘못되면 400을 반환하고 조회하지 않는다', async (key, value) => {
    const response = await GET(makeRequest(
      `http://localhost/api/orders?${key}=${value}`,
    )) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: 'invalid_order_query' })
    expect(mockGetOrders).not.toHaveBeenCalled()
    expect(mockGetSupabaseAdmin).not.toHaveBeenCalled()
  })

  test('search가 100자를 초과하면 400을 반환한다', async () => {
    const response = await GET(makeRequest(
      `http://localhost/api/orders?search=${'a'.repeat(101)}`,
    )) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: 'invalid_order_query' })
  })
})

describe('GET /api/orders - 실패', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('getOrders가 실패하면 500을 반환한다', async () => {
    mockGetOrders.mockRejectedValue(new Error('db error'))

    const response = await GET(makeRequest()) as MockRouteResponse

    expect(response.status).toBe(500)
  })
})
