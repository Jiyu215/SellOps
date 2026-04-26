import { stockAdjustSchema } from './product.schema'

// ─────────────────────────────────────────────────────────────────────────────
// stockAdjustSchema — type 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('stockAdjustSchema — type 검증', () => {
  test.each(['in', 'out'])('"%s" 는 유효하다', (type) => {
    expect(stockAdjustSchema.safeParse({ type, quantity: 1 }).success).toBe(true)
  })

  test.each(['IN', 'OUT', 'add', 'remove', '', 0, null, undefined])(
    '"%s" 는 유효하지 않다',
    (type) => {
      expect(stockAdjustSchema.safeParse({ type, quantity: 1 }).success).toBe(false)
    }
  )

  test('type 누락 시 거부한다', () => {
    expect(stockAdjustSchema.safeParse({ quantity: 1 }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// stockAdjustSchema — quantity 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('stockAdjustSchema — quantity 검증', () => {
  test('양의 정수는 유효하다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 1 }).success).toBe(true)
    expect(stockAdjustSchema.safeParse({ type: 'out', quantity: 100 }).success).toBe(true)
  })

  test('0 은 거부한다 (양의 정수만 허용)', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 0 }).success).toBe(false)
  })

  test('음수는 거부한다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: -1 }).success).toBe(false)
  })

  test('소수는 거부한다 (정수만 허용)', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 1.5 }).success).toBe(false)
  })

  test('문자열 숫자는 거부한다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: '10' }).success).toBe(false)
  })

  test('quantity 누락 시 거부한다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in' }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// stockAdjustSchema — reason 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('stockAdjustSchema — reason 검증', () => {
  test('reason 없이도 유효하다 (optional)', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 5 }).success).toBe(true)
  })

  test('reason 이 문자열이면 유효하다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 5, reason: '초기 입고' }).success).toBe(true)
  })

  test('reason 이 빈 문자열이면 유효하다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 5, reason: '' }).success).toBe(true)
  })

  test('reason 이 100자이면 유효하다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 5, reason: 'a'.repeat(100) }).success).toBe(true)
  })

  test('reason 이 101자이면 거부한다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 5, reason: 'a'.repeat(101) }).success).toBe(false)
  })

  test('reason 이 숫자이면 거부한다', () => {
    expect(stockAdjustSchema.safeParse({ type: 'in', quantity: 5, reason: 123 }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// stockAdjustSchema — 허용되지 않은 필드 차단 (.strict)
// ─────────────────────────────────────────────────────────────────────────────

describe('stockAdjustSchema — 허용되지 않은 필드 차단', () => {
  test.each([
    'product_id',
    'id',
    'created_at',
    'user_id',
    '__proto__',
    'constructor',
  ])('"%s" 필드가 포함되면 거부한다', (field) => {
    const result = stockAdjustSchema.safeParse({ type: 'in', quantity: 1, [field]: 'anything' })
    expect(result.success).toBe(false)
  })

  test('허용된 필드와 허용되지 않은 필드가 혼합되면 거부한다', () => {
    const result = stockAdjustSchema.safeParse({
      type:       'in',
      quantity:   10,
      product_id: 'malicious-id',
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// stockAdjustSchema — 파싱 결과 확인
// ─────────────────────────────────────────────────────────────────────────────

describe('stockAdjustSchema — 파싱 결과', () => {
  test('safeParse 성공 시 data 에 입력값이 담긴다', () => {
    const input = { type: 'in' as const, quantity: 50, reason: '추가 입고' }
    const result = stockAdjustSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(input)
    }
  })

  test('reason 생략 시 data.reason 은 undefined 이다', () => {
    const result = stockAdjustSchema.safeParse({ type: 'out', quantity: 10 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBeUndefined()
    }
  })

  test('safeParse 실패 시 error.flatten().fieldErrors 에 필드별 오류가 담긴다', () => {
    const result = stockAdjustSchema.safeParse({ type: 'bad', quantity: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.type).toBeDefined()
      expect(errors.quantity).toBeDefined()
    }
  })
})
