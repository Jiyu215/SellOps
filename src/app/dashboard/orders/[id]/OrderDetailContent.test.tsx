import { act, render, screen, waitFor } from '@testing-library/react'
import { OrderDetailContent } from './OrderDetailContent'
import type { OrderDetail, OrderMemoActor } from '@/types/orderDetail'
import { createOrderMemo, fetchOrderDetail, updateOrderStatus } from '@/features/orders/api/order.api'

let latestOrderDetailViewProps: {
  order: OrderDetail
  currentMemoActor: OrderMemoActor
  onOrderUpdate: (
    id: string,
    partial: Partial<Pick<OrderDetail, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>
  ) => void | Promise<void>
  onMemoCreate: (id: string, content: string) => void | Promise<void>
} | null = null

jest.mock('@/components/dashboard/orders/OrderDetailView', () => ({
  OrderDetailView: (props: typeof latestOrderDetailViewProps) => {
    latestOrderDetailViewProps = props
    return (
      <div>
        <div data-testid="order-status">{props?.order.shippingStatus}</div>
        <div data-testid="history-count">{props?.order.statusHistory.length}</div>
        <div data-testid="memo-count">{props?.order.memoLog.length}</div>
      </div>
    )
  },
}))

jest.mock('@/features/orders/api/order.api', () => ({
  createOrderMemo: jest.fn(),
  fetchOrderDetail: jest.fn(),
  updateOrderStatus: jest.fn(),
}))

const mockCreateOrderMemo = createOrderMemo as jest.MockedFunction<typeof createOrderMemo>
const mockFetchOrderDetail = fetchOrderDetail as jest.MockedFunction<typeof fetchOrderDetail>
const mockUpdateOrderStatus = updateOrderStatus as jest.MockedFunction<typeof updateOrderStatus>
const MOCK_MEMO_ACTOR: OrderMemoActor = {
  name: '김운영자',
  type: 'admin',
}

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
  test('상태 변경 후 상세를 다시 조회해 상태 이력을 동기화한다', async () => {
    mockUpdateOrderStatus.mockResolvedValue()
    mockFetchOrderDetail.mockResolvedValue({
      ...MOCK_ORDER_DETAIL,
      shippingStatus: 'shipping_in_progress',
      statusHistory: [
        {
          timestamp: '2026-04-23T01:00:00.000Z',
          label: '배송 상태: 배송준비 → 배송중',
          actor: 'admin@sellops.com',
        },
      ],
    })

    render(<OrderDetailContent initialOrderDetail={MOCK_ORDER_DETAIL} currentMemoActor={MOCK_MEMO_ACTOR} />)

    expect(screen.getByTestId('order-status')).toHaveTextContent('shipping_ready')
    expect(screen.getByTestId('history-count')).toHaveTextContent('0')

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

    expect(mockFetchOrderDetail).toHaveBeenCalledWith('order-001')
    expect(screen.getByTestId('order-status')).toHaveTextContent('shipping_in_progress')
    expect(screen.getByTestId('history-count')).toHaveTextContent('1')
  })

  test('메모 등록 후 상세를 다시 조회해 메모 로그를 동기화한다', async () => {
    mockCreateOrderMemo.mockResolvedValue()
    mockFetchOrderDetail.mockResolvedValue({
      ...MOCK_ORDER_DETAIL,
      memoLog: [
        {
          id: 'memo-001',
          timestamp: '2026-04-23T02:00:00.000Z',
          author: 'admin@sellops.com',
          authorType: 'admin',
          content: '고객 요청 메모',
        },
      ],
    })

    render(<OrderDetailContent initialOrderDetail={MOCK_ORDER_DETAIL} currentMemoActor={MOCK_MEMO_ACTOR} />)

    expect(screen.getByTestId('memo-count')).toHaveTextContent('0')

    await act(async () => {
      await latestOrderDetailViewProps?.onMemoCreate('order-001', '고객 요청 메모')
    })

    await waitFor(() => {
      expect(mockCreateOrderMemo).toHaveBeenCalledWith('order-001', '고객 요청 메모')
    })

    expect(mockFetchOrderDetail).toHaveBeenCalledWith('order-001')
    expect(screen.getByTestId('memo-count')).toHaveTextContent('1')
  })

  test('API 실패 시 에러 메시지를 보여주고 상태를 유지한다', async () => {
    mockUpdateOrderStatus.mockRejectedValue(new Error('db error'))

    render(<OrderDetailContent initialOrderDetail={MOCK_ORDER_DETAIL} currentMemoActor={MOCK_MEMO_ACTOR} />)

    await act(async () => {
      await latestOrderDetailViewProps?.onOrderUpdate('order-001', {
        shippingStatus: 'shipping_in_progress',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('주문 상태 변경에 실패했습니다.')).toBeInTheDocument()
    })

    expect(mockFetchOrderDetail).not.toHaveBeenCalled()
    expect(screen.getByTestId('order-status')).toHaveTextContent('shipping_ready')
  })
})
