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

function makeRpcMock(data: unknown = MOCK_ORDER_ROW, error: unknown = null) {
  const rpc = jest.fn().mockResolvedValue({ data, error })
  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ rpc })
  return { rpc }
}

function makeRpcMissingFallbackMock() {
  const rpc = jest.fn().mockResolvedValue({
    data:  null,
    error: { code: 'PGRST202', message: 'Could not find update_order_status_with_history' },
  })
  const currentSingle = jest.fn().mockResolvedValue({
    data: {
      order_status:    'order_waiting',
      payment_status:  'payment_pending',
      shipping_status: 'shipping_ready',
    },
    error: null,
  })
  const currentEq     = jest.fn().mockReturnValue({ single: currentSingle })
  const currentSelect = jest.fn().mockReturnValue({ eq: currentEq })
  const updateSingle  = jest.fn().mockResolvedValue({ data: MOCK_ORDER_ROW, error: null })
  const updateSelect  = jest.fn().mockReturnValue({ single: updateSingle })
  const updateEq      = jest.fn().mockReturnValue({ select: updateSelect })
  const update        = jest.fn().mockReturnValue({ eq: updateEq })
  const insert        = jest.fn().mockResolvedValue({ error: null })
  const from          = jest.fn((table: string) => {
    if (table === 'orders') return { select: currentSelect, update }
    if (table === 'order_status_histories') return { insert }
    return {}
  })

  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ rpc, from })

  return { rpc, from, update, insert }
}

function makeRpcMissingWithoutHistoryTableMock() {
  const mock = makeRpcMissingFallbackMock()
  mock.insert.mockResolvedValue({
    error: { code: 'PGRST205', message: 'Could not find order_status_histories' },
  })
  return mock
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PATCH /api/orders/[id]/status - 미인증 401', () => {
  test('requireAuth가 ok:false면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    const { rpc } = makeRpcMock()
    const { request, params } = makeRequest({ order_status: 'order_confirmed' })

    const response = await PATCH(request, { params })

    expect(response).toBe(MOCK_401_RESPONSE)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/orders/[id]/status - 요청 검증', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('빈 body는 400을 반환하고 rpc를 호출하지 않는다', async () => {
    const { rpc } = makeRpcMock()
    const { request, params } = makeRequest({})

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  test.each([
    ['id', { id: 'hack' }],
    ['total_amount', { total_amount: 0 }],
    ['customer_name', { customer_name: '변조' }],
    ['stock_status', { stock_status: 'applied' }],
    ['updated_at', { updated_at: '2099-01-01' }],
  ])('허용되지 않은 "%s" 필드는 400을 반환한다', async (_, body) => {
    const { rpc } = makeRpcMock()
    const { request, params } = makeRequest(body)

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  test('잘못된 상태 값은 400을 반환한다', async () => {
    const { rpc } = makeRpcMock()
    const { request, params } = makeRequest({ order_status: 'paid' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/orders/[id]/status - 성공', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('상태 변경 RPC 응답 body를 반환한다', async () => {
    makeRpcMock(MOCK_ORDER_ROW)
    const { request, params } = makeRequest({
      order_status:    'order_confirmed',
      payment_status:  'payment_completed',
      shipping_status: 'shipping_ready',
    })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(MOCK_ORDER_ROW)
  })

  test('RPC에 주문 id, 상태 필드, 관리자 actor를 전달한다', async () => {
    const { rpc } = makeRpcMock()
    const { request, params } = makeRequest({ payment_status: 'payment_completed' }, 'order-999')

    await PATCH(request, { params })

    expect(rpc).toHaveBeenCalledWith('update_order_status_with_history', {
      p_order_id:        'order-999',
      p_order_status:    null,
      p_payment_status:  'payment_completed',
      p_shipping_status: null,
      p_actor_type:      'admin',
      p_actor_name:      'admin@sellops.com',
      p_reason:          null,
    })
  })

  test('RPC가 없으면 직접 update하고 변경 이력을 저장한다', async () => {
    const { update, insert } = makeRpcMissingFallbackMock()
    const { request, params } = makeRequest({
      order_status:   'order_confirmed',
      payment_status: 'payment_completed',
    })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(MOCK_ORDER_ROW)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      order_status:   'order_confirmed',
      payment_status: 'payment_completed',
      updated_at:     expect.any(String),
    }))
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        order_id:     'order-001',
        status_type:  'order_status',
        from_status:  'order_waiting',
        to_status:    'order_confirmed',
        actor_type:   'admin',
        actor_name:   'admin@sellops.com',
      }),
      expect.objectContaining({
        order_id:     'order-001',
        status_type:  'payment_status',
        from_status:  'payment_pending',
        to_status:    'payment_completed',
        actor_type:   'admin',
        actor_name:   'admin@sellops.com',
      }),
    ])
  })

  test('RPC와 이력 테이블이 아직 없으면 상태 변경 성공 응답을 반환한다', async () => {
    const { update, insert } = makeRpcMissingWithoutHistoryTableMock()
    const { request, params } = makeRequest({ shipping_status: 'shipping_in_progress' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(MOCK_ORDER_ROW)
    expect(update).toHaveBeenCalled()
    expect(insert).toHaveBeenCalled()
  })
})

describe('PATCH /api/orders/[id]/status - 실패', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthedReturn))

  test('Supabase RPC 오류는 500을 반환한다', async () => {
    makeRpcMock(null, { message: 'db error', code: '500' })
    const { request, params } = makeRequest({ order_status: 'order_cancelled' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(500)
  })
})
