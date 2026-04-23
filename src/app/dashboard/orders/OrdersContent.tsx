'use client';

import { useState, useCallback, useEffect } from 'react';
import { OrderTable } from '@/components/dashboard/orders';
import { fetchOrderList } from '@/features/orders/api/order.api';
import type { Order } from '@/types/dashboard';

/**
 * 주문 관리 페이지 콘텐츠 (Client Component)
 *
 * useSearchParams(useOrderFilter 내부)를 사용하므로 Suspense 바운더리 필요.
 * 실제 서비스에서는 서버 액션 또는 React Query로 데이터를 패칭한다.
 */
export const OrdersContent = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const data = await fetchOrderList();
      setOrders(data.items);
    } catch {
      setErrorMsg('주문 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleOrderUpdate = useCallback(
    (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...partial } : o)),
      );
    },
    [],
  );

  if (loading) {
    return (
      <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
        <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary">
          주문 목록을 불러오는 중입니다.
        </p>
      </section>
    );
  }

  if (errorMsg) {
    return (
      <section className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md">
        <p className="text-bodySm text-light-error dark:text-dark-error">
          {errorMsg}
        </p>
      </section>
    );
  }

  return (
    <OrderTable
      orders={orders}
      variant="orders"
      onOrderUpdate={handleOrderUpdate}
    />
  );
};
