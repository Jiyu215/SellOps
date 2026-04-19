'use client';

import { useState, useCallback } from 'react';
import { OrderDetailView } from '@/components/dashboard/orders/OrderDetailView';
import type { OrderDetail } from '@/types/orderDetail';
import type { Order } from '@/types/dashboard';

interface OrderDetailContentProps {
  initialOrder: OrderDetail;
}

/**
 * 주문 상세 콘텐츠 (Client Component)
 *
 * 상태 변경(OrderActionCell → onOrderUpdate)을 처리하고
 * OrderDetailView에 최신 order를 전달한다.
 */
export const OrderDetailContent = ({ initialOrder }: OrderDetailContentProps) => {
  const [order, setOrder] = useState<OrderDetail>(initialOrder);

  const handleOrderUpdate = useCallback(
    (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      setOrder((prev) => (prev.id === id ? { ...prev, ...partial } : prev));
    },
    [],
  );

  return <OrderDetailView order={order} onOrderUpdate={handleOrderUpdate} />;
};
