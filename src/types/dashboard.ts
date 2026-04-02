// ============================================================
// Dashboard 전용 TypeScript 타입 정의
// ============================================================

// ── KPI 카드 ──────────────────────────────────────────────
export type KPIStatus = 'success' | 'warning' | 'critical' | 'info';

export interface KPICardData {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number; // 전월 대비 % 변화 (양수: 증가, 음수: 감소)
  status: KPIStatus;
  description?: string;
  progressPercent?: number; // 목표 달성률 0-100 (초과 시 100으로 클램프)
}

// ── 차트 ──────────────────────────────────────────────────
export interface DailyDataPoint {
  date: string;           // "3/21", "3/22" 등
  revenue: number;        // 당일 매출
  orders: number;         // 당일 주문 수
  stockRiskCount: number; // 재고 위험 품목 수
}

export interface SalesDataPoint {
  month: string;
  revenue: number;    // 매출액
  orders: number;     // 주문 수
  target: number;     // 목표 매출
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

// ── 재고 ──────────────────────────────────────────────────
export type RiskLevel = 'critical' | 'warning' | 'low';

export interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;   // 최소 안전 재고
  incomingStock: number; // 입고 예정 수량
  riskLevel: RiskLevel;
  unit: string;
}

// ── 주문 ──────────────────────────────────────────────────

/** 주문 상태 */
export type OrderStatusType =
  | 'order_waiting'   // 주문대기
  | 'order_confirmed' // 주문확정
  | 'order_cancelled' // 주문취소
  | 'order_completed'; // 주문완료

/** 결제 상태 */
export type PaymentStatusType =
  | 'payment_pending'    // 결제대기
  | 'payment_completed'  // 결제완료
  | 'payment_failed'     // 결제실패
  | 'payment_cancelled'  // 결제취소
  | 'refund_in_progress' // 환불중
  | 'refund_completed';  // 환불완료

/** 배송 상태 */
export type ShippingStatusType =
  | 'shipping_ready'       // 배송준비
  | 'shipping_in_progress' // 배송중
  | 'shipping_completed'   // 배송완료
  | 'shipping_on_hold'     // 배송보류
  | 'return_completed';    // 반품완료

export type PaymentMethod = 'card' | 'bank_transfer' | 'kakao_pay' | 'naver_pay';

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  tier?: string; // 회원 등급 (VIP, Gold, Silver, 일반 등)
}

export interface OrderProduct {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  products: OrderProduct[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatusType;
  paymentStatus: PaymentStatusType;
  shippingStatus: ShippingStatusType;
  createdAt: string; // ISO 8601
  shippingAddress?: string;
}

// ── 필터 / 검색 ───────────────────────────────────────────
export interface OrderFilter {
  search: string;
  orderStatus: OrderStatusType | 'all';
  paymentStatus: PaymentStatusType | 'all';
  shippingStatus: ShippingStatusType | 'all';
  paymentMethod: PaymentMethod | 'all';
  dateRange?: { from: string; to: string };
}

// ── 사용자 / 프로필 ───────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

// ── 인기 상품 Top 5 ───────────────────────────────────────
export type TopProductPeriod = 'today' | 'week' | 'month';

export interface TopProductItem {
  id: string;
  rank: number;
  productName: string;
  sku: string;
  category: string;
  revenue: number;        // 기간 내 매출
  unitsSold: number;      // 기간 내 판매 수량
  changePercent?: number; // 전 기간 대비 변화율 (%)
}

// ── 알림 ──────────────────────────────────────────────────
export type NotificationType =
  | 'payment_failure'
  | 'order_cancel'
  | 'order_return'
  | 'shipping_delay'
  | 'low_stock'
  | 'customer_inquiry';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO 8601
  href?: string;     // 클릭 시 이동 경로
}

// ── 대시보드 전체 Props ────────────────────────────────────
export interface DashboardPageProps {
  kpiData: KPICardData[];
  salesData: SalesDataPoint[];
  categoryData: CategoryDataPoint[];
  inventoryItems: InventoryItem[];
  orders: Order[];
  currentUser: UserProfile;
}

// ── 대시보드 데이터 묶음 (서비스 레이어 반환 타입) ──────────
export interface DashboardData {
  kpiData: KPICardData[];
  dailyData: DailyDataPoint[];
  salesData: SalesDataPoint[];
  categoryData: CategoryDataPoint[];
  inventoryItems: InventoryItem[];
  orders: Order[];
  topProducts: Record<TopProductPeriod, TopProductItem[]>;
}
