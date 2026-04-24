import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrders } from '@/dal/orders'
import { requireAuth } from '@/lib/api/requireAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { orderListQuerySchema } from '@/features/orders/schemas/order.schema'
import type { OrderListQuery, OrderListResponse } from '@/features/orders/types/order.type'
import type { Database } from '@/types/supabase'
import type { InventoryItem, KPICardData, RiskLevel } from '@/types/dashboard'
import {
  MOCK_CATEGORY_DATA,
  MOCK_DAILY_DATA,
  MOCK_SALES_DATA,
  MOCK_TOP_PRODUCTS,
} from '@/constants/mockData'

const DASHBOARD_LOW_STOCK_LIMIT = 6
const DASHBOARD_RECENT_ORDER_LIMIT = 5
const ANALYSIS_WINDOW_DAYS = 30
const LEAD_TIME_DAYS = 7
const SAFETY_STOCK_DAYS = 3

type ProductWithStockRow = {
  id: string | null
  name: string | null
  product_code: string | null
  stock_available: number | null
}

type ProductDemandRow = {
  product_id: string
  quantity: number
}

type RevenueOrderRow = {
  id: string
  total_amount: number
}

type DashboardSupabaseClient = SupabaseClient<Database>

function getKstTodayRange() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('KST date range creation failed')
  }

  const start = new Date(`${year}-${month}-${day}T00:00:00+09:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function getAnalysisWindowStart() {
  const date = new Date()
  date.setDate(date.getDate() - ANALYSIS_WINDOW_DAYS)
  return date.toISOString()
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function getDemandStats(totalDemand: number) {
  const averageDailyDemand = totalDemand / ANALYSIS_WINDOW_DAYS
  const reorderPoint = Math.ceil(averageDailyDemand * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS))
  const safetyStock = Math.ceil(averageDailyDemand * SAFETY_STOCK_DAYS)

  return {
    reorderPoint: Math.max(reorderPoint, 0),
    safetyStock: Math.max(safetyStock, 0),
  }
}

function getRiskLevel(available: number, reorderPoint: number, safetyStock: number): RiskLevel {
  if (available <= safetyStock) return 'critical'
  if (available <= reorderPoint) return 'warning'
  return 'low'
}

function getStockKpiStatus(lowStockCount: number): KPICardData['status'] {
  if (lowStockCount === 0) return 'success'
  if (lowStockCount <= DASHBOARD_LOW_STOCK_LIMIT) return 'warning'
  return 'critical'
}

function toInventoryItem(row: ProductWithStockRow, totalDemand: number): InventoryItem {
  const currentStock = row.stock_available ?? 0
  const { reorderPoint, safetyStock } = getDemandStats(totalDemand)

  return {
    id:            row.id ?? '',
    productName:   row.name ?? '이름 없는 상품',
    sku:           row.product_code ?? '-',
    category:      '',
    currentStock,
    minStock:      reorderPoint,
    incomingStock: 0,
    riskLevel:     getRiskLevel(currentStock, reorderPoint, safetyStock),
    unit:          '개',
  }
}

async function getTodayRevenueOrders(supabaseAdmin: DashboardSupabaseClient) {
  const { start, end } = getKstTodayRange()

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount')
    .eq('order_status', 'order_completed')
    .eq('payment_status', 'payment_completed')
    .neq('shipping_status', 'return_completed')
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw error

  return (data ?? []) as RevenueOrderRow[]
}

async function getDemandOrders(supabaseAdmin: DashboardSupabaseClient) {
  const demandWindowStart = getAnalysisWindowStart()

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('order_status', 'order_completed')
    .eq('payment_status', 'payment_completed')
    .neq('shipping_status', 'return_completed')
    .gte('created_at', demandWindowStart)

  if (error) throw error

  return (data ?? []) as Array<Pick<RevenueOrderRow, 'id'>>
}

async function getTodayOrderCount(supabaseAdmin: DashboardSupabaseClient) {
  const { start, end } = getKstTodayRange()
  const { count, error } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw error

  return count ?? 0
}

async function getInventoryStats(supabaseAdmin: DashboardSupabaseClient) {
  const [productResult, demandOrders] = await Promise.all([
    supabaseAdmin
      .from('products_with_stock')
      .select('id, name, product_code, stock_available')
      .order('stock_available', { ascending: true }),
    getDemandOrders(supabaseAdmin),
  ])

  const { data: productRows, error: productError } = productResult
  if (productError) throw productError

  const demandMap = new Map<string, number>()
  const demandOrderIds = demandOrders.map((order) => order.id)

  if (demandOrderIds.length > 0) {
    const { data: demandRows, error: demandError } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', demandOrderIds)

    if (demandError) throw demandError

    for (const row of (demandRows ?? []) as ProductDemandRow[]) {
      demandMap.set(row.product_id, (demandMap.get(row.product_id) ?? 0) + row.quantity)
    }
  }

  const inventoryCandidates = (productRows ?? []).map((row) => {
    const totalDemand = row.id ? (demandMap.get(row.id) ?? 0) : 0
    return toInventoryItem(row as ProductWithStockRow, totalDemand)
  })

  const lowStockItems = inventoryCandidates.filter((item) => item.currentStock <= item.minStock)
  const inventoryItems = lowStockItems.slice(0, DASHBOARD_LOW_STOCK_LIMIT)

  return {
    inventoryItems,
    lowStockCount: lowStockItems.length,
  }
}

function parseDashboardOrderQuery(request: Request):
  | { ok: true; query: OrderListQuery }
  | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url)
  const parsed = orderListQuerySchema.safeParse({
    search:         searchParams.get('search'),
    orderStatus:    searchParams.get('orderStatus'),
    paymentStatus:  null,
    shippingStatus: null,
    paymentMethod:  null,
    page:           searchParams.get('page'),
    limit:          searchParams.get('limit') ?? String(DASHBOARD_RECENT_ORDER_LIMIT),
  })

  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'invalid_dashboard_order_query', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      ),
    }
  }

  return {
    ok: true,
    query: Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as OrderListQuery,
  }
}

async function getDashboardOrders(
  supabaseAdmin: DashboardSupabaseClient,
  query: OrderListQuery,
): Promise<OrderListResponse> {
  return getOrders(supabaseAdmin, query)
}

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsedQuery = parseDashboardOrderQuery(request)
  if (!parsedQuery.ok) return parsedQuery.response

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const [todayRevenueOrders, todayOrderCount, inventoryStats, orderResult] = await Promise.all([
      getTodayRevenueOrders(supabaseAdmin),
      getTodayOrderCount(supabaseAdmin),
      getInventoryStats(supabaseAdmin),
      getDashboardOrders(supabaseAdmin, parsedQuery.query),
    ])
    const todayRevenueTotal = todayRevenueOrders.reduce((sum, order) => sum + order.total_amount, 0)

    const kpiData: KPICardData[] = [
      {
        id: 'kpi-revenue',
        title: '오늘 매출',
        value: formatNumber(todayRevenueTotal),
        unit: '원',
        status: todayRevenueTotal > 0 ? 'success' : 'info',
        description: '주문완료 및 결제완료, 환불 제외 기준 매출 합계',
      },
      {
        id: 'kpi-orders',
        title: '오늘 주문',
        value: todayOrderCount,
        unit: '건',
        status: todayOrderCount > 0 ? 'info' : 'warning',
        description: '오늘 생성된 주문 건수',
      },
      {
        id: 'kpi-stock-critical',
        title: '재고 경고',
        value: inventoryStats.lowStockCount,
        unit: '품목',
        status: getStockKpiStatus(inventoryStats.lowStockCount),
        description: '재주문점 이하 상품',
      },
    ]

    return NextResponse.json({
      kpiData,
      dailyData: MOCK_DAILY_DATA,
      salesData: MOCK_SALES_DATA,
      categoryData: MOCK_CATEGORY_DATA,
      inventoryItems: inventoryStats.inventoryItems,
      orders: orderResult.items,
      ordersPagination: {
        total: orderResult.total,
        page: orderResult.page,
        limit: orderResult.limit,
      },
      topProducts: MOCK_TOP_PRODUCTS,
    })
  } catch {
    return NextResponse.json(
      { error: '대시보드 데이터를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
