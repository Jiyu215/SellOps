/**
 * @jest-environment node
 *
 * GET /api/notifications Route Handler 테스트
 * - 필터 파라미터(status, type, level, period) 적용 확인
 * - 페이지네이션(page, limit) 적용 확인
 * - summary 집계 포함 확인
 * - 인증 실패 시 401 반환 확인
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
import { GET } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk  = Extract<AuthResult, { ok: true }>
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

const MOCK_ITEMS = [
  { id: 'n1', type: 'inventory', level: 'critical', title: '재고 소진', message: '나이키 에어맥스 90 재고가 소진되었습니다.', link: '/products/p1', is_read: false, created_at: new Date().toISOString() },
  { id: 'n2', type: 'order',     level: 'info',     title: '신규 주문', message: '새 주문 #1042',                           link: '/orders/o1', is_read: false, created_at: new Date().toISOString() },
  { id: 'n3', type: 'system',    level: 'warning',  title: '시스템 경고', message: '이미지 업로드 실패',                     link: null,         is_read: true,  created_at: new Date().toISOString() },
]

function makeMockSupabase(items = MOCK_ITEMS, count = items.length) {
  const rangeResult = {
    data:  items,
    count,
    error: null,
  }

  const summaryResult = {
    data: items.map(({ level, is_read }) => ({ level, is_read })),
    error: null,
  }

  let isRange = false
  const queryChain = {
    select: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    range:  jest.fn().mockImplementation(() => { isRange = true; return queryChain }),
    eq:     jest.fn().mockReturnThis(),
    gte:    jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnThis(),
    then:   (cb: (v: typeof rangeResult | typeof summaryResult) => unknown) =>
      Promise.resolve(cb(isRange ? rangeResult : summaryResult)),
  }

  const from = jest.fn(() => queryChain)
  mockGetSupabaseAdmin.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>)

  return { from, queryChain }
}

function makeRequest(search = '') {
  return new Request(`http://localhost/api/notifications${search ? `?${search}` : ''}`)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAuth.mockImplementation(makeAuthedReturn)
})

describe('GET /api/notifications', () => {
  test('인증되지 않으면 401을 반환한다', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    makeMockSupabase()
    const res = await GET(makeRequest())
    expect(res).toBe(MOCK_401_RESPONSE)
  })

  test('기본 요청 시 items·total·page·limit·summary를 반환한다', async () => {
    makeMockSupabase()
    const res = await GET(makeRequest()) as MockRouteResponse

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number; page: number; limit: number; summary: unknown }
    expect(body.items).toHaveLength(MOCK_ITEMS.length)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.summary).toMatchObject({
      total:    MOCK_ITEMS.length,
      unread:   MOCK_ITEMS.filter((n) => !n.is_read).length,
      critical: MOCK_ITEMS.filter((n) => n.level === 'critical' && !n.is_read).length,
      warning:  MOCK_ITEMS.filter((n) => n.level === 'warning'  && !n.is_read).length,
    })
  })

  test('status=unread 필터가 eq 쿼리로 전달된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('status=unread'))
    expect(queryChain.eq).toHaveBeenCalledWith('is_read', false)
  })

  test('type=inventory 필터가 eq 쿼리로 전달된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('type=inventory'))
    expect(queryChain.eq).toHaveBeenCalledWith('type', 'inventory')
  })

  test('level=critical 필터가 eq 쿼리로 전달된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('level=critical'))
    expect(queryChain.eq).toHaveBeenCalledWith('level', 'critical')
  })

  test('period=today 필터가 gte 쿼리로 전달된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('period=today'))
    expect(queryChain.gte).toHaveBeenCalledWith('created_at', expect.any(String))
  })

  test('period=7d 필터가 gte 쿼리로 전달된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('period=7d'))
    expect(queryChain.gte).toHaveBeenCalledWith('created_at', expect.any(String))
  })

  test('page=2&limit=50 페이지네이션이 반영된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('page=2&limit=50'))
    expect(queryChain.range).toHaveBeenCalledWith(50, 99)
  })

  test('limit 최대값 100을 초과하면 100으로 제한된다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('limit=999'))
    // limit은 100으로 제한 → range(0, 99)
    expect(queryChain.range).toHaveBeenCalledWith(0, 99)
  })

  test('유효하지 않은 type 파라미터는 필터를 적용하지 않는다', async () => {
    const { queryChain } = makeMockSupabase()
    await GET(makeRequest('type=invalid'))
    const calls = (queryChain.eq as jest.Mock).mock.calls
    expect(calls.every((c: unknown[]) => c[0] !== 'type')).toBe(true)
  })
})
