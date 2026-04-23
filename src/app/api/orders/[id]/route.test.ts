/**
 * @jest-environment node
 *
 * GET /api/orders/[id] Route Handler 테스트
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
jest.mock('@/dal/orders', () => ({ getOrderDetail: jest.fn() }))

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api/requireAuth'
import { getOrderDetail } from '@/dal/orders'
import { GET } from './route'
import type { OrderDetail } from '@/types/orderDetail'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>
const mockGetOrderDetail = getOrderDetail as jest.MockedFunction<typeof getOrderDetail>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

const MOCK_ORDER_DETAIL: OrderDetail = {
  id: 'order-001',
  orderNumber: 'SO-2026-000001',
  customer: {
    name: '테스트 고객',
    email: 'customer@example.com',
    phone: '010-1111-2222',
  },
  products: [
    {
      name: '테스트 상품',
      sku: 'PRD-001',
      quantity: 1,
      unitPrice: 20000,
    },
  ],
  totalAmount: 20000,
  paymentMethod: 'card',
  orderStatus: 'order_confirmed',
  paymentStatus: 'payment_completed',
  shippingStatus: 'shipping_ready',
  createdAt: '2026-04-23T00:00:00.000Z',
  shippingFee: 0,
  memoLog: [],
  statusHistory: [],
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

function makeRequest(orderId = 'order-001') {
  return new Request(`http://localhost/api/orders/${orderId}`)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSupabaseAdmin.mockReturnValue({} as ReturnType<typeof getSupabaseAdmin>)
})

describe('GET /api/orders/[id] - 인증', () => {
  test('requireAuth가 false면 401을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'order-001' }) })

    expect(response).toBe(MOCK_401_RESPONSE)
    expect(mockGetOrderDetail).not.toHaveBeenCalled()
  })
})

describe('GET /api/orders/[id] - 성공', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('주문 상세를 반환한다', async () => {
    mockGetOrderDetail.mockResolvedValue(MOCK_ORDER_DETAIL)

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'order-001' }) }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(MOCK_ORDER_DETAIL)
  })

  test('getOrderDetail에 admin client와 주문 id를 전달한다', async () => {
    mockGetOrderDetail.mockResolvedValue(MOCK_ORDER_DETAIL)

    await GET(makeRequest('order-999'), { params: Promise.resolve({ id: 'order-999' }) })

    expect(mockGetOrderDetail).toHaveBeenCalledWith(expect.anything(), 'order-999')
  })
})

describe('GET /api/orders/[id] - 404', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('주문이 없으면 404를 반환한다', async () => {
    mockGetOrderDetail.mockResolvedValue(null)

    const response = await GET(makeRequest('missing'), { params: Promise.resolve({ id: 'missing' }) }) as MockRouteResponse

    expect(response.status).toBe(404)
    expect((response.body as { error?: string }).error).toBe('주문을 찾을 수 없습니다.')
  })
})

describe('GET /api/orders/[id] - 오류', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('getOrderDetail가 throw하면 500을 반환한다', async () => {
    mockGetOrderDetail.mockRejectedValue(new Error('db error'))

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'order-001' }) }) as MockRouteResponse

    expect(response.status).toBe(500)
  })
})
