import { act, render, screen, waitFor } from '@testing-library/react'
import { OrderDetailContent } from './OrderDetailContent'
import type { OrderDetail } from '@/types/orderDetail'
import { updateOrderStatus } from '@/features/orders/api/order.api'

let latestOrderDetailViewProps: {
  order: OrderDetail
  onOrderUpdate: (
    id: string,
    partial: Partial<Pick<OrderDetail, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>
  ) => void | Promise<void>
} | null = null

jest.mock('@/components/dashboard/orders/OrderDetailView', () => ({
  OrderDetailView: (props: typeof latestOrderDetailViewProps) => {
    latestOrderDetailViewProps = props
    return <div data-testid="order-status">{props?.order.shippingStatus}</div>
  },
}))

jest.mock('@/features/orders/api/order.api', () => ({
  updateOrderStatus: jest.fn(),
}))

const mockUpdateOrderStatus = updateOrderStatus as jest.MockedFunction<typeof updateOrderStatus>

const MOCK_ORDER_DETAIL: OrderDetail = {
  id: 'order-001',
  orderNumber: 'SO-2026-000001',
  customer: {
    name: '테스트 고객',
    email: 'customer@example.com',
    phone: '010-1111-2222',
  },
  products: [
    {
      name: '테스트 상품',
      sku: 'PRD-001',
      quantity: 1,
      unitPrice: 20000,
    },
  ],
  totalAmount: 20000,
  paymentMethod: 'card',
  orderStatus: 'order_confirmed',
  paymentStatus: 'payment_completed',
  shippingStatus: 'shipping_ready',
  createdAt: '2026-04-23T00:00:00.000Z',
  shippingFee: 0,
  memoLog: [],
  statusHistory: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  latestOrderDetailViewProps = null
})

describe('OrderDetailContent', () => {
  test('상태 변경 시 API를 호출하고 화면 상태를 갱신한다', async () => {
    mockUpdateOrderStatus.mockResolvedValue()

    render(<OrderDetailContent initialOrderDetail={MOCK_ORDER_DETAIL} />)

    expect(screen.getByTestId('order-status')).toHaveTextContent('shipping_ready')

    await act(async () => {
      await latestOrderDetailViewProps?.onOrderUpdate('order-001', {
        shippingStatus: 'shipping_in_progress',
      })
    })

    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-001', {
        shippingStatus: 'shipping_in_progress',
      })
    })

    expect(screen.getByTestId('order-status')).toHaveTextContent('shipping_in_progress')
  })

  test('API 실패 시 에러 메시지를 보여주고 상태는 유지한다', async () => {
    mockUpdateOrderStatus.mockRejectedValue(new Error('db error'))

    render(<OrderDetailContent initialOrderDetail={MOCK_ORDER_DETAIL} />)

    await act(async () => {
      await latestOrderDetailViewProps?.onOrderUpdate('order-001', {
        shippingStatus: 'shipping_in_progress',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('주문 상태 변경에 실패했습니다.')).toBeInTheDocument()
    })

    expect(screen.getByTestId('order-status')).toHaveTextContent('shipping_ready')
  })
})
