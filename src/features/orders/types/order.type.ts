// 주문 도메인 타입

export type OrderStatusType =
  | 'order_waiting'
  | 'order_confirmed'
  | 'order_cancelled'
  | 'order_completed'

export type PaymentStatusType =
  | 'payment_pending'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'refund_in_progress'
  | 'refund_completed'

export type ShippingStatusType =
  | 'shipping_ready'
  | 'shipping_in_progress'
  | 'shipping_completed'
  | 'shipping_on_hold'
  | 'return_completed'

export type PaymentMethod = 'card' | 'bank_transfer' | 'kakao_pay' | 'naver_pay'

export type OrderStockStatus = 'none' | 'applied' | 'released'

export type OrderPageLimit = 5 | 10 | 20 | 50 | 100

export interface OrderCustomer {
  name: string
  email: string
  phone: string
  tier?: string
}

export interface OrderProduct {
  name: string
  sku: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  orderNumber: string
  customer: OrderCustomer
  products: OrderProduct[]
  totalAmount: number
  paymentMethod: PaymentMethod
  orderStatus: OrderStatusType
  paymentStatus: PaymentStatusType
  shippingStatus: ShippingStatusType
  createdAt: string
  shippingAddress?: string
}

export interface OrderFilter {
  search: string
  orderStatus: OrderStatusType | 'all'
  paymentStatus: PaymentStatusType | 'all'
  shippingStatus: ShippingStatusType | 'all'
  paymentMethod: PaymentMethod | 'all'
  dateRange?: { from: string; to: string }
}

export interface OrderListQuery {
  search?: string
  orderStatus?: OrderStatusType | ''
  paymentStatus?: PaymentStatusType | ''
  shippingStatus?: ShippingStatusType | ''
  paymentMethod?: PaymentMethod | ''
  page?: number
  limit?: OrderPageLimit
}

export interface OrderListResponse {
  items: Order[]
  total: number
  page: number
  limit: OrderPageLimit
}

export interface OrderRow {
  id: string
  order_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  total_amount: number
  status: string
  memo: string | null
  created_at: string | null
  updated_at: string | null
  order_status: OrderStatusType
  payment_status: PaymentStatusType
  shipping_status: ShippingStatusType
  payment_method: PaymentMethod | null
  shipping_address: string | null
  stock_status: OrderStockStatus
}

export interface OrderItemRow {
  order_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  product_code: string | null
  created_at: string | null
}

export interface OrderStatusHistoryRow {
  id: string
  order_id: string
  status_type: 'order_status' | 'payment_status' | 'shipping_status'
  from_status: string | null
  to_status: string
  reason: string | null
  actor_type: 'admin' | 'system' | 'customer'
  actor_name: string | null
  created_at: string
}

export interface OrderMemoRow {
  id: string
  order_id: string
  author_type: 'admin' | 'cs' | 'customer'
  author_name: string | null
  content: string
  created_at: string
}
