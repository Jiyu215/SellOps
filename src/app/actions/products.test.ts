/**
 * saveProductAction 서버 액션 유닛 테스트
 *
 * Supabase admin 클라이언트를 모킹하여 실제 DB 호출 없이 검증합니다.
 */

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: jest.fn() }))

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { saveProductAction } from './products'
import type { ProductFormData } from '@/types/products'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type MockChain = Record<string, jest.Mock>

// ── Supabase mock 팩토리 ──────────────────────────────────────────────────────

const MOCK_NEW_ROW = {
  id:                'prod-supabase-1',
  product_code:      'TEST-001',
  name:              '테스트 상품',
  price:             50000,
  summary:           '요약 설명',
  short_description: '간단 설명',
  description:       '<p>상세 설명</p>',
  status:            'active',
  created_at:        '2024-01-15T00:00:00.000Z',
  updated_at:        '2024-01-15T00:00:00.000Z',
}

function makeProductsInsertChain(rowOverrides: Partial<typeof MOCK_NEW_ROW> = {}, error: unknown = null): MockChain {
  const single = jest.fn().mockResolvedValue({ data: error ? null : { ...MOCK_NEW_ROW, ...rowOverrides }, error })
  const select = jest.fn().mockReturnValue({ single })
  return { insert: jest.fn().mockReturnValue({ select }), single, select }
}

function makeProductsUpdateChain(error: unknown = null): MockChain {
  return { update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error }) }) }
}

function makeSupabaseMock({
  insertError = null as unknown,
  updateError = null as unknown,
  rowOverrides = {} as Partial<typeof MOCK_NEW_ROW>,
} = {}) {
  const productsInsert = makeProductsInsertChain(rowOverrides, insertError)
  const productsUpdate = makeProductsUpdateChain(updateError)

  const stocksChain  = { upsert: jest.fn().mockResolvedValue({ error: null }) }
  const historyChain = { insert: jest.fn().mockResolvedValue({ error: null }) }

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'products') return { ...productsInsert, ...productsUpdate }
    if (table === 'stocks') return stocksChain
    if (table === 'stock_histories') return historyChain
    return {}
  })

  ;(getSupabaseAdmin as jest.Mock).mockReturnValue({ from: mockFrom })

  return { mockFrom, stocksChain, historyChain }
}

// ── 공통 폼 데이터 팩토리 ─────────────────────────────────────────────────────

function makeFormData(overrides: Partial<ProductFormData> = {}): ProductFormData {
  return {
    name:             '테스트 상품',
    productCode:      'TEST-001',
    price:            50000,
    summary:          '요약 설명',
    shortDescription: '간단 설명',
    description:      '<p>상세 설명</p>',
    status:           'active',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────

describe('saveProductAction — 신규 생성', () => {
  test('id 필드를 반환한다', async () => {
    makeSupabaseMock()
    const result = await saveProductAction(makeFormData())
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })

  test('product 객체가 반환된다', async () => {
    makeSupabaseMock()
    const result = await saveProductAction(makeFormData())
    expect(result.product).toBeDefined()
  })

  test('반환된 product 의 name, price, status 가 폼 데이터와 일치한다', async () => {
    makeSupabaseMock({ rowOverrides: { name: '신규 상품', price: 99000, status: 'active' } })
    const result = await saveProductAction(makeFormData({ name: '신규 상품', price: 99000 }))
    expect(result.product!.name).toBe('신규 상품')
    expect(result.product!.price).toBe(99000)
    expect(result.product!.status).toBe('active')
  })

  test('반환된 product 의 productCode 가 Supabase 반환값을 따른다', async () => {
    makeSupabaseMock({ rowOverrides: { product_code: 'TEST-001' } })
    const result = await saveProductAction(makeFormData())
    expect(result.product!.productCode).toBe('TEST-001')
  })

  test('initialStock 미전달 시 stock 은 { total: 0, sold: 0, available: 0 }', async () => {
    makeSupabaseMock()
    const { product } = await saveProductAction(makeFormData())
    expect(product!.stock).toEqual({ total: 0, sold: 0, available: 0 })
  })

  test('initialStock 전달 시 stock 에 반영된다', async () => {
    makeSupabaseMock()
    const initialStock = { total: 100, sold: 0, available: 100 }
    const { product } = await saveProductAction(makeFormData(), undefined, initialStock)
    expect(product!.stock).toEqual(initialStock)
  })

  test('price 가 빈 문자열이면 0으로 저장된다', async () => {
    makeSupabaseMock({ rowOverrides: { price: 0 } })
    const { product } = await saveProductAction(makeFormData({ price: '' }))
    expect(product!.price).toBe(0)
  })

  test('price 가 0 이면 0으로 저장된다', async () => {
    makeSupabaseMock({ rowOverrides: { price: 0 } })
    const { product } = await saveProductAction(makeFormData({ price: 0 }))
    expect(product!.price).toBe(0)
  })

  test('images 는 빈 배열로 초기화된다', async () => {
    makeSupabaseMock()
    const { product } = await saveProductAction(makeFormData())
    expect(product!.images).toEqual([])
  })

  test('createdAt, updatedAt 이 ISO 형식 문자열이다', async () => {
    makeSupabaseMock()
    const { product } = await saveProductAction(makeFormData())
    expect(() => new Date(product!.createdAt)).not.toThrow()
    expect(() => new Date(product!.updatedAt)).not.toThrow()
    expect(product!.createdAt).toBe(new Date(product!.createdAt).toISOString())
  })

  test('status 가 hidden 으로 설정된 경우 product.status 도 hidden 이다', async () => {
    makeSupabaseMock({ rowOverrides: { status: 'hidden' } })
    const { product } = await saveProductAction(makeFormData({ status: 'hidden' }))
    expect(product!.status).toBe('hidden')
  })

  test('status 가 sold_out 으로 설정된 경우 product.status 도 sold_out 이다', async () => {
    makeSupabaseMock({ rowOverrides: { status: 'sold_out' } })
    const { product } = await saveProductAction(makeFormData({ status: 'sold_out' }))
    expect(product!.status).toBe('sold_out')
  })

  test('/dashboard/products 경로를 revalidate 한다', async () => {
    makeSupabaseMock()
    await saveProductAction(makeFormData())
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/products')
  })

  test('신규 생성 시 특정 상품 경로는 revalidate 하지 않는다', async () => {
    makeSupabaseMock()
    await saveProductAction(makeFormData())
    const calls = (revalidatePath as jest.Mock).mock.calls.map(([p]: [string]) => p)
    expect(calls.every((p) => !p.includes('/prod-'))).toBe(true)
  })

  test('Supabase insert 오류 시 에러를 throw 한다', async () => {
    makeSupabaseMock({ insertError: { message: 'db error', code: '500' } })
    await expect(saveProductAction(makeFormData())).rejects.toThrow('상품 등록에 실패했습니다.')
  })

  test('from("products") 호출 시 insert 에 올바른 필드를 전달한다', async () => {
    const { mockFrom } = makeSupabaseMock()
    const data = makeFormData({ name: '필드 검사', price: 12000 })
    await saveProductAction(data)

    const productsChain = mockFrom.mock.results[0].value as MockChain
    expect(productsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: '필드 검사', price: 12000 })
    )
  })

  test('from("stocks") 를 호출해 재고 레코드를 생성한다', async () => {
    const { stocksChain } = makeSupabaseMock()
    await saveProductAction(makeFormData())
    expect(stocksChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: MOCK_NEW_ROW.id }),
      expect.anything()
    )
  })

  test('initialStock.total > 0 이면 stock_histories insert 를 호출한다', async () => {
    const { historyChain } = makeSupabaseMock()
    await saveProductAction(makeFormData(), undefined, { total: 50, sold: 0, available: 50 })
    expect(historyChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'in', quantity: 50 })
    )
  })

  test('initialStock.total === 0 이면 stock_histories insert 를 호출하지 않는다', async () => {
    const { historyChain } = makeSupabaseMock()
    await saveProductAction(makeFormData(), undefined, { total: 0, sold: 0, available: 0 })
    expect(historyChain.insert).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('saveProductAction — 기존 상품 수정', () => {
  const EXISTING_ID = 'prod-001'

  test('수정된 상품 id 를 반환한다', async () => {
    makeSupabaseMock()
    const result = await saveProductAction(makeFormData(), EXISTING_ID)
    expect(result.id).toBe(EXISTING_ID)
  })

  test('수정 시 product 필드는 반환하지 않는다', async () => {
    makeSupabaseMock()
    const result = await saveProductAction(makeFormData(), EXISTING_ID)
    expect(result.product).toBeUndefined()
  })

  test('/dashboard/products/:id 경로를 revalidate 한다', async () => {
    makeSupabaseMock()
    await saveProductAction(makeFormData(), EXISTING_ID)
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/products/${EXISTING_ID}`)
  })

  test('/dashboard/products 경로도 revalidate 한다', async () => {
    makeSupabaseMock()
    await saveProductAction(makeFormData(), EXISTING_ID)
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/products')
  })

  test('price 가 빈 문자열이면 update body 에 price 를 포함하지 않는다', async () => {
    const { mockFrom } = makeSupabaseMock()
    await saveProductAction(makeFormData({ price: '' }), EXISTING_ID)
    const productsChain = mockFrom.mock.results[0].value as MockChain
    const updateArg = productsChain.update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg).not.toHaveProperty('price')
  })

  test('price 가 숫자이면 update body 에 price 가 포함된다', async () => {
    const { mockFrom } = makeSupabaseMock()
    await saveProductAction(makeFormData({ price: 99000 }), EXISTING_ID)
    const productsChain = mockFrom.mock.results[0].value as MockChain
    const updateArg = productsChain.update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg).toHaveProperty('price', 99000)
  })

  test('Supabase update 오류 시 에러를 throw 한다', async () => {
    makeSupabaseMock({ updateError: { message: 'db error', code: '500' } })
    await expect(saveProductAction(makeFormData(), EXISTING_ID)).rejects.toThrow('상품 수정에 실패했습니다.')
  })

  test('수정 시 summary, shortDescription, description 이 update body 에 포함된다', async () => {
    const { mockFrom } = makeSupabaseMock()
    await saveProductAction(
      makeFormData({ summary: '수정 요약', shortDescription: '수정 간단', description: '<p>수정</p>' }),
      EXISTING_ID
    )
    const productsChain = mockFrom.mock.results[0].value as MockChain
    const updateArg = productsChain.update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg).toMatchObject({
      summary:           '수정 요약',
      short_description: '수정 간단',
      description:       '<p>수정</p>',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('saveProductAction — getSupabaseAdmin 호출 검증', () => {
  test('신규 생성 시 getSupabaseAdmin 을 1회 호출한다', async () => {
    makeSupabaseMock()
    await saveProductAction(makeFormData())
    expect(getSupabaseAdmin).toHaveBeenCalledTimes(1)
  })

  test('수정 시 getSupabaseAdmin 을 1회 호출한다', async () => {
    makeSupabaseMock()
    await saveProductAction(makeFormData(), 'prod-001')
    expect(getSupabaseAdmin).toHaveBeenCalledTimes(1)
  })
})
