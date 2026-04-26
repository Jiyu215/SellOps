/**
 * @jest-environment node
 *
 * DELETE /api/notifications/[id] Route Handler 테스트
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
import { DELETE } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk   = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth     = requireAuth     as jest.MockedFunction<typeof requireAuth>
const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

function makeAuthedReturn(): Promise<AuthOk> {
  return Promise.resolve({ ok: true, user: { id: 'u1', email: 'admin@sellops.com' } as User })
}
function makeUnauthedReturn(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401_RESPONSE })
}

function makeMockSupabase(deleteError: { message: string } | null = null) {
  const deleteChain = {
    eq:   jest.fn().mockResolvedValue({ error: deleteError }),
  }
  const deleteFunc = jest.fn(() => deleteChain)
  const from = jest.fn(() => ({ delete: deleteFunc }))
  mockGetSupabaseAdmin.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>)
  return { from, deleteFunc, deleteChain }
}

function makeRequest(id = 'notif-001') {
  return {
    request: new Request(`http://localhost/api/notifications/${id}`, { method: 'DELETE' }),
    params:  Promise.resolve({ id }),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAuth.mockImplementation(makeAuthedReturn)
})

describe('DELETE /api/notifications/[id]', () => {
  test('인증되지 않으면 401을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    makeMockSupabase()
    const { request, params } = makeRequest()
    const res = await DELETE(request, { params })
    expect(res).toBe(MOCK_401_RESPONSE)
  })

  test('성공 시 { success: true }를 반환한다', async () => {
    makeMockSupabase()
    const { request, params } = makeRequest()
    const res = await DELETE(request, { params }) as MockRouteResponse

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
  })

  test('올바른 id로 delete 쿼리가 호출된다', async () => {
    const { deleteChain } = makeMockSupabase()
    const { request, params } = makeRequest('notif-abc')
    await DELETE(request, { params })
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'notif-abc')
  })

  test('DB 오류 시 500을 반환한다', async () => {
    makeMockSupabase({ message: 'DB error' })
    const { request, params } = makeRequest()
    const res = await DELETE(request, { params }) as MockRouteResponse

    expect(res.status).toBe(500)
    expect((res.body as { error: string }).error).toBe('알림 삭제에 실패했습니다.')
  })
})
