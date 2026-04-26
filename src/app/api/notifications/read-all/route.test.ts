/**
 * @jest-environment node
 *
 * POST /api/notifications/read-all Route Handler 테스트
 * - 인증 가드 (requireAuth)
 * - 성공 시 { success: true } 반환
 * - 모든 미확인 알림을 읽음으로 표시하는 쿼리 확인
 * - DB 오류 시 500 반환
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

jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/api/requireAuth')

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api/requireAuth'
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

function makeMockSupabase(updateError: { message: string } | null = null) {
  const eqChain  = { eq: jest.fn().mockResolvedValue({ error: updateError }) }
  const updateFn = jest.fn().mockReturnValue(eqChain)
  const from     = jest.fn().mockReturnValue({ update: updateFn })

  mockGetSupabaseAdmin.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>)
  return { from, updateFn, eqChain }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAuth.mockImplementation(makeAuthedReturn)
})

describe('POST /api/notifications/read-all', () => {
  test('인증되지 않으면 401을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    makeMockSupabase()
    const res = await POST()
    expect(res).toBe(MOCK_401_RESPONSE)
  })

  test('인증 실패 시 Supabase 를 호출하지 않는다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    const { from } = makeMockSupabase()
    await POST()
    expect(from).not.toHaveBeenCalled()
  })

  test('성공 시 200과 { success: true } 를 반환한다', async () => {
    makeMockSupabase()
    const res = await POST() as MockRouteResponse

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
  })

  test('is_read: true 로 업데이트 쿼리를 호출한다', async () => {
    const { updateFn } = makeMockSupabase()
    await POST()
    expect(updateFn).toHaveBeenCalledWith({ is_read: true })
  })

  test('is_read: false 필터 (eq) 로 미확인 알림만 업데이트한다', async () => {
    const { eqChain } = makeMockSupabase()
    await POST()
    expect(eqChain.eq).toHaveBeenCalledWith('is_read', false)
  })

  test('notifications 테이블에 대해 쿼리를 수행한다', async () => {
    const { from } = makeMockSupabase()
    await POST()
    expect(from).toHaveBeenCalledWith('notifications')
  })

  test('DB 오류 시 500을 반환한다', async () => {
    makeMockSupabase({ message: 'DB error' })
    const res = await POST() as MockRouteResponse

    expect(res.status).toBe(500)
    const body = res.body as { error: string }
    expect(body.error).toBe('전체 읽음 처리에 실패했습니다.')
  })

  test('getSupabaseAdmin 을 1회 호출한다', async () => {
    makeMockSupabase()
    await POST()
    expect(mockGetSupabaseAdmin).toHaveBeenCalledTimes(1)
  })
})
