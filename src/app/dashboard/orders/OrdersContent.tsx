'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { OrderTable } from '@/components/dashboard/orders';
import { fetchOrderList, updateOrderStatus } from '@/features/orders/api/order.api';
import { useOrderFilter } from '@/hooks/useOrderFilter';
import type { Order } from '@/types/dashboard';
import type { OrderListQuery, OrderPageLimit } from '@/features/orders/types/order.type';

interface OrdersContentProps {
  initialOrders: Order[];
  initialTotal: number;
  initialPage: number;
  initialLimit: OrderPageLimit;
}

/**
 * 주문 관리 페이지 콘텐츠(Client Component)
 *
 * useSearchParams(useOrderFilter 내부)를 사용하므로 Suspense 바운더리 필요.
 * 실제 서비스에서는 서버 액션 또는 React Query로 데이터를 수집한다.
 */
export const OrdersContent = ({
  initialOrders,
  initialTotal,
  initialPage,
  initialLimit,
}: OrdersContentProps) => {
  const { filter, currentPage, setCurrentPage } = useOrderFilter();
  const [orders, setOrders] = useState<Order[]>(() => initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [errorMsg, setErrorMsg] = useState('');

  const query = useMemo<OrderListQuery>(() => ({
    search: filter.search,
    orderStatus: filter.orderStatus === 'all' ? '' : filter.orderStatus,
    paymentStatus: filter.paymentStatus === 'all' ? '' : filter.paymentStatus,
    shippingStatus: filter.shippingStatus === 'all' ? '' : filter.shippingStatus,
    paymentMethod: filter.paymentMethod === 'all' ? '' : filter.paymentMethod,
    page: currentPage,
    limit,
  }), [
    filter.search,
    filter.orderStatus,
    filter.paymentStatus,
    filter.shippingStatus,
    filter.paymentMethod,
    currentPage,
    limit,
  ]);
  const queryKey = JSON.stringify(query);
  const lastLoadedQueryKeyRef = useRef(queryKey);

  useEffect(() => {
    if (lastLoadedQueryKeyRef.current === queryKey) return;
    lastLoadedQueryKeyRef.current = queryKey;

    let ignore = false;

    /**
     * Fetches the order list for the current query and updates component state with the response or records an error.
     *
     * On success, updates `orders`, `total`, `page`, and `limit`, and clears any existing error message.
     * On failure, sets `errorMsg` to `'주문 목록 조회에 실패했습니다.'`.
     * If the request is marked as ignored (stale), no state updates or error changes are made.
     */
    async function fetchFilteredOrders() {
      try {
        const data = await fetchOrderList(query);
        if (ignore) return;
        setErrorMsg('');
        setOrders(data.items);
        setTotal(data.total);
        setPage(data.page);
        setLimit(data.limit);
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
    async (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      try {
        await updateOrderStatus(id, partial);
        setErrorMsg('');
      } catch (error) {
        setErrorMsg(
          error instanceof Error && error.message
            ? error.message
            : '주문 상태 변경에 실패했습니다.',
        );
        return;
      }

      setOrders((prev) =>
        prev.map((order) => (order.id === id ? { ...order, ...partial } : order)),
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
        pagination={{
          total,
          page,
          limit,
          onPageChange: setCurrentPage,
        }}
      />
    </>
  );
};
