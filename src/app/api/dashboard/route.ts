import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrders } from '@/dal/orders';
import { requireAuth } from '@/lib/api/requireAuth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { orderListQuerySchema } from '@/features/orders/schemas/order.schema';
import type { OrderListQuery, OrderListResponse } from '@/features/orders/types/order.type';
import type { Database } from '@/types/supabase';
import type {
  CategoryDataPoint,
  DailyDataPoint,
  InventoryItem,
  KPICardData,
  RiskLevel,
  SalesDataPoint,
  TopProductItem,
  TopProductPeriod,
} from '@/types/dashboard';

const DASHBOARD_LOW_STOCK_LIMIT = 6;
const DASHBOARD_RECENT_ORDER_LIMIT = 5;
const ANALYSIS_WINDOW_DAYS = 30;
const LEAD_TIME_DAYS = 7;
const SAFETY_STOCK_DAYS = 3;
const CATEGORY_CHART_COLORS = ['#5D5FEF', '#28A745', '#FFC107', '#17A2B8', '#DC3545', '#6C757D'];

type ProductWithStockRow = {
  id: string | null;
  name: string | null;
  product_code: string | null;
  stock_available: number | null;
};

type ProductDemandRow = {
  product_id: string;
  quantity: number;
};

type RevenueOrderRow = {
  id: string;
  total_amount: number;
};

type DailySalesOrderRow = {
  id: string;
  total_amount: number;
  created_at: string | null;
};

type MonthlySalesOrderRow = {
  id: string;
  total_amount: number;
  created_at: string | null;
};

type CompletedOrderRow = {
  id: string;
  created_at: string | null;
};

type OrderItemSalesRow = {
  order_id: string;
  product_id: string;
  product_name: string;
  product_code: string | null;
  price: number;
  quantity: number;
};

type ProductCategoryRow = {
  id: string;
  category_id: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

type DashboardSupabaseClient = SupabaseClient<Database>;

type PeriodRange = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

type ProductAggregate = {
  id: string;
  productName: string;
  sku: string;
  category: string;
  revenue: number;
  unitsSold: number;
};

function getKstTodayRange() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('KST date range creation failed');
  }

  const start = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getKstCurrentMonthRange() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('KST month range creation failed');
  }

  const start = new Date(`${year}-${month}-01T00:00:00+09:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getAnalysisWindowStart() {
  const date = new Date();
  date.setDate(date.getDate() - ANALYSIS_WINDOW_DAYS);
  return date.toISOString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatMonthDayLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function formatMonthLabel(date: Date) {
  const year = String(date.getFullYear()).slice(2);
  const month = date.getMonth() + 1;
  return `'${year}.${month}`;
}

function getKstDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getKstMonthKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

function getLastNDaysKst(days: number) {
  const { start } = getKstTodayRange();
  const todayStart = new Date(start);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(todayStart.getDate() - (days - 1 - index));
    return date;
  });
}

function getLastNMonthsKst(months: number) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(currentMonth);
    date.setMonth(currentMonth.getMonth() - (months - 1 - index));
    return date;
  });
}

function createPeriodRange(days: number, end: Date): PeriodRange {
  const currentEnd = new Date(end);
  const currentStart = new Date(end);
  currentStart.setDate(currentStart.getDate() - days);

  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  };
}

function getTopProductRanges(): Record<TopProductPeriod, PeriodRange> {
  const now = new Date();
  const today = getKstTodayRange();
  const todayStart = new Date(today.start);
  const todayEnd = new Date(today.end);

  return {
    today: {
      currentStart: todayStart,
      currentEnd: todayEnd,
      previousStart: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000),
      previousEnd: todayStart,
    },
    week: createPeriodRange(7, now),
    month: createPeriodRange(30, now),
  };
}

function inRange(target: Date, start: Date, end: Date) {
  return target >= start && target < end;
}

function toPercentChange(currentRevenue: number, previousRevenue: number) {
  if (previousRevenue <= 0) return undefined;
  return Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1));
}

function toCategoryPercentages(
  items: Array<{ name: string; revenue: number }>,
): CategoryDataPoint[] {
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);

  if (totalRevenue <= 0) {
    return items.map((item, index) => ({
      name: item.name,
      value: 0,
      color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
    }));
  }

  const percentages = items.map((item, index) => {
    const raw = (item.revenue / totalRevenue) * 100;
    const value = Math.floor(raw);

    return {
      index,
      name: item.name,
      value,
      remainder: raw - value,
    };
  });

  let remaining = 100 - percentages.reduce((sum, item) => sum + item.value, 0);
  const byRemainder = [...percentages].sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; index < byRemainder.length && remaining > 0; index += 1) {
    byRemainder[index].value += 1;
    remaining -= 1;
  }

  return percentages
    .map((item, index) => ({
      name: item.name,
      value: item.value,
      color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
    }));
}

function getDemandStats(totalDemand: number) {
  const averageDailyDemand = totalDemand / ANALYSIS_WINDOW_DAYS;
  const reorderPoint = Math.ceil(averageDailyDemand * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS));
  const safetyStock = Math.ceil(averageDailyDemand * SAFETY_STOCK_DAYS);

  return {
    reorderPoint: Math.max(reorderPoint, 0),
    safetyStock: Math.max(safetyStock, 0),
  };
}

function getRiskLevel(available: number, reorderPoint: number, safetyStock: number): RiskLevel {
  if (available <= safetyStock) return 'critical';
  if (available <= reorderPoint) return 'warning';
  return 'low';
}

function getStockKpiStatus(lowStockCount: number): KPICardData['status'] {
  if (lowStockCount === 0) return 'success';
  if (lowStockCount <= DASHBOARD_LOW_STOCK_LIMIT) return 'warning';
  return 'critical';
}

function toInventoryItem(row: ProductWithStockRow, totalDemand: number): InventoryItem {
  const currentStock = row.stock_available ?? 0;
  const { reorderPoint, safetyStock } = getDemandStats(totalDemand);

  return {
    id: row.id ?? '',
    productName: row.name ?? '이름 없는 상품',
    sku: row.product_code ?? '-',
    category: '',
    currentStock,
    minStock: reorderPoint,
    incomingStock: 0,
    riskLevel: getRiskLevel(currentStock, reorderPoint, safetyStock),
    unit: '개',
  };
}

async function getTodayRevenueOrders(supabaseAdmin: DashboardSupabaseClient) {
  const { start, end } = getKstTodayRange();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount')
    .eq('order_status', 'order_completed')
    .eq('payment_status', 'payment_completed')
    .neq('shipping_status', 'return_completed')
    .gte('created_at', start)
    .lt('created_at', end);

  if (error) throw error;

  return (data ?? []) as RevenueOrderRow[];
}

async function getShortTermOrders(supabaseAdmin: DashboardSupabaseClient) {
  const last7Days = getLastNDaysKst(7);
  const rangeStart = last7Days[0]?.toISOString();
  const { end } = getKstTodayRange();

  if (!rangeStart) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, created_at')
    .eq('payment_status', 'payment_completed')
    .eq('shipping_status', 'shipping_completed')
    .neq('order_status', 'order_cancelled')
    .gte('created_at', rangeStart)
    .lt('created_at', end);

  if (error) throw error;

  return (data ?? []) as DailySalesOrderRow[];
}

async function getMonthlySalesOrders(supabaseAdmin: DashboardSupabaseClient) {
  const monthRange = getLastNMonthsKst(24);
  const rangeStart = monthRange[0]?.toISOString();
  const nextMonthStart = new Date(monthRange[monthRange.length - 1] ?? new Date());
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  if (!rangeStart) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, created_at')
    .eq('payment_status', 'payment_completed')
    .eq('shipping_status', 'shipping_completed')
    .neq('order_status', 'order_cancelled')
    .gte('created_at', rangeStart)
    .lt('created_at', nextMonthStart.toISOString());

  if (error) throw error;

  return (data ?? []) as MonthlySalesOrderRow[];
}

async function getDemandOrders(supabaseAdmin: DashboardSupabaseClient) {
  const demandWindowStart = getAnalysisWindowStart();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('order_status', 'order_completed')
    .eq('payment_status', 'payment_completed')
    .neq('shipping_status', 'return_completed')
    .gte('created_at', demandWindowStart);

  if (error) throw error;

  return (data ?? []) as Array<Pick<RevenueOrderRow, 'id'>>;
}

async function getTodayOrderCount(supabaseAdmin: DashboardSupabaseClient) {
  const { start, end } = getKstTodayRange();
  const { count, error } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end);

  if (error) throw error;

  return count ?? 0;
}

async function getInventoryStats(supabaseAdmin: DashboardSupabaseClient) {
  const [productResult, demandOrders] = await Promise.all([
    supabaseAdmin
      .from('products_with_stock')
      .select('id, name, product_code, stock_available')
      .order('stock_available', { ascending: true }),
    getDemandOrders(supabaseAdmin),
  ]);

  const { data: productRows, error: productError } = productResult;
  if (productError) throw productError;

  const demandMap = new Map<string, number>();
  const demandOrderIds = demandOrders.map((order) => order.id);

  if (demandOrderIds.length > 0) {
    const { data: demandRows, error: demandError } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', demandOrderIds);

    if (demandError) throw demandError;

    for (const row of (demandRows ?? []) as ProductDemandRow[]) {
      demandMap.set(row.product_id, (demandMap.get(row.product_id) ?? 0) + row.quantity);
    }
  }

  const inventoryCandidates = (productRows ?? []).map((row) => {
    const totalDemand = row.id ? (demandMap.get(row.id) ?? 0) : 0;
    return toInventoryItem(row as ProductWithStockRow, totalDemand);
  });

  const lowStockItems = inventoryCandidates.filter((item) => item.currentStock <= item.minStock);
  const inventoryItems = lowStockItems.slice(0, DASHBOARD_LOW_STOCK_LIMIT);

  return {
    inventoryItems,
    lowStockCount: lowStockItems.length,
  };
}

async function getShortTermDailyData(supabaseAdmin: DashboardSupabaseClient): Promise<DailyDataPoint[]> {
  const [orderRows, inventoryStats] = await Promise.all([
    getShortTermOrders(supabaseAdmin),
    getInventoryStats(supabaseAdmin),
  ]);

  const last7Days = getLastNDaysKst(7);
  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  for (const row of orderRows) {
    if (!row.created_at) continue;
    const key = getKstDateKey(new Date(row.created_at));
    const current = dailyMap.get(key) ?? { revenue: 0, orders: 0 };
    current.revenue += row.total_amount;
    current.orders += 1;
    dailyMap.set(key, current);
  }

  return last7Days.map((date) => {
    const key = getKstDateKey(date);
    const current = dailyMap.get(key) ?? { revenue: 0, orders: 0 };

    return {
      date: formatMonthDayLabel(date),
      revenue: current.revenue,
      orders: current.orders,
      stockRiskCount: inventoryStats.lowStockCount,
    };
  });
}

async function getMonthlySalesData(supabaseAdmin: DashboardSupabaseClient): Promise<SalesDataPoint[]> {
  const monthRange = getLastNMonthsKst(24);
  const orderRows = await getMonthlySalesOrders(supabaseAdmin);
  const monthlyMap = new Map<string, { revenue: number; orders: number }>();

  for (const row of orderRows) {
    if (!row.created_at) continue;

    const key = getKstMonthKey(new Date(row.created_at));
    const current = monthlyMap.get(key) ?? { revenue: 0, orders: 0 };
    current.revenue += row.total_amount;
    current.orders += 1;
    monthlyMap.set(key, current);
  }

  return monthRange.map((date) => {
    const key = getKstMonthKey(date);
    const current = monthlyMap.get(key) ?? { revenue: 0, orders: 0 };

    return {
      month: formatMonthLabel(date),
      revenue: current.revenue,
      orders: current.orders,
      target: 0,
    };
  });
}

// 월별 카테고리 비중을 캐싱한다 — 동일 월이면 재계산하지 않는다.
// start/end가 월 단위로 변경되므로 캐시 키도 월 단위로 갱신된다.
const getCategoryDataCached = unstable_cache(
  async (start: string, end: string): Promise<CategoryDataPoint[]> => {
    const supabaseAdmin = getSupabaseAdmin() as DashboardSupabaseClient;

    const { data: categoryRows, error: categoryListError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (categoryListError) throw categoryListError;

    const categories = (categoryRows ?? []) as CategoryRow[];

    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('payment_status', 'payment_completed')
      .eq('shipping_status', 'shipping_completed')
      .neq('order_status', 'order_cancelled')
      .gte('created_at', start)
      .lt('created_at', end);

    if (orderError) throw orderError;

    const orderIds = (orders ?? []).map((order) => order.id);
    const revenueByCategory = new Map<string, number>(
      [...categories.map((category) => [category.name, 0] as const), ['미분류', 0]],
    );

    if (orderIds.length === 0) {
      return toCategoryPercentages(
        [...revenueByCategory.entries()].map(([name, revenue]) => ({ name, revenue })),
      );
    }

    const { data: orderItems, error: orderItemError } = await supabaseAdmin
      .from('order_items')
      .select('order_id, product_id, price, quantity')
      .in('order_id', orderIds);

    if (orderItemError) throw orderItemError;

    const productIds = [...new Set((orderItems ?? []).map((item) => item.product_id))];
    if (productIds.length === 0) {
      return [];
    }

    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, category_id')
      .in('id', productIds);

    if (productError) throw productError;

    const productCategoryMap = new Map<string, string | null>(
      ((products ?? []) as ProductCategoryRow[]).map((product) => [product.id, product.category_id]),
    );
    const categoryNameMap = new Map<string, string>(
      categories.map((category) => [category.id, category.name]),
    );

    for (const item of (orderItems ?? []) as Array<Pick<OrderItemSalesRow, 'product_id' | 'price' | 'quantity'>>) {
      const categoryId = productCategoryMap.get(item.product_id) ?? null;
      const categoryName = categoryId ? (categoryNameMap.get(categoryId) ?? '미분류') : '미분류';
      const revenue = item.price * item.quantity;

      revenueByCategory.set(categoryName, (revenueByCategory.get(categoryName) ?? 0) + revenue);
    }

    const sorted = [...revenueByCategory.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return toCategoryPercentages(sorted);
  },
  ['dashboard-category'],
  { revalidate: false },
);

async function getCategoryData(
  _supabaseAdmin: DashboardSupabaseClient,
): Promise<CategoryDataPoint[]> {
  const { start, end } = getKstCurrentMonthRange();
  return getCategoryDataCached(start, end);
}

async function getCompletedOrdersForTopProducts(supabaseAdmin: DashboardSupabaseClient) {
  const ranges = getTopProductRanges();
  const earliestStart = new Date(
    Math.min(...Object.values(ranges).map((range) => range.previousStart.getTime())),
  ).toISOString();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, created_at')
    .eq('payment_status', 'payment_completed')
    .eq('shipping_status', 'shipping_completed')
    .neq('order_status', 'order_cancelled')
    .gte('created_at', earliestStart);

  if (error) throw error;

  return (data ?? []) as CompletedOrderRow[];
}

function aggregateProductSales(itemRows: OrderItemSalesRow[], orderIds: Set<string>) {
  const aggregateMap = new Map<string, ProductAggregate>();

  for (const row of itemRows) {
    if (!orderIds.has(row.order_id)) continue;

    const current = aggregateMap.get(row.product_id) ?? {
      id: row.product_id,
      productName: row.product_name,
      sku: row.product_code ?? row.product_id,
      category: '미분류',
      revenue: 0,
      unitsSold: 0,
    };

    current.revenue += row.price * row.quantity;
    current.unitsSold += row.quantity;
    aggregateMap.set(row.product_id, current);
  }

  return aggregateMap;
}

function toTopProductList(
  currentMap: Map<string, ProductAggregate>,
  previousMap: Map<string, ProductAggregate>,
): TopProductItem[] {
  return [...currentMap.values()]
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
      return a.productName.localeCompare(b.productName);
    })
    .slice(0, 5)
    .map((product, index) => {
      const previousRevenue = previousMap.get(product.id)?.revenue ?? 0;

      return {
        id: product.id,
        rank: index + 1,
        productName: product.productName,
        sku: product.sku,
        category: product.category,
        revenue: product.revenue,
        unitsSold: product.unitsSold,
        changePercent: toPercentChange(product.revenue, previousRevenue),
      };
    });
}

async function getTopProducts(supabaseAdmin: DashboardSupabaseClient) {
  const ranges = getTopProductRanges();
  const completedOrders = await getCompletedOrdersForTopProducts(supabaseAdmin);

  if (completedOrders.length === 0) {
    return {
      today: [],
      week: [],
      month: [],
    } as Record<TopProductPeriod, TopProductItem[]>;
  }

  const orderIds = completedOrders.map((order) => order.id);
  const { data: orderItemRows, error: orderItemError } = await supabaseAdmin
    .from('order_items')
    .select('order_id, product_id, product_name, product_code, price, quantity')
    .in('order_id', orderIds);

  if (orderItemError) throw orderItemError;

  const itemRows = (orderItemRows ?? []) as OrderItemSalesRow[];

  const ordersByRange = Object.fromEntries(
    Object.entries(ranges).map(([period, range]) => {
      const currentIds = new Set(
        completedOrders
          .filter((order) => order.created_at && inRange(new Date(order.created_at), range.currentStart, range.currentEnd))
          .map((order) => order.id),
      );
      const previousIds = new Set(
        completedOrders
          .filter((order) => order.created_at && inRange(new Date(order.created_at), range.previousStart, range.previousEnd))
          .map((order) => order.id),
      );

      return [period, { currentIds, previousIds }];
    }),
  ) as Record<TopProductPeriod, { currentIds: Set<string>; previousIds: Set<string> }>;

  return {
    today: toTopProductList(
      aggregateProductSales(itemRows, ordersByRange.today.currentIds),
      aggregateProductSales(itemRows, ordersByRange.today.previousIds),
    ),
    week: toTopProductList(
      aggregateProductSales(itemRows, ordersByRange.week.currentIds),
      aggregateProductSales(itemRows, ordersByRange.week.previousIds),
    ),
    month: toTopProductList(
      aggregateProductSales(itemRows, ordersByRange.month.currentIds),
      aggregateProductSales(itemRows, ordersByRange.month.previousIds),
    ),
  } satisfies Record<TopProductPeriod, TopProductItem[]>;
}

function parseDashboardOrderQuery(
  request: Request,
):
  | { ok: true; query: OrderListQuery }
  | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const parsed = orderListQuerySchema.safeParse({
    search: searchParams.get('search'),
    orderStatus: searchParams.get('orderStatus'),
    paymentStatus: null,
    shippingStatus: null,
    paymentMethod: null,
    page: searchParams.get('page'),
    limit: searchParams.get('limit') ?? String(DASHBOARD_RECENT_ORDER_LIMIT),
  });

  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'invalid_dashboard_order_query', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    query: Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as OrderListQuery,
  };
}

async function getDashboardOrders(
  supabaseAdmin: DashboardSupabaseClient,
  query: OrderListQuery,
): Promise<OrderListResponse> {
  return getOrders(supabaseAdmin, query);
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsedQuery = parseDashboardOrderQuery(request);
  if (!parsedQuery.ok) return parsedQuery.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const [todayRevenueOrders, todayOrderCount, inventoryStats, orderResult, topProducts, dailyData, salesData, categoryData] = await Promise.all([
      getTodayRevenueOrders(supabaseAdmin),
      getTodayOrderCount(supabaseAdmin),
      getInventoryStats(supabaseAdmin),
      getDashboardOrders(supabaseAdmin, parsedQuery.query),
      getTopProducts(supabaseAdmin),
      getShortTermDailyData(supabaseAdmin),
      getMonthlySalesData(supabaseAdmin),
      getCategoryData(supabaseAdmin),
    ]);

    const todayRevenueTotal = todayRevenueOrders.reduce((sum, order) => sum + order.total_amount, 0);

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
    ];

    return NextResponse.json({
      kpiData,
      dailyData,
      salesData,
      categoryData,
      inventoryItems: inventoryStats.inventoryItems,
      orders: orderResult.items,
      ordersPagination: {
        total: orderResult.total,
        page: orderResult.page,
        limit: orderResult.limit,
      },
      topProducts,
    });
  } catch {
    return NextResponse.json(
      { error: '대시보드 데이터를 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}
