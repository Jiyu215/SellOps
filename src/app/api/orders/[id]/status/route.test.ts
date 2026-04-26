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

jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/api/requireAuth')
jest.mock('@/lib/notifications', () => ({
  createNotifications: jest.fn().mockResolvedValue(undefined),
  createNotification:  jest.fn().mockResolvedValue(undefined),
}))

import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api/requireAuth'
import { PATCH } from './route'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthOk = Extract<AuthResult, { ok: true }>
type AuthFail = Extract<AuthResult, { ok: false }>

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

const MOCK_401_RESPONSE: AuthFail['response'] = NextResponse.json(
  { error: '인증이 필요합니다.' },
  { status: 401 },
) as unknown as AuthFail['response']

const DEFAULT_UPDATED_ORDER = {
  id: 'order-001',
  order_number: 'SO-2026-000001',
  customer_name: '테스트 고객',
  total_amount: 10000,
  status: 'pending',
  order_status: 'order_confirmed',
  payment_status: 'payment_completed',
  shipping_status: 'shipping_ready',
  stock_status: 'none',
  updated_at: '2026-04-23T00:00:00.000Z',
}

function makeUnauthedReturn(): Promise<AuthFail> {
  return Promise.resolve({ ok: false, response: MOCK_401_RESPONSE })
}

function makeAuthedReturn(): Promise<AuthOk> {
  return Promise.resolve({
    ok: true,
    user: { id: 'u1', email: 'admin@sellops.com' } as User,
  })
}

function makeRequest(body: unknown, orderId = 'order-001') {
  return {
    request: new Request(`http://localhost/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    params: Promise.resolve({ id: orderId }),
  }
}

type MockOptions = {
  currentOrder?: {
    order_number: string
    order_status: string
    payment_status: string
    shipping_status: string
    stock_status: string
  }
  orderItems?: Array<{ product_id: string; quantity: number }>
  stockRow?: { product_id: string; total: number; sold: number }
  stockError?: { code?: string; message?: string } | null
  rpcData?: unknown
  rpcError?: { code?: string; message?: string } | null
}

function makeSupabaseAdminMock(options: MockOptions = {}) {
  const currentOrder = options.currentOrder ?? {
    order_number: 'SO-2026-000001',
    order_status: 'order_confirmed',
    payment_status: 'payment_completed',
    shipping_status: 'shipping_ready',
    stock_status: 'none',
  }
  const orderItems = options.orderItems ?? [{ product_id: 'product-001', quantity: 2 }]
  const stockRow = options.stockRow ?? { product_id: 'product-001', total: 10, sold: 0 }
  const rpcData = options.rpcData ?? DEFAULT_UPDATED_ORDER
  const rpcError = options.rpcError ?? null

  const stockError = options.stockError ?? null
  const ordersSelectSingle = jest.fn().mockResolvedValue({ data: currentOrder, error: null })
  const orderItemsEq = jest.fn().mockResolvedValue({ data: orderItems, error: null })
  const stockSelectSingle = jest.fn().mockResolvedValue({ data: stockError ? null : stockRow, error: stockError })
  const stockHistoryInsert = jest.fn().mockResolvedValue({ error: null })
  const orderStatusHistoryInsert = jest.fn().mockResolvedValue({ error: null })

  const orderUpdateSingle = jest.fn().mockResolvedValue({
    data: DEFAULT_UPDATED_ORDER,
    error: null,
  })

  const ordersUpdate = jest.fn(() => ({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: orderUpdateSingle,
      }),
    }),
  }))

  const stocksUpdate = jest.fn((payload: Record<string, unknown>) => ({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { ...stockRow, ...payload },
          error: null,
        }),
      }),
    }),
  }))

  const rpc = jest.fn().mockImplementation(async (fn: string) => {
    if (fn === 'update_order_status_with_stock') {
      return { data: rpcData, error: rpcError }
    }

    return { data: null, error: null }
  })

  const from = jest.fn((table: string) => {
    if (table === 'orders') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: ordersSelectSingle,
          }),
        }),
        update: ordersUpdate,
      }
    }

    if (table === 'order_items') {
      return {
        select: jest.fn().mockReturnValue({
          eq: orderItemsEq,
        }),
      }
    }

    if (table === 'stocks') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: stockSelectSingle,
          }),
        }),
        update: stocksUpdate,
      }
    }

    if (table === 'stock_histories') {
      return { insert: stockHistoryInsert }
    }

    if (table === 'order_status_histories') {
      return { insert: orderStatusHistoryInsert }
    }

    return {}
  })

  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ rpc, from })

  return {
    rpc,
    ordersUpdate,
    stocksUpdate,
    stockHistoryInsert,
    orderStatusHistoryInsert,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PATCH /api/orders/[id]/status', () => {
  beforeEach(() => {
    mockRequireAuth.mockImplementation(makeAuthedReturn)
  })

  test('unauthenticated request returns 401', async () => {
    mockRequireAuth.mockImplementation(makeUnauthedReturn)
    const { rpc } = makeSupabaseAdminMock()
    const { request, params } = makeRequest({ order_status: 'order_confirmed' })

    const response = await PATCH(request, { params })

    expect(response).toBe(MOCK_401_RESPONSE)
    expect(rpc).not.toHaveBeenCalled()
  })

  test('empty body returns 400', async () => {
    const { rpc } = makeSupabaseAdminMock()
    const { request, params } = makeRequest({})

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  test('status-only update bypasses stock rpc', async () => {
    const { rpc, stocksUpdate, orderStatusHistoryInsert } = makeSupabaseAdminMock({
      currentOrder: {
        order_number: 'SO-2026-000001',
        order_status: 'order_waiting',
        payment_status: 'refund_in_progress',
        shipping_status: 'shipping_in_progress',
        stock_status: 'none',
      },
    })
    const { request, params } = makeRequest({ order_status: 'order_confirmed' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(rpc).not.toHaveBeenCalled()
    expect(stocksUpdate).not.toHaveBeenCalled()
    expect(orderStatusHistoryInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        status_type: 'order_status',
        from_status: 'order_waiting',
        to_status: 'order_confirmed',
      }),
    ]))
  })

  test('rpc success returns applied stock status without extra stock mutation', async () => {
    const { rpc, stocksUpdate } = makeSupabaseAdminMock({
      rpcData: {
        ...DEFAULT_UPDATED_ORDER,
        shipping_status: 'shipping_completed',
        stock_status: 'applied',
      },
    })
    const { request, params } = makeRequest({ shipping_status: 'shipping_completed' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({
      shipping_status: 'shipping_completed',
      stock_status: 'applied',
    }))
    expect(rpc).toHaveBeenCalledWith('update_order_status_with_stock', expect.anything())
    expect(stocksUpdate).not.toHaveBeenCalled()
  })

  test('fallback reserve updates sold once and marks stock as applied', async () => {
    const { rpc, stocksUpdate, stockHistoryInsert } = makeSupabaseAdminMock({
      currentOrder: {
        order_number: 'SO-2026-000001',
        order_status: 'order_waiting',
        payment_status: 'payment_pending',
        shipping_status: 'shipping_ready',
        stock_status: 'none',
      },
      rpcError: { code: 'PGRST202', message: 'Could not find update_order_status_with_stock' },
    })
    const { request, params } = makeRequest({ shipping_status: 'shipping_in_progress' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(stocksUpdate).toHaveBeenCalledWith({ total: 10, sold: 2 })
    expect(stockHistoryInsert).toHaveBeenCalledWith({
      product_id: 'product-001',
      type: 'out',
      quantity: 2,
      reason: 'SO-2026-000001',
    })
    expect(rpc).toHaveBeenCalledWith('update_order_status_with_stock', expect.anything())
  })

  test('fallback finalize reduces total once and keeps available stable after reserve', async () => {
    const { rpc, stocksUpdate, stockHistoryInsert } = makeSupabaseAdminMock({
      currentOrder: {
        order_number: 'SO-2026-000001',
        order_status: 'order_confirmed',
        payment_status: 'payment_completed',
        shipping_status: 'shipping_in_progress',
        stock_status: 'applied',
      },
      stockRow: { product_id: 'product-001', total: 10, sold: 2 },
      rpcError: { code: 'PGRST202', message: 'Could not find update_order_status_with_stock' },
    })
    const { request, params } = makeRequest({
      order_status: 'order_completed',
      shipping_status: 'shipping_completed',
    })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(200)
    expect(stocksUpdate).toHaveBeenCalledWith({ total: 8, sold: 0 })
    expect(stockHistoryInsert).toHaveBeenCalledWith({
      product_id: 'product-001',
      type: 'out',
      quantity: 2,
      reason: 'SO-2026-000001',
    })
    expect(rpc).toHaveBeenCalledWith('update_order_status_with_stock', expect.anything())
  })

  test('insufficient stock returns 400 before mutation', async () => {
    const { rpc, stocksUpdate } = makeSupabaseAdminMock({
      orderItems: [{ product_id: 'product-001', quantity: 3 }],
      stockRow: { product_id: 'product-001', total: 2, sold: 0 },
    })
    const { request, params } = makeRequest({ shipping_status: 'shipping_in_progress' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(400)
    expect(stocksUpdate).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalledWith('update_order_status_with_stock', expect.anything())
  })

  test('missing stock row (PGRST116) returns 404 not 500 during 배송시작', async () => {
    const { rpc, stocksUpdate } = makeSupabaseAdminMock({
      currentOrder: {
        order_number: 'SO-2026-000001',
        order_status: 'order_confirmed',
        payment_status: 'payment_completed',
        shipping_status: 'shipping_ready',
        stock_status: 'none',
      },
      stockError: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })
    const { request, params } = makeRequest({ shipping_status: 'shipping_in_progress' })

    const response = await PATCH(request, { params }) as MockRouteResponse

    expect(response.status).toBe(404)
    expect((response.body as { error: string }).error).toBe('상품 재고 정보를 찾을 수 없습니다.')
    expect(stocksUpdate).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalledWith('update_order_status_with_stock', expect.anything())
  })
})
