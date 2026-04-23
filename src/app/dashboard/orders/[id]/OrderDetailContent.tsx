'use client';

import { useCallback, useState } from 'react'
import { OrderDetailView } from '@/components/dashboard/orders/OrderDetailView'
import { fetchOrderDetail, updateOrderStatus } from '@/features/orders/api/order.api'
import type { OrderDetail } from '@/types/orderDetail'
import type { Order } from '@/types/dashboard'

interface OrderDetailContentProps {
  initialOrderDetail: OrderDetail
}

export const OrderDetailContent = ({ initialOrderDetail }: OrderDetailContentProps) => {
  const [order, setOrder] = useState<OrderDetail>(initialOrderDetail)
  const [errorMsg, setErrorMsg] = useState('')

  const handleOrderUpdate = useCallback(
    async (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      try {
        await updateOrderStatus(id, partial)
        const updatedOrder = await fetchOrderDetail(id)
        setErrorMsg('')
        setOrder(updatedOrder)
      } catch {
        setErrorMsg('주문 상태 변경에 실패했습니다.')
      }
    },
    [],
  )

  return (
    <>
      {errorMsg && (
        <p className="mb-sm text-caption text-light-error dark:text-dark-error">
          {errorMsg}
        </p>
      )}
      <OrderDetailView order={order} onOrderUpdate={handleOrderUpdate} />
    </>
  )
}
