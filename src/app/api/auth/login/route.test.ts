/**
 * @jest-environment node
 *
 * POST /api/auth/login Route Handler 테스트
 * - Supabase signInWithPassword 기반 인증
 * - 성공 시 사용자 정보 및 쿠키 반환
 * - 인증 실패 시 401 반환
 * - 서버 오류 시 500 반환
 */

jest.mock('next/headers', () => ({}), { virtual: true })

type MockCookieOptions = Record<string, unknown>

// Minimal cookie mock to capture set() calls
const mockResponseCookiesSet = jest.fn()
const mockResponseCookiesDelete = jest.fn()

jest.mock('next/server', () => {
  const NextResponse = {
    json: jest.fn().mockImplementation((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      cookies: {
        set: mockResponseCookiesSet,
        delete: mockResponseCookiesDelete,
      },
    })),
  }
  return { NextResponse }
})

// Mock @supabase/ssr createServerClient
const mockSignInWithPassword = jest.fn()
const mockProfilesQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
}
const mockFrom = jest.fn().mockReturnValue(mockProfilesQuery)

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockImplementation(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
    from: mockFrom,
  })),
}))

import { createServerClient } from '@supabase/ssr'
import { POST } from './route'

type MockRouteResponse = { body: unknown; status: number; cookies: { set: jest.Mock; delete: jest.Mock } }

function makeRequest(body: { email: string; password: string }) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // @ts-expect-error minimal mock
    cookies: {
      getAll: () => [],
    },
  }) as unknown as import('next/server').NextRequest
}

const MOCK_USER = {
  id: 'user-001',
  email: 'admin@sellops.com',
  user_metadata: { name: '관리자' },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockResponseCookiesSet.mockReset()
  // Reset from mock
  mockFrom.mockReturnValue(mockProfilesQuery)
  mockProfilesQuery.select.mockReturnThis()
  mockProfilesQuery.eq.mockReturnThis()
  mockProfilesQuery.maybeSingle.mockResolvedValue({ data: null })
  ;(createServerClient as jest.Mock).mockImplementation(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
    from: mockFrom,
  }))
})

describe('POST /api/auth/login — 성공', () => {
  test('유효한 자격증명으로 성공 응답 200을 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { access_token: 'token-abc' } },
      error: null,
    })

    const res = await POST(makeRequest({ email: 'admin@sellops.com', password: 'Admin1234!' })) as MockRouteResponse

    expect(res.status).toBe(200)
    const body = res.body as { success: boolean; data: { id: string; email: string; name: string }; error: null }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('user-001')
    expect(body.data.email).toBe('admin@sellops.com')
    expect(body.error).toBeNull()
  })

  test('profiles 테이블에서 name을 조회하면 해당 name을 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: {} },
      error: null,
    })
    mockProfilesQuery.maybeSingle.mockResolvedValue({ data: { name: '운영팀장' } })

    const res = await POST(makeRequest({ email: 'admin@sellops.com', password: 'Admin1234!' })) as MockRouteResponse

    const body = res.body as { data: { name: string } }
    expect(body.data.name).toBe('운영팀장')
  })

  test('profiles 조회 실패 시 user_metadata.name을 fallback으로 사용한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { ...MOCK_USER, user_metadata: { name: '메타이름' } }, session: {} },
      error: null,
    })
    mockProfilesQuery.maybeSingle.mockResolvedValue({ data: null })

    const res = await POST(makeRequest({ email: 'admin@sellops.com', password: 'pass' })) as MockRouteResponse

    const body = res.body as { data: { name: string } }
    expect(body.data.name).toBe('메타이름')
  })

  test('user_metadata.name도 없으면 "운영자"를 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { ...MOCK_USER, user_metadata: {} }, session: {} },
      error: null,
    })
    mockProfilesQuery.maybeSingle.mockResolvedValue({ data: null })

    const res = await POST(makeRequest({ email: 'admin@sellops.com', password: 'pass' })) as MockRouteResponse

    const body = res.body as { data: { name: string } }
    expect(body.data.name).toBe('운영자')
  })

  test('sellops-auth-token 쿠키를 응답에 설정한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: {} },
      error: null,
    })

    await POST(makeRequest({ email: 'admin@sellops.com', password: 'Admin1234!' }))

    const cookieCalls = mockResponseCookiesSet.mock.calls
    const authTokenCall = cookieCalls.find(([name]: [string]) => name === 'sellops-auth-token')
    expect(authTokenCall).toBeDefined()
    expect(authTokenCall[2]).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  })

  test('sellops-auth-token 쿠키 값이 user 정보의 base64 인코딩이다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: {} },
      error: null,
    })

    await POST(makeRequest({ email: 'admin@sellops.com', password: 'Admin1234!' }))

    const cookieCalls = mockResponseCookiesSet.mock.calls
    const authTokenCall = cookieCalls.find(([name]: [string]) => name === 'sellops-auth-token')
    const tokenValue = authTokenCall[1] as string
    const decoded = JSON.parse(Buffer.from(tokenValue, 'base64').toString('utf-8'))
    expect(decoded.id).toBe('user-001')
    expect(decoded.email).toBe('admin@sellops.com')
  })

  test('signInWithPassword에 email과 password를 전달한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: {} },
      error: null,
    })

    await POST(makeRequest({ email: 'test@example.com', password: 'mypassword' }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'mypassword',
    })
  })
})

describe('POST /api/auth/login — 인증 실패', () => {
  test('Supabase error 반환 시 401을 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const res = await POST(makeRequest({ email: 'wrong@email.com', password: 'wrong' })) as MockRouteResponse

    expect(res.status).toBe(401)
    const body = res.body as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  test('data.user가 null이면 401을 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    const res = await POST(makeRequest({ email: 'admin@sellops.com', password: 'wrong' })) as MockRouteResponse

    expect(res.status).toBe(401)
  })

  test('401 응답에 success: false 와 적절한 오류 메시지가 포함된다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'auth error' },
    })

    const res = await POST(makeRequest({ email: 'a@b.com', password: 'x' })) as MockRouteResponse
    const body = res.body as { success: boolean; data: null; error: string }
    expect(body.data).toBeNull()
    expect(body.error).toMatch(/올바르지 않습니다/)
  })
})

describe('POST /api/auth/login — 서버 오류', () => {
  test('예외 발생 시 500을 반환한다', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('network error'))

    const res = await POST(makeRequest({ email: 'admin@sellops.com', password: 'pass' })) as MockRouteResponse

    expect(res.status).toBe(500)
    const body = res.body as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('서버 오류가 발생했습니다.')
  })
})