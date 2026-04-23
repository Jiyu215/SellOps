/**
 * @jest-environment node
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
import { POST } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

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
    request: new Request(`http://localhost/api/orders/${orderId}/memos`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    params: Promise.resolve({ id: orderId }),
  }
}

function makeInsertMock(data: unknown = { id: 'memo-001' }, error: unknown = null) {
  const single = jest.fn().mockResolvedValue({ data, error })
  const select = jest.fn().mockReturnValue({ single })
  const insert = jest.fn().mockReturnValue({ select })
  const from = jest.fn().mockReturnValue({ insert })

  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ from })

  return { from, insert, select, single }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/orders/[id]/memos', () => {
  test('requireAuth가 ok:false면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    const { insert } = makeInsertMock()
    const { request, params } = makeRequest({ content: '메모' })

    const response = await POST(request, { params })

    expect(response).toBe(MOCK_401_RESPONSE)
    expect(insert).not.toHaveBeenCalled()
  })

  test('content를 검증하고 order_memos에 insert 한다', async () => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)
    const { insert } = makeInsertMock({
      id: 'memo-001',
      order_id: 'order-001',
      author_type: 'admin',
      author_name: 'admin@sellops.com',
      content: '고객 요청 메모',
      created_at: '2026-04-24T00:00:00.000Z',
    })
    const { request, params } = makeRequest({ content: '고객 요청 메모' })

    const response = await POST(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith({
      order_id: 'order-001',
      author_type: 'admin',
      author_name: 'admin@sellops.com',
      content: '고객 요청 메모',
    })
  })

  test('빈 content는 400을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)
    const { insert } = makeInsertMock()
    const { request, params } = makeRequest({ content: '   ' })

    const response = await POST(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  test('허용되지 않은 필드가 있으면 400을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)
    const { insert } = makeInsertMock()
    const { request, params } = makeRequest({ content: '메모', author_type: 'customer' })

    const response = await POST(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  test('insert 실패면 500을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)
    makeInsertMock(null, { message: 'db error' })
    const { request, params } = makeRequest({ content: '메모' })

    const response = await POST(request, { params }) as MockRouteResponse

    expect(response.status).toBe(500)
    expect((response.body as { error?: string }).error).toBe('주문 메모 등록에 실패했습니다.')
  })
})
