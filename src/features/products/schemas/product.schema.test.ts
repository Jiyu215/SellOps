import { productStatusSchema, productUpdateSchema } from './product.schema'

// ─────────────────────────────────────────────────────────────────────────────
// productStatusSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('productStatusSchema', () => {
  test.each(['active', 'hidden', 'sold_out'])('"%s" 는 유효하다', (status) => {
    expect(productStatusSchema.safeParse(status).success).toBe(true)
  })

  test.each(['ACTIVE', 'draft', 'pending', '', 0, null, undefined])(
    '"%s" 는 유효하지 않다',
    (status) => {
      expect(productStatusSchema.safeParse(status).success).toBe(false)
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — 허용 필드 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — 허용 필드', () => {
  test('빈 객체는 유효하다 (모든 필드가 optional)', () => {
    expect(productUpdateSchema.safeParse({}).success).toBe(true)
  })

  test('name 단독 업데이트는 유효하다', () => {
    expect(productUpdateSchema.safeParse({ name: '새 상품명' }).success).toBe(true)
  })

  test('price 단독 업데이트는 유효하다', () => {
    expect(productUpdateSchema.safeParse({ price: 50000 }).success).toBe(true)
  })

  test('status 단독 업데이트는 유효하다', () => {
    expect(productUpdateSchema.safeParse({ status: 'hidden' }).success).toBe(true)
  })

  test('product_code 단독 업데이트는 유효하다', () => {
    expect(productUpdateSchema.safeParse({ product_code: 'ABC-123' }).success).toBe(true)
  })

  test('허용된 모든 필드를 한 번에 전송해도 유효하다', () => {
    const result = productUpdateSchema.safeParse({
      name:              '전체 수정',
      price:             99000,
      product_code:      'FULL-001',
      summary:           '요약',
      short_description: '간단 설명',
      description:       '<p>상세</p>',
      status:            'active',
    })
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — 허용되지 않은 필드 차단 (.strict)
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — 허용되지 않은 필드 차단', () => {
  test.each([
    'id',
    'created_at',
    'updated_at',
    'user_id',
    'stock',
    'images',
    '__proto__',
    'constructor',
  ])('"%s" 필드가 포함되면 거부한다', (field) => {
    const result = productUpdateSchema.safeParse({ [field]: 'anything' })
    expect(result.success).toBe(false)
  })

  test('허용된 필드와 허용되지 않은 필드가 혼합되면 거부한다', () => {
    const result = productUpdateSchema.safeParse({
      name: '상품명',
      id:   'malicious-id',
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — name 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — name 검증', () => {
  test('1자 이상이어야 한다', () => {
    expect(productUpdateSchema.safeParse({ name: '' }).success).toBe(false)
  })

  test('100자 이하이어야 한다', () => {
    expect(productUpdateSchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true)
    expect(productUpdateSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })

  test('문자열이 아니면 거부한다', () => {
    expect(productUpdateSchema.safeParse({ name: 123 }).success).toBe(false)
    expect(productUpdateSchema.safeParse({ name: null }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — price 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — price 검증', () => {
  test('0 은 유효하다', () => {
    expect(productUpdateSchema.safeParse({ price: 0 }).success).toBe(true)
  })

  test('양의 정수는 유효하다', () => {
    expect(productUpdateSchema.safeParse({ price: 99000 }).success).toBe(true)
  })

  test('음수는 거부한다', () => {
    expect(productUpdateSchema.safeParse({ price: -1 }).success).toBe(false)
  })

  test('소수는 거부한다 (정수만 허용)', () => {
    expect(productUpdateSchema.safeParse({ price: 9.9 }).success).toBe(false)
  })

  test('문자열 숫자는 거부한다', () => {
    expect(productUpdateSchema.safeParse({ price: '1000' }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — status 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — status 검증', () => {
  test.each(['active', 'hidden', 'sold_out'])('"%s" 는 유효하다', (status) => {
    expect(productUpdateSchema.safeParse({ status }).success).toBe(true)
  })

  test.each(['ACTIVE', 'draft', 'deleted', ''])('"%s" 는 거부한다', (status) => {
    expect(productUpdateSchema.safeParse({ status }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — product_code 검증
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — product_code 검증', () => {
  test('영문 대소문자, 숫자, 하이픈 조합은 유효하다', () => {
    expect(productUpdateSchema.safeParse({ product_code: 'ABC-123' }).success).toBe(true)
    expect(productUpdateSchema.safeParse({ product_code: 'abc123' }).success).toBe(true)
  })

  test('공백이 포함되면 거부한다', () => {
    expect(productUpdateSchema.safeParse({ product_code: 'AB CD' }).success).toBe(false)
  })

  test('특수문자(밑줄 등)가 포함되면 거부한다', () => {
    expect(productUpdateSchema.safeParse({ product_code: 'AB_CD' }).success).toBe(false)
    expect(productUpdateSchema.safeParse({ product_code: 'AB@CD' }).success).toBe(false)
  })

  test('빈 문자열은 거부한다', () => {
    expect(productUpdateSchema.safeParse({ product_code: '' }).success).toBe(false)
  })

  test('50자 초과는 거부한다', () => {
    expect(productUpdateSchema.safeParse({ product_code: 'A'.repeat(51) }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// productUpdateSchema — 파싱 결과 타입 확인
// ─────────────────────────────────────────────────────────────────────────────

describe('productUpdateSchema — 파싱 결과', () => {
  test('safeParse 성공 시 data 에 입력값이 그대로 담긴다', () => {
    const input = { name: '테스트', price: 1000, status: 'active' as const }
    const result = productUpdateSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(input)
    }
  })

  test('safeParse 실패 시 error.flatten().fieldErrors 에 필드별 오류가 담긴다', () => {
    const result = productUpdateSchema.safeParse({ name: '', price: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.name).toBeDefined()
      expect(errors.price).toBeDefined()
    }
  })
})
