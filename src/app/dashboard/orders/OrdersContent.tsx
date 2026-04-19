'use client';

import { useState, useCallback } from 'react';
import { OrderTable } from '@/components/dashboard/orders';
import { MOCK_ORDERS_PAGE } from '@/constants/ordersMockData';
import type { Order } from '@/types/dashboard';

/**
 * 주문 관리 페이지 콘텐츠 (Client Component)
 *
 * useSearchParams(useOrderFilter 내부)를 사용하므로 Suspense 바운더리 필요.
 * 실제 서비스에서는 서버 액션 또는 React Query로 데이터를 패칭한다.
 */
export const OrdersContent = () => {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS_PAGE);

  const handleOrderUpdate = useCallback(
    (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...partial } : o)),
      );
    },
    [],
  );

  return (
    <OrderTable
      orders={orders}
      variant="orders"
      onOrderUpdate={handleOrderUpdate}
    />
  );
};
