import { act, render, screen, waitFor } from '@testing-library/react';
import { OrdersContent } from './OrdersContent';
import { fetchOrderList, updateOrderStatus } from '@/features/orders/api/order.api';

let latestOrderTableProps: {
  orders: Array<{ id: string }>;
  variant: string;
  onOrderUpdate: (
    id: string,
    partial: Partial<{ orderStatus: string; paymentStatus: string; shippingStatus: string }>
  ) => void | Promise<void>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
} | null = null;

jest.mock('@/components/dashboard/orders', () => ({
  OrderTable: (props: typeof latestOrderTableProps) => {
    latestOrderTableProps = props;
    return <div data-testid="order-count">{props?.orders.length ?? 0}</div>;
  },
}));

jest.mock('@/features/orders/api/order.api', () => ({
  fetchOrderList: jest.fn(),
  updateOrderStatus: jest.fn(),
}));

jest.mock('@/hooks/useOrderFilter', () => ({
  useOrderFilter: () => ({
    filter: {
      search: '',
      orderStatus: 'all',
      paymentStatus: 'all',
      shippingStatus: 'all',
      paymentMethod: 'all',
    },
    currentPage: 1,
    setCurrentPage: jest.fn(),
  }),
}));

const mockFetchOrderList = fetchOrderList as jest.MockedFunction<typeof fetchOrderList>;
const mockUpdateOrderStatus = updateOrderStatus as jest.MockedFunction<typeof updateOrderStatus>;

const MOCK_ORDERS = [
  {
    id: 'order-001',
    orderNumber: 'SO-2026-000001',
    customer: { name: '테스트 고객', email: '', phone: '' },
    products: [],
    totalAmount: 20000,
    paymentMethod: 'card',
    orderStatus: 'order_confirmed',
    paymentStatus: 'payment_completed',
    shippingStatus: 'shipping_ready',
    createdAt: '2026-04-24T00:00:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  latestOrderTableProps = null;
  mockFetchOrderList.mockResolvedValue({
    items: MOCK_ORDERS,
    total: 1,
    page: 1,
    limit: 20,
  });
});

describe('OrdersContent', () => {
  test('상태 변경 실패 시 서버 오류 메시지를 그대로 보여준다', async () => {
    mockUpdateOrderStatus.mockRejectedValue(new Error('가용 재고보다 많은 수량입니다. (가용: 0개)'));

    render(
      <OrdersContent
        initialOrders={MOCK_ORDERS}
        initialTotal={1}
        initialPage={1}
        initialLimit={20}
      />,
    );

    await act(async () => {
      await latestOrderTableProps?.onOrderUpdate('order-001', {
        shippingStatus: 'shipping_in_progress',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('가용 재고보다 많은 수량입니다. (가용: 0개)')).toBeInTheDocument();
    });
  });
});
