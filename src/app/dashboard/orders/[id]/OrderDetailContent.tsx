'use client';

import { useCallback, useState } from 'react'
import { OrderDetailView } from '@/components/dashboard/orders/OrderDetailView'
import { createOrderMemo, fetchOrderDetail, updateOrderStatus } from '@/features/orders/api/order.api'
import type { OrderDetail, OrderMemoActor } from '@/types/orderDetail'
import type { Order } from '@/types/dashboard'

interface OrderDetailContentProps {
  initialOrderDetail: OrderDetail
  currentMemoActor: OrderMemoActor
}

export const OrderDetailContent = ({ initialOrderDetail, currentMemoActor }: OrderDetailContentProps) => {
  const [order, setOrder] = useState<OrderDetail>(initialOrderDetail)
  const [errorMsg, setErrorMsg] = useState('')

  const refreshOrderDetail = useCallback(async (id: string) => {
    const updatedOrder = await fetchOrderDetail(id)
    setErrorMsg('')
    setOrder(updatedOrder)
  }, [])

  const handleOrderUpdate = useCallback(
    async (id: string, partial: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'shippingStatus'>>) => {
      try {
        await updateOrderStatus(id, partial)
        await refreshOrderDetail(id)
      } catch {
        setErrorMsg('주문 상태 변경에 실패했습니다.')
      }
    },
    [refreshOrderDetail],
  )

  const handleMemoCreate = useCallback(
    async (id: string, content: string) => {
      try {
        await createOrderMemo(id, content)
        await refreshOrderDetail(id)
      } catch {
        setErrorMsg('주문 메모 등록에 실패했습니다.')
      }
    },
    [refreshOrderDetail],
  )

  return (
    <>
      {errorMsg && (
        <p className="mb-sm text-caption text-light-error dark:text-dark-error">
          {errorMsg}
        </p>
      )}
      <OrderDetailView
        order={order}
        currentMemoActor={currentMemoActor}
        onOrderUpdate={handleOrderUpdate}
        onMemoCreate={handleMemoCreate}
      />
    </>
  )
}
