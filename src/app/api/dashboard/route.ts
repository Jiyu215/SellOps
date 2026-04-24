import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'
import {
  MOCK_KPI_DATA,
  MOCK_DAILY_DATA,
  MOCK_SALES_DATA,
  MOCK_CATEGORY_DATA,
  MOCK_INVENTORY_ITEMS,
  MOCK_ORDERS,
  MOCK_TOP_PRODUCTS,
} from '@/constants/mockData'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    return NextResponse.json({
      kpiData:        MOCK_KPI_DATA,
      dailyData:      MOCK_DAILY_DATA,
      salesData:      MOCK_SALES_DATA,
      categoryData:   MOCK_CATEGORY_DATA,
      inventoryItems: MOCK_INVENTORY_ITEMS,
      orders:         MOCK_ORDERS,
      topProducts:    MOCK_TOP_PRODUCTS,
    })
  } catch {
    return NextResponse.json(
      { error: '대시보드 데이터 조회에 실패했습니다.' },
      { status: 500 },
    )
  }
}
