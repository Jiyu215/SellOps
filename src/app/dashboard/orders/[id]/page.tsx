import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { getOrderDetail } from '@/services/orderDetailService';
import { OrderDetailContent } from './OrderDetailContent';
import { OrderDetailSkeleton } from './OrderDetailSkeleton';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 주문 상세 페이지 (Server Component)
 *
 * - params는 Next.js 16 비동기 타입으로 await 처리.
 * - 존재하지 않는 주문 ID → notFound() 호출.
 */

export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  return { title: order ? `주문 ${order.orderNumber} | SellOps` : '주문 상세' };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) notFound();

  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle={`주문 상세 — ${order.orderNumber}`}
      notifications={MOCK_NOTIFICATIONS}
    >
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailContent initialOrder={order} />
      </Suspense>
    </DashboardLayout>
  );
}
