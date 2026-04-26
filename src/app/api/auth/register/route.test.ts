/**
 * @jest-environment node
 *
 * POST /api/auth/register Route Handler 테스트
 * - 인증 가드 (requireAuth)
 * - 입력값 유효성 검사 (email, password 필수, 비밀번호 8자 이상)
 * - Supabase admin.createUser 호출 확인
 * - 중복 이메일 처리 (409)
 * - profiles upsert 호출 확인
 * - 오류 처리 (500)
 */

jest.mock('next/headers', () => ({}), { virtual: true })

type MockRouteResponse = { body: unknown; status: number }

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

jest.mock('@/lib/api/requireAuth')
jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }))

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { POST } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk   = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth      = requireAuth      as jest.MockedFunction<typeof requireAuth>
const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

function makeUnauthedReturn(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401_RESPONSE })
}

function makeAuthedReturn(): Promise<AuthOk> {
  return Promise.resolve({ ok: true, user: { id: 'u1', email: 'admin@sellops.com' } as User })
}

const CREATED_USER: User = {
  id: 'new-user-001',
  email: 'newop@sellops.com',
  app_metadata: {},
  user_metadata: { name: '신규 운영자' },
  aud: 'authenticated',
  created_at: '2026-04-26T00:00:00.000Z',
} as User

function makeAdminMock({
  createUserResult = { data: { user: CREATED_USER }, error: null },
  upsertResult     = { error: null },
}: {
  createUserResult?: { data: { user: User | null }; error: { message: string } | null }
  upsertResult?:     { error: { message: string } | null }
} = {}) {
  const profilesUpsert = jest.fn().mockResolvedValue(upsertResult)
  const profilesOnConflict = jest.fn().mockReturnValue({ then: (cb: Function) => Promise.resolve(cb(upsertResult)) })
  const profilesFrom = jest.fn().mockReturnValue({
    upsert: jest.fn().mockReturnValue({
      // onConflict chained
      then: (cb: Function) => Promise.resolve(cb(upsertResult)),
    }),
  })

  const createUser = jest.fn().mockResolvedValue(createUserResult)

  const mockAdmin = {
    auth: {
      admin: {
        createUser,
      },
    },
    from: profilesFrom,
  }

  mockGetSupabaseAdmin.mockReturnValue(mockAdmin as unknown as ReturnType<typeof getSupabaseAdmin>)
  return { createUser, profilesFrom, profilesUpsert }
}

function makeRequest(body: Partial<{ email: string; password: string; name: string }>) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAuth.mockImplementation(makeAuthedReturn)
})

// ── 인증 가드 ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/register — 인증 가드', () => {
  test('requireAuth 가 false 이면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    makeAdminMock()

    const res = await POST(makeRequest({ email: 'a@b.com', password: 'password1' }))
    expect(res).toBe(MOCK_401_RESPONSE)
  })

  test('인증 실패 시 createUser 를 호출하지 않는다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    const { createUser } = makeAdminMock()

    await POST(makeRequest({ email: 'a@b.com', password: 'password1' }))
    expect(createUser).not.toHaveBeenCalled()
  })
})

// ── 입력값 유효성 검사 ─────────────────────────────────────────────────────────

describe('POST /api/auth/register — 유효성 검사', () => {
  test('email 이 없으면 400을 반환한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ password: 'password1' })) as MockRouteResponse
    expect(res.status).toBe(400)
    const body = res.body as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/필수/)
  })

  test('password 가 없으면 400을 반환한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ email: 'a@b.com' })) as MockRouteResponse
    expect(res.status).toBe(400)
    const body = res.body as { success: boolean; error: string }
    expect(body.success).toBe(false)
  })

  test('email 이 빈 문자열이면 400을 반환한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ email: '', password: 'password1' })) as MockRouteResponse
    expect(res.status).toBe(400)
  })

  test('password 가 빈 문자열이면 400을 반환한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ email: 'a@b.com', password: '' })) as MockRouteResponse
    expect(res.status).toBe(400)
  })

  test('password 가 7자이면 400을 반환한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ email: 'a@b.com', password: '1234567' })) as MockRouteResponse
    expect(res.status).toBe(400)
    const body = res.body as { error: string }
    expect(body.error).toMatch(/8자/)
  })

  test('password 가 8자이면 통과한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ email: 'a@b.com', password: '12345678' })) as MockRouteResponse
    expect(res.status).toBe(201)
  })
})

// ── 성공 ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register — 성공', () => {
  test('성공 시 201과 { success: true, data: { id, email } } 를 반환한다', async () => {
    makeAdminMock()
    const res = await POST(makeRequest({ email: 'newop@sellops.com', password: 'password1' })) as MockRouteResponse

    expect(res.status).toBe(201)
    const body = res.body as { success: boolean; data: { id: string; email: string } }
    expect(body.success).toBe(true)
    expect(body.data.email).toBe('newop@sellops.com')
    expect(body.data.id).toBe('new-user-001')
  })

  test('createUser 에 email_confirm: true 와 올바른 인자를 전달한다', async () => {
    const { createUser } = makeAdminMock()

    await POST(makeRequest({ email: 'op@sellops.com', password: 'mypassword', name: '운영자' }))

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email:         'op@sellops.com',
        password:      'mypassword',
        email_confirm: true,
      }),
    )
  })

  test('name 이 있고 user 가 생성되면 profiles.upsert 를 호출한다', async () => {
    const { profilesFrom } = makeAdminMock()

    await POST(makeRequest({ email: 'op@sellops.com', password: 'mypassword', name: '팀장' }))

    expect(profilesFrom).toHaveBeenCalledWith('profiles')
  })

  test('name 이 없으면 profiles.upsert 를 호출하지 않는다', async () => {
    const { profilesFrom } = makeAdminMock()

    await POST(makeRequest({ email: 'op@sellops.com', password: 'mypassword' }))

    expect(profilesFrom).not.toHaveBeenCalled()
  })
})

// ── 중복 이메일 ──────────────────────────────────────────────────────────────

describe('POST /api/auth/register — 중복 이메일', () => {
  test('"already registered" 오류 시 409 를 반환한다', async () => {
    makeAdminMock({
      createUserResult: {
        data: { user: null },
        error: { message: 'User already registered' },
      },
    })

    const res = await POST(makeRequest({ email: 'dup@sellops.com', password: 'password1' })) as MockRouteResponse

    expect(res.status).toBe(409)
    const body = res.body as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/이미 등록/)
  })

  test('"already been registered" 오류 시 409 를 반환한다', async () => {
    makeAdminMock({
      createUserResult: {
        data: { user: null },
        error: { message: 'Email has already been registered' },
      },
    })

    const res = await POST(makeRequest({ email: 'dup@sellops.com', password: 'password1' })) as MockRouteResponse

    expect(res.status).toBe(409)
  })
})

// ── 서버 오류 ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register — 서버 오류', () => {
  test('createUser 가 알 수 없는 오류를 throw 하면 500을 반환한다', async () => {
    const { createUser } = makeAdminMock()
    createUser.mockRejectedValue(new Error('unexpected db error'))

    const res = await POST(makeRequest({ email: 'a@b.com', password: 'password1' })) as MockRouteResponse

    expect(res.status).toBe(500)
    const body = res.body as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('운영자 등록에 실패했습니다.')
  })

  test('createUser 가 알 수 없는 Supabase 오류를 반환하면 500을 반환한다', async () => {
    makeAdminMock({
      createUserResult: {
        data: { user: null },
        error: { message: 'internal server error' },
      },
    })

    const res = await POST(makeRequest({ email: 'a@b.com', password: 'password1' })) as MockRouteResponse

    expect(res.status).toBe(500)
  })
})