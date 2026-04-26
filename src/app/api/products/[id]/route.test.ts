/**
 * @jest-environment node
 *
 * PATCH /api/products/[id] Route Handler 테스트.
 *
 * productUpdateSchema 검증 결과 및 Supabase update 체인을 모킹하여
 * 실제 DB 호출 없이 검증합니다.
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

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PATCH } from './route'
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
    request: new Request(`http://localhost/api/products/${productId}`, {
      method:  'PATCH',
      body:    JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    params: Promise.resolve({ id: productId }),
  }
}

const MOCK_PRODUCT = {
  id:                'prod-001',
  name:              '테스트 상품',
  price:             50000,
  product_code:      'TEST-001',
  status:            'active',
  summary:           '요약',
  short_description: '간단 설명',
  description:       '<p>상세</p>',
  created_at:        '2024-01-15T00:00:00.000Z',
  updated_at:        new Date().toISOString(),
  user_id:           'u1',
}

function makeUpdateChain(data: unknown = MOCK_PRODUCT, error: unknown = null) {
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

// ─────────────────────────────────────────────────────────────────────────────
// 인증 가드 — 401
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/products/[id] — 미인증 401', () => {
  test('requireAuth가 ok:false면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthed)
    const { request, params } = makeRequest({ name: '새 상품명' })
    const response = await PATCH(request, { params })
    expect(response).toBe(MOCK_401)
  })

  test('response.status 가 401 이다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthed)
    const { request, params } = makeRequest({ name: '새 상품명' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(401)
  })

  test('requireAuth 를 정확히 1회 호출한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthed)
    const { request, params } = makeRequest({ name: '새 상품명' })
    await PATCH(request, { params })
    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
  })

  test('미인증 시 Supabase update 를 호출하지 않는다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthed)
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({ name: '새 상품명' })
    await PATCH(request, { params })
    expect(update).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 빈 body {} → 400
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/products/[id] — 빈 body 400', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test('빈 객체 전송 시 400 을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({})
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('빈 객체 응답 body 에 error 메시지가 담긴다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({})
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect((res.body as Record<string, unknown>).error).toBeDefined()
  })

  test('빈 객체 시 Supabase update 를 호출하지 않는다', async () => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({})
    await PATCH(request, { params })
    expect(update).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 금지 필드 포함 → 400
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/products/[id] — 금지 필드 포함 400', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test.each([
    ['id',         { id: 'malicious' }],
    ['updated_at', { updated_at: '2099-01-01' }],
    ['stock',      { stock: { total: 9999 } }],
    ['user_id',    { user_id: 'attacker' }],
    ['created_at', { created_at: '2020-01-01' }],
    ['images',     { images: [] }],
  ])('"%s" 필드가 포함되면 400 을 반환한다', async (_, body) => {
    makeUpdateChain()
    const { request, params } = makeRequest(body)
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('허용 필드 + 금지 필드 혼합 시 400 을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({ name: '상품명', id: 'hack' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(400)
  })

  test('400 응답 body 에 details 가 포함된다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({ id: 'hack' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect((res.body as Record<string, unknown>).details).toBeDefined()
  })

  test('금지 필드 포함 시 Supabase update 를 호출하지 않는다', async () => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({ name: '상품명', stock: { total: 0 } })
    await PATCH(request, { params })
    expect(update).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 허용 필드 단독 업데이트 — 200
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/products/[id] — 허용 필드 업데이트 200', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test('name 단독 업데이트 시 200 을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({ name: '새 상품명' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(200)
  })

  test('price 단독 업데이트 시 200 을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({ price: 99000 })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(200)
  })

  test('status 단독 업데이트 시 200 을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({ status: 'hidden' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(200)
  })

  test('허용된 모든 필드를 한 번에 보내도 200 을 반환한다', async () => {
    makeUpdateChain()
    const { request, params } = makeRequest({
      name:              '전체 수정',
      price:             99000,
      product_code:      'FULL-001',
      summary:           '요약',
      short_description: '간단 설명',
      description:       '<p>상세</p>',
      status:            'active',
    })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(200)
  })

  test('응답 body 가 Supabase 반환 데이터와 일치한다', async () => {
    makeUpdateChain(MOCK_PRODUCT)
    const { request, params } = makeRequest({ name: '새 상품명' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.body).toEqual(MOCK_PRODUCT)
  })

  test('update 호출 시 updated_at 이 포함된다', async () => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({ name: '새 상품명' })
    await PATCH(request, { params })
    const updateArg = update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.updated_at).toBeDefined()
  })

  test('update 호출 시 name 이 전달된다', async () => {
    const { update } = makeUpdateChain()
    const { request, params } = makeRequest({ name: '새 상품명' })
    await PATCH(request, { params })
    const updateArg = update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.name).toBe('새 상품명')
  })

  test('.eq 에 올바른 product id 가 전달된다', async () => {
    const { eq } = makeUpdateChain()
    const { request, params } = makeRequest({ name: '새 상품명' }, 'prod-999')
    await PATCH(request, { params })
    expect(eq).toHaveBeenCalledWith('id', 'prod-999')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Supabase 오류 → 500
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/products/[id] — DB 오류 500', () => {
  beforeEach(() => mockRequireAuth.mockImplementation(makeAuthed))

  test('Supabase update 오류 시 500 을 반환한다', async () => {
    makeUpdateChain(null, { message: 'db error', code: '500' })
    const { request, params } = makeRequest({ name: '새 상품명' })
    const res = await PATCH(request, { params }) as unknown as MockResponse
    expect(res.status).toBe(500)
  })
})
