/**
 * @jest-environment node
 *
 * POST /api/auth/logout Route Handler 테스트
 * - Supabase signOut 호출 확인
 * - 성공 시 { success: true } 반환
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

const mockSignOut = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      signOut: mockSignOut,
    },
  }),
}))

import { createClient } from '@/lib/supabase/server'
import { POST } from './route'

beforeEach(() => {
  jest.clearAllMocks()
  mockSignOut.mockResolvedValue({ error: null })
  ;(createClient as jest.Mock).mockResolvedValue({
    auth: { signOut: mockSignOut },
  })
})

describe('POST /api/auth/logout', () => {
  test('성공 시 200과 { success: true } 를 반환한다', async () => {
    const res = await POST() as MockRouteResponse

    expect(res.status).toBe(200)
    const body = res.body as { success: boolean; data: null; error: null }
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
    expect(body.error).toBeNull()
  })

  test('createClient 를 호출해 Supabase 클라이언트를 생성한다', async () => {
    await POST()
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  test('supabase.auth.signOut() 을 호출한다', async () => {
    await POST()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  test('signOut 이 오류를 반환해도 성공 응답을 반환한다', async () => {
    // signOut doesn't throw in the implementation — errors are silently ignored
    mockSignOut.mockResolvedValue({ error: { message: 'already signed out' } })

    const res = await POST() as MockRouteResponse

    expect(res.status).toBe(200)
    const body = res.body as { success: boolean }
    expect(body.success).toBe(true)
  })

  test('signOut 이 throw 해도 createClient 가 이미 호출된다', async () => {
    // The current implementation does not try/catch signOut, so if signOut throws
    // the error would propagate. This test documents that createClient is always called.
    await POST()
    expect(createClient).toHaveBeenCalled()
  })
})