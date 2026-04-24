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

jest.mock('@/lib/api/requireAuth')

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import { GET } from './route'

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

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('미인증이면 401 응답을 그대로 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)

    const response = await GET()

    expect(response).toBe(MOCK_401_RESPONSE)
  })

  test('인증되면 대시보드 데이터 응답을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)

    const response = await GET() as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        kpiData: expect.any(Array),
        dailyData: expect.any(Array),
        salesData: expect.any(Array),
        categoryData: expect.any(Array),
        inventoryItems: expect.any(Array),
        orders: expect.any(Array),
        topProducts: expect.any(Object),
      }),
    )
  })
})
