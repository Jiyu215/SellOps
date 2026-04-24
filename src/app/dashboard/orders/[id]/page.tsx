import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { MOCK_NOTIFICATIONS } from '@/constants/mockData'
import { getOrderDetail } from '@/dal/orders'
import { getDashboardUser, getCurrentMemoActor } from '@/lib/dashboard/currentUser'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { OrderDetailContent } from './OrderDetailContent'
import { OrderDetailSkeleton } from './OrderDetailSkeleton'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await getOrderDetail(getSupabaseAdmin(), id)

  return {
    title: order ? `주문 ${order.orderNumber} | SellOps` : '주문 상세',
  }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await getOrderDetail(getSupabaseAdmin(), id)
  const currentUser = await getDashboardUser()
  const currentMemoActor = await getCurrentMemoActor()

  if (!order) notFound()

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle={`주문 상세 · ${order.orderNumber}`}
      notifications={MOCK_NOTIFICATIONS}
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
