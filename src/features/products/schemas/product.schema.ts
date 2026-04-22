import { z } from 'zod'

export const productStatusSchema = z.enum(['active', 'hidden', 'sold_out'])

/**
 * PATCH /api/products/[id] 요청 바디 스키마.
 *
 * 허용된 필드만 화이트리스트로 관리하며, 모든 필드는 선택적(partial)이다.
 * unknown 필드는 .strict() 로 차단한다.
 */
export const productUpdateSchema = z
  .object({
    name:              z.string().min(1).max(100),
    price:             z.number().int().nonnegative(),
    product_code:      z.string().min(1).max(50).regex(/^[A-Za-z0-9-]+$/, {
                         message: '상품코드는 영문, 숫자, 하이픈만 허용됩니다.',
                       }),
    summary:           z.string().max(200),
    short_description: z.string().max(500),
    description:       z.string(),
    status:            productStatusSchema,
  })
  .partial()
  .strict()

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
