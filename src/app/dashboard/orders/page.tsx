import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { OrdersContent } from './OrdersContent';
import { OrdersPageSkeleton } from './OrdersPageSkeleton';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getOrders } from '@/dal/orders';
import type {
  OrderListQuery,
  OrderStatusType,
  PaymentMethod,
  PaymentStatusType,
  ShippingStatusType,
} from '@/features/orders/types/order.type';

type OrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 주문 관리 페이지 (Server Component)
 *
 * - DashboardLayout: 사이드바 + 헤더 공통 레이아웃
 * - OrdersContent: 클라이언트 컴포넌트 (useSearchParams → Suspense 필요)
 */
export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams ?? {};
  const query: OrderListQuery = {
    search:         getParam(params, 'order_search') ?? '',
    orderStatus:    (getParam(params, 'order_status') ?? '') as OrderStatusType | '',
    paymentStatus:  (getParam(params, 'payment_status') ?? '') as PaymentStatusType | '',
    shippingStatus: (getParam(params, 'shipping_status') ?? '') as ShippingStatusType | '',
    paymentMethod:  (getParam(params, 'order_payment') ?? '') as PaymentMethod | '',
    page:           1,
    limit:          100,
  };
  const { items: initialOrders } = await getOrders(getSupabaseAdmin(), query);

  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="주문 관리"
      notifications={MOCK_NOTIFICATIONS}
    >
      <Suspense fallback={<OrdersPageSkeleton />}>
        <OrdersContent initialOrders={initialOrders} />
      </Suspense>
    </DashboardLayout>
  );
}
