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
