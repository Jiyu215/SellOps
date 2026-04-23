import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { MOCK_NOTIFICATIONS, MOCK_USER } from '@/constants/mockData'
import { getOrderDetail } from '@/dal/orders'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { OrderDetailContent } from './OrderDetailContent'
import { OrderDetailSkeleton } from './OrderDetailSkeleton'
import type { OrderMemoActor } from '@/types/orderDetail'

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

async function getCurrentMemoActor(): Promise<OrderMemoActor> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { name: '운영자', type: 'admin' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle<{ name: string | null }>()

  return {
    name: profile?.name ?? user.user_metadata?.name ?? user.email ?? '운영자',
    type: 'admin',
  }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await getOrderDetail(getSupabaseAdmin(), id)
  const currentMemoActor = await getCurrentMemoActor()

  if (!order) notFound()

  return (
    <DashboardLayout
      currentUser={MOCK_USER}
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
