import { z } from 'zod'

export const orderStatusSchema = z.enum([
  'order_waiting',
  'order_confirmed',
  'order_cancelled',
  'order_completed',
])

export const paymentStatusSchema = z.enum([
  'payment_pending',
  'payment_completed',
  'payment_failed',
  'payment_cancelled',
  'refund_in_progress',
  'refund_completed',
])

export const shippingStatusSchema = z.enum([
  'shipping_ready',
  'shipping_in_progress',
  'shipping_completed',
  'shipping_on_hold',
  'return_completed',
])

export const paymentMethodSchema = z.enum([
  'card',
  'bank_transfer',
  'kakao_pay',
  'naver_pay',
])

export const orderPageLimitSchema = z.union([
  z.literal(10),
  z.literal(20),
  z.literal(50),
  z.literal(100),
])

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}

const optionalQueryEnum = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional())

const positiveIntegerQuery = (defaultValue: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(defaultValue),
  )

const pageLimitQuery = z.preprocess(
  emptyToUndefined,
  z.coerce.number().pipe(orderPageLimitSchema).default(20),
)

export const orderListQuerySchema = z.object({
  search: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().max(100),
  ),
  orderStatus:    optionalQueryEnum(orderStatusSchema),
  paymentStatus:  optionalQueryEnum(paymentStatusSchema),
  shippingStatus: optionalQueryEnum(shippingStatusSchema),
  paymentMethod:  optionalQueryEnum(paymentMethodSchema),
  page:           positiveIntegerQuery(1),
  limit:          pageLimitQuery,
})

/**
 * PATCH /api/orders/[id]/status 요청 바디 스키마
 *
 * 주문/결제/배송 상태만 수정할 수 있게 허용 필드를 제한한다.
 * unknown 필드는 .strict()로 차단한다.
 */
export const orderStatusUpdateSchema = z
  .object({
    order_status:    orderStatusSchema,
    payment_status:  paymentStatusSchema,
    shipping_status: shippingStatusSchema,
  })
  .partial()
  .strict()

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>
export type OrderListQueryInput = z.infer<typeof orderListQuerySchema>
