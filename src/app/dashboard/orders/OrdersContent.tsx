'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { OrderTable } from '@/components/dashboard/orders';
import { fetchOrderList } from '@/features/orders/api/order.api';
import { useOrderFilter } from '@/hooks/useOrderFilter';
import type { Order } from '@/types/dashboard';
import type { OrderListQuery } from '@/features/orders/types/order.type';

interface OrdersContentProps {
  initialOrders: Order[];
}

/**
 * 주문 관리 페이지 콘텐츠 (Client Component)
 *
 * useSearchParams(useOrderFilter 내부)를 사용하므로 Suspense 바운더리 필요.
 * 실제 서비스에서는 서버 액션 또는 React Query로 데이터를 패칭한다.
 */
export const OrdersContent = ({ initialOrders }: OrdersContentProps) => {
  const { filter } = useOrderFilter();
  const [orders, setOrders] = useState<Order[]>(() => initialOrders);
  const [errorMsg, setErrorMsg] = useState('');

  const query = useMemo<OrderListQuery>(() => ({
    search:         filter.search,
    orderStatus:    filter.orderStatus === 'all' ? '' : filter.orderStatus,
    paymentStatus:  filter.paymentStatus === 'all' ? '' : filter.paymentStatus,
    shippingStatus: filter.shippingStatus === 'all' ? '' : filter.shippingStatus,
    paymentMethod:  filter.paymentMethod === 'all' ? '' : filter.paymentMethod,
    page:           1,
    limit:          100,
  }), [
    filter.search,
    filter.orderStatus,
    filter.paymentStatus,
    filter.shippingStatus,
    filter.paymentMethod,
  ]);
  const queryKey = JSON.stringify(query);
  const lastLoadedQueryKeyRef = useRef(queryKey);

  useEffect(() => {
    if (lastLoadedQueryKeyRef.current === queryKey) return;
    lastLoadedQueryKeyRef.current = queryKey;

    let ignore = false;

    async function fetchFilteredOrders() {
      try {
        const data = await fetchOrderList(query);
        if (ignore) return;
        setErrorMsg('');
        setOrders(data.items);
      } catch {
        if (ignore) return;
        setErrorMsg('주문 목록 조회에 실패했습니다.');
      }
    }

    void fetchFilteredOrders();

    return () => {
      ignore = true;
    };
  }, [query, queryKey]);

  const handleOrderUpdate = useCallback(
    (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...partial } : o)),
      );
    },
    [],
  );

  return (
    <>
      {errorMsg && (
        <p className="mb-sm text-caption text-light-error dark:text-dark-error">
          {errorMsg}
        </p>
      )}
      <OrderTable
        orders={orders}
        variant="orders"
        onOrderUpdate={handleOrderUpdate}
      />
    </>
  );
};
