// ============================================================
// Dashboard 전용 TypeScript 타입 정의
// ============================================================

import type { Order } from '@/features/orders/types/order.type';

export type {
  Order,
  OrderCustomer,
  OrderFilter,
  OrderItemRow,
  OrderProduct,
  OrderRow,
  OrderStatusType,
  OrderStockStatus,
  PaymentMethod,
  PaymentStatusType,
  ShippingStatusType,
} from '@/features/orders/types/order.type';

export type {
  Notification,
  NotificationLevel,
  NotificationType,
} from '@/features/notifications/types/notification.types';

// KPI 카드
export type KPIStatus = 'success' | 'warning' | 'critical' | 'info';

export interface KPICardData {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  status: KPIStatus;
  description?: string;
  progressPercent?: number;
}

// 차트
export interface DailyDataPoint {
  date: string;
  revenue: number;
  orders: number;
  stockRiskCount: number;
}

export interface SalesDataPoint {
  month: string;
  revenue: number;
  orders: number;
  target: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

// 재고
export type RiskLevel = 'critical' | 'warning' | 'low';

export interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  incomingStock: number;
  riskLevel: RiskLevel;
  unit: string;
}

// 사용자
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

// 인기 상품
export type TopProductPeriod = 'today' | 'week' | 'month';

export interface TopProductItem {
  id: string;
  rank: number;
  productName: string;
  sku: string;
  category: string;
  revenue: number;
  unitsSold: number;
  changePercent?: number;
}

// 대시보드 페이지
export interface DashboardPageProps {
  kpiData: KPICardData[];
  salesData: SalesDataPoint[];
  categoryData: CategoryDataPoint[];
  inventoryItems: InventoryItem[];
  orders: Order[];
  ordersPagination: DashboardOrdersPagination;
  currentUser: UserProfile;
}

export interface DashboardOrdersPagination {
  total: number;
  page: number;
  limit: number;
}

// 대시보드 응답 데이터
export interface DashboardData {
  kpiData: KPICardData[];
  dailyData: DailyDataPoint[];
  salesData: SalesDataPoint[];
  categoryData: CategoryDataPoint[];
  inventoryItems: InventoryItem[];
  orders: Order[];
  ordersPagination: DashboardOrdersPagination;
  topProducts: Record<TopProductPeriod, TopProductItem[]>;
}
