import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

import { getOrders } from '@/dal/orders';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { OrdersContent } from './OrdersContent';
import { OrdersPageSkeleton } from './OrdersPageSkeleton';
import type {
  OrderListQuery,
  OrderStatusType,
  PaymentMethod,
  OrderPageLimit,
  PaymentStatusType,
  ShippingStatusType,
} from '@/features/orders/types/order.type';

const ORDER_SERVER_PAGE_SIZE: OrderPageLimit = 20;

type OrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const [currentUser, notifications] = await Promise.all([
    getDashboardUser(),
    getInitialNotifications(),
  ]);
  const params = await searchParams ?? {};
  const query: OrderListQuery = {
    search:         getParam(params, 'order_search') ?? '',
    orderStatus:    (getParam(params, 'order_status') ?? '') as OrderStatusType | '',
    paymentStatus:  (getParam(params, 'payment_status') ?? '') as PaymentStatusType | '',
    shippingStatus: (getParam(params, 'shipping_status') ?? '') as ShippingStatusType | '',
    paymentMethod:  (getParam(params, 'order_payment') ?? '') as PaymentMethod | '',
    page:           parsePage(getParam(params, 'order_page')),
    limit:          ORDER_SERVER_PAGE_SIZE,
  };
  const initialOrderList = await getOrders(getSupabaseAdmin(), query);

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle="주문 관리"
      notifications={notifications}
    >
      <Suspense fallback={<OrdersPageSkeleton />}>
        <OrdersContent
          initialOrders={initialOrderList.items}
          initialTotal={initialOrderList.total}
          initialPage={initialOrderList.page}
          initialLimit={initialOrderList.limit}
        />
      </Suspense>
    </DashboardLayout>
  );
}
