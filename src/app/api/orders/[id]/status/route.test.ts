/**
 * @jest-environment node
 *
 * PATCH /api/orders/[id]/status Route Handler 테스트.
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

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api/requireAuth'
import { PATCH } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

const MOCK_ORDER_ROW = {
  id:              'order-001',
  order_number:    'SO-2026-000001',
  customer_name:   '테스트 고객',
  total_amount:    10000,
  status:          'pending',
  order_status:    'order_confirmed',
  payment_status:  'payment_completed',
  shipping_status: 'shipping_ready',
  updated_at:      '2026-04-23T00:00:00.000Z',
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

function makeRequest(body: unknown, orderId = 'order-001') {
  return {
    request: new Request(`http://localhost/api/orders/${orderId}/status`, {
      method:  'PATCH',
      body:    JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    params: Promise.resolve({ id: orderId }),
  }
}

function makeUpdateChain(data: unknown = MOCK_ORDER_ROW, error: unknown = null) {
  const single = jest.fn().mockResolvedValue({ data, error })
  const select = jest.fn().mockReturnValue({ single })
  const eq     = jest.fn().mockReturnValue({ select })
  const update = jest.fn().mockReturnValue({ eq })
  const from   = jest.fn().mockReturnValue({ update })
  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ from })
  return { from, update, eq, select, single }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PATCH /api/orders/[id]/status - 미인증 401', () => {
  test('requireAuth가 ok:false면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({ order_status: 'order_confirmed' })

    const response = await PATCH(request, { params })

    expect(response).toBe(MOCK_401_RESPONSE)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/orders/[id]/status - 요청 검증', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('빈 body는 400을 반환하고 update를 호출하지 않는다', async () => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({})

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  test.each([
    ['id', { id: 'hack' }],
    ['total_amount', { total_amount: 0 }],
    ['customer_name', { customer_name: '변조' }],
    ['stock_status', { stock_status: 'applied' }],
    ['updated_at', { updated_at: '2099-01-01' }],
  ])('허용되지 않은 "%s" 필드는 400을 반환한다', async (_, body) => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest(body)

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  test('잘못된 상태 값은 400을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({ order_status: 'paid' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/orders/[id]/status - 성공', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('허용된 상태 필드를 update하고 응답 body를 반환한다', async () => {
    makeUpdateChain(MOCK_ORDER_ROW)
    const { request, params } = makeRequest({
      order_status:    'order_confirmed',
      payment_status:  'payment_completed',
      shipping_status: 'shipping_ready',
    })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(MOCK_ORDER_ROW)
  })

  test('update 호출에 허용 필드와 updated_at만 포함한다', async () => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({ payment_status: 'payment_completed' })

    await PATCH(request, { params })

    const updateArg = update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.payment_status).toBe('payment_completed')
    expect(updateArg.updated_at).toBeDefined()
    expect(updateArg.order_status).toBeUndefined()
    expect(updateArg.customer_name).toBeUndefined()
  })

  test('.eq에 주문 id를 전달한다', async () => {
    const { eq } = makeUpdateChain()
    const { request, params } = makeRequest({ shipping_status: 'shipping_completed' }, 'order-999')

    await PATCH(request, { params })

    expect(eq).toHaveBeenCalledWith('id', 'order-999')
  })
})

describe('PATCH /api/orders/[id]/status - 실패', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('Supabase update 오류는 500을 반환한다', async () => {
    makeUpdateChain(null, { message: 'db error', code: '500' })
    const { request, params } = makeRequest({ order_status: 'order_cancelled' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(500)
  })
})
