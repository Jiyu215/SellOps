import { MOCK_ORDER_DETAIL_MAP } from '@/constants/orderDetailMockData';
import type { OrderDetail } from '@/types/orderDetail';

/**
 * 주문 상세 조회
 *
 * 실제 서비스에서는 `GET /orders/:id` API를 호출한다.
 * 현재는 mock 데이터를 반환한다.
 */
export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  return MOCK_ORDER_DETAIL_MAP.get(id) ?? null;
}
