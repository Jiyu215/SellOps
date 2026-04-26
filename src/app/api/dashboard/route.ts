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

/**
 * Compute the KST "today" range as ISO timestamps.
 *
 * Returns the start of the current day in Korea Standard Time (00:00:00+09:00) and the start of the next day as ISO 8601 strings.
 *
 * @returns An object with `start` and `end` ISO 8601 timestamp strings where `start` is the KST date at 00:00:00 and `end` is the KST start of the following day.
 * @throws Error('KST date range creation failed') if the KST date components cannot be determined
 */
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

/**
 * Compute the current calendar month's KST start and the start of the following month as ISO timestamps.
 *
 * @returns An object with `start` set to the KST timestamp for the first moment of the current month and `end` set to the KST timestamp for the first moment of the next month.
 * @throws Error('KST month range creation failed') If the locale formatter does not produce year or month parts.
 */
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

/**
 * Get an ISO 8601 timestamp for the start of the analysis window.
 *
 * @returns An ISO 8601 timestamp string representing the datetime exactly ANALYSIS_WINDOW_DAYS before now
 */
function getAnalysisWindowStart() {
  const date = new Date();
  date.setDate(date.getDate() - ANALYSIS_WINDOW_DAYS);
  return date.toISOString();
}

/**
 * Format a numeric value using Korean locale digit grouping and separators.
 *
 * @param value - The number to format
 * @returns The formatted number string using the `ko-KR` locale
 */
function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

/**
 * Formats a Date into a Korea Standard Time month/day label.
 *
 * @param date - The Date to format in the Asia/Seoul time zone
 * @returns The month and day formatted for the `ko-KR` locale (e.g., "3.14")
 */
function formatMonthDayLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

/**
 * Produces a compact month label in the format 'YY.M (e.g., '23.4).
 *
 * @param date - The date to derive the year/month from
 * @returns The formatted month label as `'<two-digit-year>.<month-number>` (month is not zero-padded)
 */
function formatMonthLabel(date: Date) {
  const year = String(date.getFullYear()).slice(2);
  const month = date.getMonth() + 1;
  return `'${year}.${month}`;
}

/**
 * Produce a KST-based calendar date key in 'YYYY-MM-DD' format for the given date.
 *
 * @param date - The input Date to convert to Korea Standard Time (Asia/Seoul) calendar date
 * @returns The corresponding calendar date string in `YYYY-MM-DD` (KST)
 */
function getKstDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Produce the KST month key for a date in "YYYY-MM" format.
 *
 * @param date - The date to convert; interpreted in the Asia/Seoul (KST) time zone
 * @returns The month key as `"YYYY-MM"` corresponding to the given date in KST
 */
function getKstMonthKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

/**
 * Produce an array of KST day-start Date objects for the last `days` days ending today.
 *
 * @param days - Number of consecutive days to include (1 yields only today's start)
 * @returns An array of Date objects at KST midnight (00:00:00+09:00), ordered from oldest to newest, covering the last `days` days ending with today
 */
function getLastNDaysKst(days: number) {
  const { start } = getKstTodayRange();
  const todayStart = new Date(start);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(todayStart.getDate() - (days - 1 - index));
    return date;
  });
}

/**
 * Generate month-start Date objects for the last N months, including the current month.
 *
 * @param months - The number of months to include (must be a positive integer).
 * @returns An array of Date objects set to the first day of each month (local timezone), ordered from oldest to newest, covering the last `months` months including the current month.
 */
function getLastNMonthsKst(months: number) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(currentMonth);
    date.setMonth(currentMonth.getMonth() - (months - 1 - index));
    return date;
  });
}

/**
 * Builds two consecutive period windows of length `days` where the later window ends at `end`.
 *
 * @param days - Number of days in each window
 * @param end - End boundary for the current (later) window
 * @returns An object with `currentStart`/`currentEnd` for the later window and `previousStart`/`previousEnd` for the immediately preceding window; each window spans `days` days and the previous window directly precedes the current window
 */
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

/**
 * Builds time windows used to compute top-product comparisons for today, the last week, and the last month.
 *
 * The `today` entry uses KST day boundaries (start/end of the current KST day) while `week` and `month`
 * are back-to-back ranges covering the last 7 and 30 days respectively.
 *
 * @returns An object with `today`, `week`, and `month` keys, each providing `currentStart`, `currentEnd`,
 * `previousStart`, and `previousEnd` Date boundaries for comparing current and previous periods.
 */
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

/**
 * Determines whether a date falls within the half-open interval [start, end).
 *
 * @param target - The date to test.
 * @param start - The start of the interval (inclusive).
 * @param end - The end of the interval (exclusive).
 * @returns `true` if `target` is greater than or equal to `start` and strictly less than `end`, `false` otherwise.
 */
function inRange(target: Date, start: Date, end: Date) {
  return target >= start && target < end;
}

/**
 * Calculate the percentage change from a previous revenue value to a current revenue value.
 *
 * @param currentRevenue - Revenue for the current period
 * @param previousRevenue - Revenue for the previous period
 * @returns The percent change rounded to one decimal place, or `undefined` when `previousRevenue` is less than or equal to 0
 */
function toPercentChange(currentRevenue: number, previousRevenue: number) {
  if (previousRevenue <= 0) return undefined;
  return Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1));
}

/**
 * Converts category revenue items into percentage-formatted category data points for charting.
 *
 * @param items - Array of objects with `name` and `revenue` for each category
 * @returns An array of CategoryDataPoint where `value` fields are integer percentages that sum to 100 (or all zeros when total revenue is 0), and `color` values are assigned from CATEGORY_CHART_COLORS cyclically
 */
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

/**
 * Compute reorder point and safety stock from total demand observed over the analysis window.
 *
 * @param totalDemand - Total units demanded across the analysis window (`ANALYSIS_WINDOW_DAYS`)
 * @returns An object with:
 *  - `reorderPoint`: the minimum stock level to trigger reorder, computed as ceil(average daily demand * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS)) and clamped to at least 0.
 *  - `safetyStock`: the buffer stock computed as ceil(average daily demand * SAFETY_STOCK_DAYS) and clamped to at least 0.
 */
function getDemandStats(totalDemand: number) {
  const averageDailyDemand = totalDemand / ANALYSIS_WINDOW_DAYS;
  const reorderPoint = Math.ceil(averageDailyDemand * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS));
  const safetyStock = Math.ceil(averageDailyDemand * SAFETY_STOCK_DAYS);

  return {
    reorderPoint: Math.max(reorderPoint, 0),
    safetyStock: Math.max(safetyStock, 0),
  };
}

/**
 * Determine the inventory risk level from available quantity and thresholds.
 *
 * @param available - Current available stock quantity
 * @param reorderPoint - Reorder point threshold; when available is less than or equal to this, risk is elevated
 * @param safetyStock - Safety stock threshold; when available is less than or equal to this, risk is critical
 * @returns `'critical'` if `available` is less than or equal to `safetyStock`, `'warning'` if `available` is less than or equal to `reorderPoint`, `'low'` otherwise
 */
function getRiskLevel(available: number, reorderPoint: number, safetyStock: number): RiskLevel {
  if (available <= safetyStock) return 'critical';
  if (available <= reorderPoint) return 'warning';
  return 'low';
}

/**
 * Map a low-stock item count to a KPI status level.
 *
 * @param lowStockCount - Number of inventory items considered low stock
 * @returns `'success'` if there are zero low-stock items, `'warning'` if `lowStockCount` is less than or equal to `DASHBOARD_LOW_STOCK_LIMIT`, `'critical'` otherwise
 */
function getStockKpiStatus(lowStockCount: number): KPICardData['status'] {
  if (lowStockCount === 0) return 'success';
  if (lowStockCount <= DASHBOARD_LOW_STOCK_LIMIT) return 'warning';
  return 'critical';
}

/**
 * Convert a product-with-stock database row into an InventoryItem with demand-derived reorder/safety thresholds and a risk classification.
 *
 * @param row - Database row for a product that may include stock fields (e.g., `stock_available`, `id`, `name`, `product_code`)
 * @param totalDemand - Total units demanded for the product over the analysis window used to compute reorder point and safety stock
 * @returns An InventoryItem containing `id`, `productName`, `sku`, `category` (empty string), `currentStock`, `minStock` (reorder point), `incomingStock` (0), `riskLevel`, and `unit` (`'개'`)
 */
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

/**
 * Fetches today's completed and paid orders with their revenue totals.
 *
 * Queries orders created within the KST "today" range that are marked as completed and payment-completed and not returned, returning each order's `id` and `total_amount`.
 *
 * @returns An array of orders (`id` and `total_amount`) for KST today that match the completed/paid criteria
 * @throws The Supabase query error when the database request fails
 */
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

/**
 * Fetches paid and shipped orders created within the last 7 days in KST.
 *
 * @returns An array of `DailySalesOrderRow` containing `id`, `total_amount`, and `created_at` for orders in the 7-day window
 * @throws The Supabase error if the database query fails
 */
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

/**
 * Fetches orders from the last 24 months (KST month boundaries) that are paid, shipped, and not cancelled.
 *
 * The result covers orders from the start of the earliest month in the 24-month window up to the end of the latest month.
 *
 * @returns An array of order rows containing `id`, `total_amount`, and `created_at` for matched orders; an empty array if the month range cannot be determined.
 * @throws Throws the Supabase error when the database query fails.
 */
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

/**
 * Fetches order IDs for completed, paid, and non-returned orders created since the analysis window start.
 *
 * @returns An array of objects each containing the `id` of a matching order, or an empty array if no orders are found.
 */
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

/**
 * Get the number of orders created during the current KST day.
 *
 * @returns The exact count of orders with `created_at` timestamp in the KST range [today start, tomorrow start); returns `0` if no orders match.
 * @throws The Supabase error object when the database query fails.
 */
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

/**
 * Builds inventory KPI data by computing demand-aware inventory items and counting low-stock products.
 *
 * Fetches product stock and recent demand, converts products into inventory items (including reorder point and risk level),
 * filters those whose current stock is less than or equal to their minimum stock, and returns the top items up to the dashboard limit.
 *
 * @returns An object containing:
 *  - `inventoryItems`: an array of `InventoryItem` objects for products with `currentStock <= minStock`, limited to `DASHBOARD_LOW_STOCK_LIMIT`.
 *  - `lowStockCount`: the total number of products where `currentStock <= minStock`.
 */
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

/**
 * Builds a 7-day KST daily series of revenue and order counts and includes the current low-stock count for each day.
 *
 * @returns An array of seven daily data points for the last 7 KST days. Each point contains `date` (formatted label), `revenue` (sum of total_amount for that day), `orders` (count of orders for that day), and `stockRiskCount` (the low-stock count repeated for each day).
 */
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

/**
 * Builds a 24-month series of monthly sales metrics in KST for the last 24 months including the current month.
 *
 * @returns An array of 24 SalesDataPoint objects (one per month) containing:
 * - `month`: month label in `YY.M` style
 * - `revenue`: total revenue for that month
 * - `orders`: total completed order count for that month
 * - `target`: placeholder value `0`
 */
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

/**
 * Fetches category revenue share data for the current KST month.
 *
 * @returns An array of category data points (`name`, `value`, `color`) where `value` is the percentage share of revenue for the month and the values sum to 100 (or are all `0` when total revenue is zero).
 */
async function getCategoryData(
  _supabaseAdmin: DashboardSupabaseClient,
): Promise<CategoryDataPoint[]> {
  const { start, end } = getKstCurrentMonthRange();
  return getCategoryDataCached(start, end);
}

/**
 * Fetches completed, paid, and shipped orders starting from the earliest previous period used for top-product comparisons.
 *
 * @returns An array of `CompletedOrderRow` objects containing `id` and `created_at` for orders that are payment-completed, shipping-completed, and not cancelled.
 */
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

/**
 * Aggregate order item rows into per-product sales totals for the specified orders.
 *
 * @param itemRows - Order item rows containing `order_id`, `product_id`, `price`, `quantity`, and product metadata
 * @param orderIds - Set of order IDs to include in the aggregation
 * @returns A Map keyed by `product_id` where each value is a `ProductAggregate` with cumulative `revenue` and `unitsSold` (and product metadata)
 */
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

/**
 * Produces the top 5 products for the current period with ranking and percent change versus a previous period.
 *
 * @param currentMap - Map from product id to aggregate metrics for the current period
 * @param previousMap - Map from product id to aggregate metrics for the previous period
 * @returns An array of up to five `TopProductItem` entries ordered by rank; each entry includes `id`, `rank`, `productName`, `sku`, `category`, `revenue`, `unitsSold`, and `changePercent` (percent change in revenue compared to the previous period, or `undefined` when previous revenue is not positive)
 */
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

/**
 * Build top-selling product lists for today, week, and month including prior-period comparisons.
 *
 * @returns An object with `today`, `week`, and `month` keys each containing an array of top products (ranked list with revenue, units sold, and percent change versus the previous period).
 * @throws Throws the Supabase error if the `order_items` query fails.
 */
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

/**
 * Parse and validate dashboard order query parameters from the request URL.
 *
 * @param request - The incoming Request whose URL search parameters provide dashboard order query fields
 * @returns `{ ok: true, query: OrderListQuery }` with the cleaned query when validation succeeds; `{ ok: false, response: Response }` containing a 400 JSON response when validation fails
 */
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

/**
 * Retrieves a paginated list of orders according to the dashboard order query.
 *
 * @param query - Filters and pagination options for the orders list
 * @returns OrderListResponse containing the order items and pagination metadata
 */
async function getDashboardOrders(
  supabaseAdmin: DashboardSupabaseClient,
  query: OrderListQuery,
): Promise<OrderListResponse> {
  return getOrders(supabaseAdmin, query);
}

/**
 * Handle GET /api/dashboard: authenticate the request, aggregate dashboard KPIs and datasets, and return them as JSON.
 *
 * @param request - The incoming Request for the dashboard route
 * @returns A NextResponse containing a JSON object with the following keys:
 * - `kpiData`: array of KPI card objects (revenue, orders, stock alerts)
 * - `dailyData`: short-term daily series for the dashboard
 * - `salesData`: monthly sales series
 * - `categoryData`: category percentage data for the current month
 * - `inventoryItems`: list of inventory items and their computed risk/minimums
 * - `orders`: recent order items according to the parsed query
 * - `ordersPagination`: pagination info `{ total, page, limit }` for `orders`
 * - `topProducts`: top products lists for today, week, and month
 *
 * On authentication or query validation failure the function returns the corresponding error response; on internal failure it returns HTTP 500 with `{ error: '대시보드 데이터를 불러오지 못했습니다.' }`.
 */
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
