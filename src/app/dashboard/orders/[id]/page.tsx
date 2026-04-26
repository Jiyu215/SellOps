import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getOrderDetail } from '@/dal/orders'
import { getDashboardUser, getCurrentMemoActor } from '@/lib/dashboard/currentUser'
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { OrderDetailContent } from './OrderDetailContent'
import { OrderDetailSkeleton } from './OrderDetailSkeleton'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Produce page metadata for the order detail page.
 *
 * @param params - A promise resolving to route params containing `id`
 * @returns The page metadata object with `title`: `주문 {orderNumber} | SellOps` when the order exists, otherwise `주문 상세`
 */
export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await getOrderDetail(getSupabaseAdmin(), id)

  return {
    title: order ? `주문 ${order.orderNumber} | SellOps` : '주문 상세',
  }
}

/**
 * Render the order detail page for a given order ID.
 *
 * Loads the order details and required dashboard data (current user, memo actor, and initial notifications).
 * If the order does not exist, triggers Next.js not-found handling.
 *
 * @param params - A promise resolving to an object containing the `id` of the order
 * @returns The React element for the order detail dashboard page
 */
export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const [order, currentUser, currentMemoActor, notifications] = await Promise.all([
    getOrderDetail(getSupabaseAdmin(), id),
    getDashboardUser(),
    getCurrentMemoActor(),
    getInitialNotifications(),
  ])

  if (!order) notFound()

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle={`주문 상세 · ${order.orderNumber}`}
      notifications={notifications}
    >
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailContent
          initialOrderDetail={order}
          currentMemoActor={currentMemoActor}
        />
      </Suspense>
    </DashboardLayout>
  )
}
