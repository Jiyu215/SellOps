// next/server, next/headers, supabase/server는 서버 전용 모듈이므로 모킹 필수
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

jest.mock('next/headers', () => ({}), { virtual: true })

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './requireAuth'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeSupabaseMock(user: object | null) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────

describe('requireAuth — 미인증 상태 (user: null)', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null))
  })

  test('ok: false 를 반환한다', async () => {
    const result = await requireAuth()
    expect(result.ok).toBe(false)
  })

  test('ok: false 일 때 response 필드가 존재한다', async () => {
    const result = await requireAuth()
    expect('response' in result).toBe(true)
  })

  test('response.status 가 401 이다', async () => {
    const result = await requireAuth()
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })

  test('response body 에 error 문자열이 포함된다', async () => {
    const result = await requireAuth()
    if (!result.ok) {
      const body = (result.response as unknown as { body: { error: string } }).body
      expect(typeof body.error).toBe('string')
      expect(body.error.length).toBeGreaterThan(0)
    }
  })

  test('ok: false 일 때 user 필드가 없다', async () => {
    const result = await requireAuth()
    expect('user' in result).toBe(false)
  })

  test('연속 호출해도 항상 401을 반환한다', async () => {
    for (let i = 0; i < 3; i++) {
      const result = await requireAuth()
      expect(result.ok).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('requireAuth — 인증 상태 (user 존재)', () => {
  const mockUser = { id: 'user-abc', email: 'admin@sellops.com', role: 'authenticated' }

  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(mockUser))
  })

  test('ok: true 를 반환한다', async () => {
    const result = await requireAuth()
    expect(result.ok).toBe(true)
  })

  test('ok: true 일 때 user 필드가 존재한다', async () => {
    const result = await requireAuth()
    expect('user' in result).toBe(true)
  })

  test('반환된 user 객체가 Supabase에서 받은 user와 동일하다', async () => {
    const result = await requireAuth()
    if (result.ok) {
      expect(result.user).toBe(mockUser)
    }
  })

  test('ok: true 일 때 response 필드가 없다', async () => {
    const result = await requireAuth()
    expect('response' in result).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('requireAuth — createClient 동작 검증', () => {
  test('호출 시 createClient 를 정확히 1회 실행한다', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null))
    await requireAuth()
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
  })

  test('매 호출마다 새로운 createClient를 실행한다', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null))
    await requireAuth()
    await requireAuth()
    expect(mockCreateClient).toHaveBeenCalledTimes(2)
  })

  test('getUser 를 정확히 1회 호출한다', async () => {
    const supabaseMock = makeSupabaseMock(null)
    mockCreateClient.mockResolvedValue(supabaseMock)
    await requireAuth()
    expect(supabaseMock.auth.getUser).toHaveBeenCalledTimes(1)
  })
})
