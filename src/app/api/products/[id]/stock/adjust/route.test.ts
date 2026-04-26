/**
 * @jest-environment node
 *
 * POST /api/products/[id]/stock/adjust Route Handler 테스트.
 *
 * adjust_product_stock RPC를 모킹하여 실제 DB 호출 없이 검증합니다.
 */

jest.mock('next/headers', () => ({}), { virtual: true })
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation(
      (body: unknown, init?: { status?: number }) => ({
        body,
        status: init?.status ?? 200,
      })
    ),
  },
}))

jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/api/requireAuth')
jest.mock('@/lib/notifications', () => ({
  createNotifications: jest.fn().mockResolvedValue(undefined),
  createNotification:  jest.fn().mockResolvedValue(undefined),
}))

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { POST } from './route'
import type { User } from '@supabase/supabase-js'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type AuthResult   = Awaited<ReturnType<typeof requireAuth>>
type AuthOk       = Extract<AuthResult, { ok: true }>
type AuthFail     = Extract<AuthResult, { ok: false }>
type MockResponse = { body: unknown; status: number }

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

const MOCK_401: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 }
) as unknown as AuthFail['response']

function makeUnauthed(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401 })
}

function makeAuthed(): Promise<AuthOk> {
  return Promise.resolve({
    ok: true,
    user: { id: 'u1', email: 'admin@sellops.com' } as User,
  })
}

function makeRequest(body: unknown, productId = 'prod-001') {
  return {
    request: new Request(`http://localhost/api/products/${productId}/stock/adjust`, {
      method: 'POST',
      body:   JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    params: Promise.resolve({ id: productId }),
  }
}

function makeRpcMock(rpcResult: unknown, rpcError: unknown = null) {
  const rpc    = jest.fn().mockResolvedValue({ data: rpcResult, error: rpcError })
  const single = jest.fn().mockResolvedValue({ data: { name: 'Mock Product', status: 'active' }, error: null })
  const eq     = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  const from   = jest.fn().mockReturnValue({ select })
  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ rpc, from })
  return { rpc, from }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// 인증 가드
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /stock/adjust — 미인증 401', () => {
  test('requireAuth가 ok:false면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthed)
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const response = await POST(request, { params })
    expect(response).toBe(MOCK_401)
  })

  test('requireAuth를 정확히 1회 호출한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthed)
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    await POST(request, { params })
    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Zod 유효성 검사 — 400
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /stock/adjust — 잘못된 body 400', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test('type 이 없으면 400 을 반환한다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('type 이 invalid 값이면 400 을 반환한다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'add', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('quantity 가 없으면 400 을 반환한다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'in' })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('quantity 가 0 이면 400 을 반환한다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'in', quantity: 0 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('quantity 가 음수이면 400 을 반환한다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'in', quantity: -5 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('허용되지 않은 필드가 포함되면 400 을 반환한다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'in', quantity: 10, product_id: 'x' })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('400 응답 body에 details 가 포함된다', async () => {
    makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'bad', quantity: -1 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect((res.body as Record<string, unknown>).details).toBeDefined()
  })

  test('유효성 검사 실패 시 RPC를 호출하지 않는다', async () => {
    const { rpc } = makeRpcMock(null)
    const { request, params } = makeRequest({ type: 'bad', quantity: 10 })
    await POST(request, { params })
    expect(rpc).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RPC 비즈니스 에러
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /stock/adjust — RPC 비즈니스 에러', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test('product_not_found → 404', async () => {
    makeRpcMock({ error: 'product_not_found' })
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(404)
  })

  test('stock_not_found → 404', async () => {
    makeRpcMock({ error: 'stock_not_found' })
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(404)
  })

  test('invalid_stock_adjustment → 400', async () => {
    makeRpcMock({ error: 'invalid_stock_adjustment' })
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('insufficient_stock → 400', async () => {
    makeRpcMock({ error: 'insufficient_stock', available: 5 })
    const { request, params } = makeRequest({ type: 'out', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('insufficient_stock 메시지에 가용 재고 수량이 포함된다', async () => {
    makeRpcMock({ error: 'insufficient_stock', available: 3 })
    const { request, params } = makeRequest({ type: 'out', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect((res.body as Record<string, unknown>).error).toContain('3')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RPC DB 레벨 에러 → 500
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /stock/adjust — RPC DB 에러 500', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test('rpcError가 있으면 500 을 반환한다', async () => {
    makeRpcMock(null, { message: 'db error', code: '500' })
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 정상 처리
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /stock/adjust — 정상 처리 200', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  const RPC_OK = { product_id: 'prod-001', total: 110, sold: 5, available: 105 }

  test('입고 성공 시 200 을 반환한다', async () => {
    makeRpcMock(RPC_OK)
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(200)
  })

  test('응답 body에 total, sold, available 이 담긴다', async () => {
    makeRpcMock(RPC_OK)
    const { request, params } = makeRequest({ type: 'in', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.body).toEqual(RPC_OK)
  })

  test('adjust_product_stock RPC에 올바른 인자를 전달한다', async () => {
    const { rpc } = makeRpcMock(RPC_OK)
    const { request, params } = makeRequest({ type: 'in', quantity: 10, reason: '초기 입고' })
    await POST(request, { params })
    expect(rpc).toHaveBeenCalledWith('adjust_product_stock', {
      p_product_id: 'prod-001',
      p_type:       'in',
      p_quantity:   10,
      p_reason:     '초기 입고',
    })
  })

  test('reason 미전달 시 p_reason 이 null 로 전달된다', async () => {
    const { rpc } = makeRpcMock(RPC_OK)
    const { request, params } = makeRequest({ type: 'out', quantity: 5 })
    await POST(request, { params })
    expect(rpc).toHaveBeenCalledWith('adjust_product_stock',
      expect.objectContaining({ p_reason: null })
    )
  })

  test('출고 성공 시 200 을 반환한다', async () => {
    const outOk = { product_id: 'prod-001', total: 90, sold: 5, available: 85 }
    makeRpcMock(outOk)
    const { request, params } = makeRequest({ type: 'out', quantity: 10 })
    const res = await POST(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(200)
  })
})
