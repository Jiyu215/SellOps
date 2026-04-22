/**
 * @jest-environment node
 *
 * /api/products Route Handler 인증 가드 테스트.
 *
 * requireAuth가 미인증 응답을 반환하면 GET/POST handler가 DB 로직을 실행하지
 * 않고 즉시 해당 응답을 반환하는지 검증합니다.
 */

jest.mock('next/headers', () => ({}), { virtual: true })
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

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

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn(() => ({})) }))
jest.mock('@/lib/api/requireAuth')

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { GET, POST } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
)

function makeUnauthedReturn(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401_RESPONSE })
}

function makeAuthedReturn(): Promise<AuthOk> {
  return Promise.resolve({
    ok: true,
    user: { id: 'u1', email: 'admin@sellops.com' } as User,
  })
}

function makeRequest(url = 'http://localhost/api/products', options?: RequestInit) {
  return new Request(url, options)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/products - 미인증 401', () => {
  test('requireAuth가 ok: false를 반환하면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const response = await GET(makeRequest())

    expect(response).toBe(MOCK_401_RESPONSE)
  })

  test('requireAuth를 정확히 1회 호출한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    await GET(makeRequest())

    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
  })

  test('response.status가 401이다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
  })
})

describe('POST /api/products - 미인증 401', () => {
  test('requireAuth가 ok: false를 반환하면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const request = makeRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: '테스트 상품', price: 1000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)

    expect(response).toBe(MOCK_401_RESPONSE)
  })

  test('response.status가 401이다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const request = makeRequest('http://localhost/api/products', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})

describe('GET /api/products - 인증 상태', () => {
  test('requireAuth가 ok: true면 인증 가드 이후 로직으로 진입한다', async () => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)

    const response = await GET(makeRequest())

    expect(response.status).not.toBe(401)
  })
})
