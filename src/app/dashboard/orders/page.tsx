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

/**
 * Normalize a possibly-array query parameter by returning a single string value.
 *
 * @param params - A record of query parameters where values may be strings, string arrays, or undefined.
 * @param key - The parameter key to read from `params`.
 * @returns The first element if the parameter value is an array, the value itself if it is a string, or `undefined` if absent.
 */
function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parse a page query value into a valid page number.
 *
 * @param value - The raw page value (e.g., from query parameters); may be `undefined`.
 * @returns A finite number greater than or equal to 1 parsed from `value`; returns `1` if `value` is missing or not a finite number.
 */
function parsePage(value: string | undefined) {
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/**
 * Renders the orders dashboard page populated with server-fetched initial data.
 *
 * Builds an initial orders query from optional URL search parameters, fetches the current
 * dashboard user, notifications, and the initial paginated orders list on the server,
 * and returns the dashboard layout containing the orders content initialized with those values.
 *
 * @param searchParams - Optional URL query parameters (may be a Promise) used to construct the initial orders query. Recognized keys include `order_search`, `order_status`, `payment_status`, `shipping_status`, `order_payment`, and `order_page`.
 * @returns The dashboard layout React element containing the orders content initialized with server-fetched user, notifications, and orders data.
 */
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
