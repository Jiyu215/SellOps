import type {
  KPICardData,
  DailyDataPoint,
  SalesDataPoint,
  CategoryDataPoint,
  InventoryItem,
  Order,
  UserProfile,
  TopProductItem,
  TopProductPeriod,
  Notification,
} from '@/types/dashboard';

// ── 실시간 날짜 헬퍼 ──────────────────────────────────────
const _now = new Date();

/** n일 전 날짜를 'M/D' 형식으로 반환 (단기 차트 라벨용) */
const _dayLabel = (daysAgo: number): string => {
  const d = new Date(_now);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** n개월 전의 "'YY.M" 형식 라벨 반환 (장기 차트 라벨용) */
const _monthLabel = (monthsAgo: number): string => {
  const d = new Date(_now.getFullYear(), _now.getMonth() - monthsAgo, 1);
  return `'${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}`;
};

/** n일 전 특정 시각의 ISO 문자열 반환 */
const _isoAt = (daysAgo: number, hour: number, minute: number): string => {
  const d = new Date(_now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ── 현재 로그인 유저 ──────────────────────────────────────
export const MOCK_USER: UserProfile = {
  id: 'u-001',
  name: '김운영자',
  email: 'admin@sellops.com',
  role: '슈퍼 어드민',
  avatarUrl: undefined,
};

// ── KPI 카드 (스펙: 3개) — 오늘 기준 ─────────────────────
export const MOCK_KPI_DATA: KPICardData[] = [
  {
    id: 'kpi-revenue',
    title: '오늘 매출',
    value: '₩2,650,000',
    change: -15.9, // 전일(₩3,150,000) 대비 감소
    status: 'success',
    description: '전일 대비 15.9% 감소, 일 목표(₩2.5M) 초과',
    progressPercent: 106, // 일 목표 ₩2.5M 대비 달성률 → 100으로 클램프
  },
  {
    id: 'kpi-orders',
    title: '오늘 주문',
    value: 71,
    unit: '건',
    change: -15.5, // 전일(84건) 대비 감소
    status: 'info',
    description: '오늘 신규 주문, 일 목표(65건) 초과',
    progressPercent: 109, // 일 목표 65건 대비 달성률 → 100으로 클램프
  },
  {
    id: 'kpi-stock-critical',
    title: '재고 경고',
    value: 7,
    unit: '품목',
    change: -3,
    status: 'critical',
    description: '즉시 입고 필요',
    progressPercent: 23, // 안전 재고 대비 잔여 비율
  },
];

// ── 단기 추이 (최근 7일: D-6 ~ 오늘) ─────────────────────
// D-4: 급감(-53% → DROP), D-1: 급등(+32% → GROWTH)
export const MOCK_DAILY_DATA: DailyDataPoint[] = [
  { date: _dayLabel(6), revenue: 1850000, orders: 47, stockRiskCount: 6 },
  { date: _dayLabel(5), revenue: 2100000, orders: 54, stockRiskCount: 6 },
  { date: _dayLabel(4), revenue: 980000,  orders: 28, stockRiskCount: 7 },
  { date: _dayLabel(3), revenue: 1750000, orders: 45, stockRiskCount: 7 },
  { date: _dayLabel(2), revenue: 2380000, orders: 62, stockRiskCount: 7 },
  { date: _dayLabel(1), revenue: 3150000, orders: 84, stockRiskCount: 7 },
  { date: _dayLabel(0), revenue: 2650000, orders: 71, stockRiskCount: 7 },
];

// ── 인기 상품 Top 5 (기간별) ──────────────────────────────
export const MOCK_TOP_PRODUCTS: Record<TopProductPeriod, TopProductItem[]> = {
  today: [
    { id: 'tp-t1', rank: 1, productName: 'MX Keys S 키보드', sku: 'KB-MXS-BLK', category: '키보드',    revenue: 695000,  unitsSold: 5,  changePercent: 8.2  },
    { id: 'tp-t2', rank: 2, productName: 'G502 X Plus 마우스', sku: 'MS-G502-WHT', category: '마우스',  revenue: 534000,  unitsSold: 6,  changePercent: 3.1  },
    { id: 'tp-t3', rank: 3, productName: 'Keychron Q1 Pro', sku: 'KB-KCQ1-GRY', category: '키보드',   revenue: 498000,  unitsSold: 2,  changePercent: -5.4 },
    { id: 'tp-t4', rank: 4, productName: 'USB-C Hub 7-in-1', sku: 'HB-UC7-SLV', category: '허브/케이블', revenue: 354000, unitsSold: 6,  changePercent: 15.6 },
    { id: 'tp-t5', rank: 5, productName: 'MagSafe 충전 케이블', sku: 'CB-MAG-WHT', category: '허브/케이블', revenue: 351000, unitsSold: 9, changePercent: 22.1 },
  ],
  week: [
    { id: 'tp-w1', rank: 1, productName: 'MX Keys S 키보드', sku: 'KB-MXS-BLK', category: '키보드',    revenue: 4175000, unitsSold: 30, changePercent: 12.4 },
    { id: 'tp-w2', rank: 2, productName: 'Keychron Q1 Pro', sku: 'KB-KCQ1-GRY', category: '키보드',   revenue: 3485000, unitsSold: 14, changePercent: 8.7  },
    { id: 'tp-w3', rank: 3, productName: 'G502 X Plus 마우스', sku: 'MS-G502-WHT', category: '마우스',  revenue: 2670000, unitsSold: 30, changePercent: 5.2  },
    { id: 'tp-w4', rank: 4, productName: 'USB-C Hub 7-in-1', sku: 'HB-UC7-SLV', category: '허브/케이블', revenue: 2360000, unitsSold: 40, changePercent: 18.3 },
    { id: 'tp-w5', rank: 5, productName: 'MagSafe 충전 케이블', sku: 'CB-MAG-WHT', category: '허브/케이블', revenue: 1560000, unitsSold: 40, changePercent: -2.1 },
  ],
  month: [
    { id: 'tp-m1', rank: 1, productName: 'MX Keys S 키보드', sku: 'KB-MXS-BLK', category: '키보드',    revenue: 13620000, unitsSold: 98,  changePercent: 15.3 },
    { id: 'tp-m2', rank: 2, productName: 'Keychron Q1 Pro', sku: 'KB-KCQ1-GRY', category: '키보드',   revenue: 11454000, unitsSold: 46,  changePercent: 9.1  },
    { id: 'tp-m3', rank: 3, productName: 'G502 X Plus 마우스', sku: 'MS-G502-WHT', category: '마우스',  revenue: 8810000,  unitsSold: 99,  changePercent: 7.2  },
    { id: 'tp-m4', rank: 4, productName: 'USB-C Hub 7-in-1', sku: 'HB-UC7-SLV', category: '허브/케이블', revenue: 7080000, unitsSold: 120, changePercent: 22.4 },
    { id: 'tp-m5', rank: 5, productName: 'MagSafe 충전 케이블', sku: 'CB-MAG-WHT', category: '허브/케이블', revenue: 4680000, unitsSold: 120, changePercent: 3.8  },
  ],
};

// ── 장기 추이 (최근 24개월: 현재 기준) ───────────────────
// 12개월 뷰: 마지막 12개 항목 사용
// 24개월 뷰: 전체 24개 항목 사용
// YoY 비교: index N vs index N-12 (동년 동월)
export const MOCK_SALES_DATA: SalesDataPoint[] = [
  // ── 24개월 전 ~ 13개월 전 ──
  { month: _monthLabel(23), revenue: 25000000, orders: 645,  target: 28000000 },
  { month: _monthLabel(22), revenue: 28500000, orders: 720,  target: 28000000 },
  { month: _monthLabel(21), revenue: 27000000, orders: 685,  target: 29000000 },
  { month: _monthLabel(20), revenue: 31000000, orders: 790,  target: 30000000 },
  { month: _monthLabel(19), revenue: 33500000, orders: 850,  target: 31000000 },
  { month: _monthLabel(18), revenue: 29000000, orders: 740,  target: 31000000 },
  { month: _monthLabel(17), revenue: 35000000, orders: 890,  target: 33000000 },
  { month: _monthLabel(16), revenue: 42000000, orders: 1050, target: 38000000 },
  { month: _monthLabel(15), revenue: 51000000, orders: 1280, target: 45000000 },
  // ── 12개월 전 ~ 1개월 전 ──
  { month: _monthLabel(14), revenue: 29000000, orders: 735,  target: 32000000 },
  { month: _monthLabel(13), revenue: 26000000, orders: 680,  target: 32000000 },
  { month: _monthLabel(12), revenue: 37000000, orders: 940,  target: 35000000 },
  { month: _monthLabel(11), revenue: 34000000, orders: 870,  target: 36000000 },
  { month: _monthLabel(10), revenue: 39000000, orders: 990,  target: 38000000 },
  { month: _monthLabel(9),  revenue: 43000000, orders: 1090, target: 40000000 },
  { month: _monthLabel(8),  revenue: 38000000, orders: 970,  target: 40000000 },
  { month: _monthLabel(7),  revenue: 44000000, orders: 1110, target: 42000000 },
  { month: _monthLabel(6),  revenue: 41000000, orders: 1050, target: 42000000 },
  { month: _monthLabel(5),  revenue: 47000000, orders: 1190, target: 44000000 },
  { month: _monthLabel(4),  revenue: 55000000, orders: 1380, target: 48000000 },
  { month: _monthLabel(3),  revenue: 63000000, orders: 1580, target: 55000000 },
  // ── 최근 3개월 ──
  { month: _monthLabel(2),  revenue: 32000000, orders: 856,  target: 35000000 },
  { month: _monthLabel(1),  revenue: 28500000, orders: 742,  target: 35000000 },
  { month: _monthLabel(0),  revenue: 48250000, orders: 1284, target: 45000000 },
];

// ── 카테고리 도넛 차트 ────────────────────────────────────
export const MOCK_CATEGORY_DATA: CategoryDataPoint[] = [
  { name: '키보드', value: 34, color: '#5D5FEF' },
  { name: '마우스', value: 28, color: '#28A745' },
  { name: '허브/케이블', value: 18, color: '#FFC107' },
  { name: '모니터 암', value: 12, color: '#17A2B8' },
  { name: '기타', value: 8, color: '#DC3545' },
];

// ── 재고 부족 현황 ────────────────────────────────────────
export const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-001',
    productName: 'MX Keys S 키보드 (흑색)',
    sku: 'KB-MXS-BLK',
    category: '키보드',
    currentStock: 3,
    minStock: 20,
    incomingStock: 50,
    riskLevel: 'critical',
    unit: '개',
  },
  {
    id: 'inv-002',
    productName: 'G502 X Plus 마우스',
    sku: 'MS-G502-WHT',
    category: '마우스',
    currentStock: 8,
    minStock: 15,
    incomingStock: 30,
    riskLevel: 'critical',
    unit: '개',
  },
  {
    id: 'inv-003',
    productName: 'USB-C Hub 7-in-1',
    sku: 'HB-UC7-SLV',
    category: '허브/케이블',
    currentStock: 14,
    minStock: 25,
    incomingStock: 40,
    riskLevel: 'warning',
    unit: '개',
  },
  {
    id: 'inv-004',
    productName: 'MagSafe 충전 케이블',
    sku: 'CB-MAG-WHT',
    category: '허브/케이블',
    currentStock: 19,
    minStock: 30,
    incomingStock: 0,
    riskLevel: 'warning',
    unit: '개',
  },
  {
    id: 'inv-005',
    productName: '모니터 암 듀얼 (블랙)',
    sku: 'MA-DU-BLK',
    category: '모니터 암',
    currentStock: 22,
    minStock: 10,
    incomingStock: 0,
    riskLevel: 'low',
    unit: '개',
  },
  {
    id: 'inv-006',
    productName: 'Keychron Q1 Pro',
    sku: 'KB-KCQ1-GRY',
    category: '키보드',
    currentStock: 5,
    minStock: 20,
    incomingStock: 60,
    riskLevel: 'critical',
    unit: '개',
  },
];

// ── 알림 (스켈레톤/로딩 전용 초기값, 실제 운영에서는 DB 데이터 사용) ──
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id:         'notif-001',
    type:       'order',
    level:      'warning',
    title:      '미처리 주문 누적',
    message:    '미처리 주문 12건이 대기 중입니다.',
    link:       '/dashboard/orders',
    is_read:    false,
    created_at: _isoAt(0, 9, 45),
  },
  {
    id:         'notif-002',
    type:       'inventory',
    level:      'critical',
    title:      '재고 소진',
    message:    '[MX Keys S 키보드] 재고가 소진되었습니다.',
    link:       '/dashboard/products',
    is_read:    false,
    created_at: _isoAt(0, 9, 30),
  },
  {
    id:         'notif-003',
    type:       'inventory',
    level:      'warning',
    title:      '재고 부족 임박',
    message:    '[Keychron Q1 Pro] 재고가 5개 남았습니다.',
    link:       '/dashboard/products',
    is_read:    true,
    created_at: _isoAt(1, 22, 0),
  },
];

// ── 최근 주문 내역 ────────────────────────────────────────
export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'SO-2026-001284',
    customer: { name: '이철수', email: 'chulsoo@example.com', phone: '010-1234-5678', tier: 'VIP' },
    products: [
      { name: 'MX Keys S 키보드', sku: 'KB-MXS-BLK', quantity: 1, unitPrice: 139000 },
      { name: 'USB-C Hub 7-in-1', sku: 'HB-UC7-SLV', quantity: 1, unitPrice: 59000 },
    ],
    totalAmount: 198000,
    paymentMethod: 'card',
    orderStatus: 'order_confirmed', paymentStatus: 'payment_completed', shippingStatus: 'shipping_ready',
    createdAt: _isoAt(1, 9, 12),
    shippingAddress: '서울시 강남구 테헤란로 123',
  },
  {
    id: 'ord-002',
    orderNumber: 'SO-2026-001283',
    customer: { name: '박지영', email: 'jiyoung@example.com', phone: '010-9876-5432', tier: '일반' },
    products: [
      { name: 'G502 X Plus 마우스', sku: 'MS-G502-WHT', quantity: 2, unitPrice: 89000 },
    ],
    totalAmount: 178000,
    paymentMethod: 'kakao_pay',
    orderStatus: 'order_confirmed', paymentStatus: 'payment_completed', shippingStatus: 'shipping_in_progress',
    createdAt: _isoAt(2, 15, 30),
    shippingAddress: '경기도 성남시 분당구 판교로 456',
  },
  {
    id: 'ord-003',
    orderNumber: 'SO-2026-001282',
    customer: { name: '최민준', email: 'minjun@example.com', phone: '010-5555-1234', tier: 'Gold' },
    products: [
      { name: 'Keychron Q1 Pro', sku: 'KB-KCQ1-GRY', quantity: 1, unitPrice: 249000 },
      { name: '모니터 암 듀얼', sku: 'MA-DU-BLK', quantity: 1, unitPrice: 79000 },
    ],
    totalAmount: 328000,
    paymentMethod: 'bank_transfer',
    orderStatus: 'order_confirmed', paymentStatus: 'payment_completed', shippingStatus: 'shipping_ready',
    createdAt: _isoAt(2, 11, 0),
    shippingAddress: '부산시 해운대구 마린시티 789',
  },
  {
    id: 'ord-004',
    orderNumber: 'SO-2026-001281',
    customer: { name: '정수연', email: 'sooyeon@example.com', phone: '010-7777-8888', tier: '일반' },
    products: [
      { name: 'MagSafe 충전 케이블', sku: 'CB-MAG-WHT', quantity: 3, unitPrice: 39000 },
    ],
    totalAmount: 117000,
    paymentMethod: 'naver_pay',
    orderStatus: 'order_completed', paymentStatus: 'payment_completed', shippingStatus: 'shipping_completed',
    createdAt: _isoAt(3, 8, 45),
  },
  {
    id: 'ord-005',
    orderNumber: 'SO-2026-001280',
    customer: { name: '강동원', email: 'dongwon@example.com', phone: '010-2222-3333', tier: 'Silver' },
    products: [
      { name: 'MX Keys S 키보드', sku: 'KB-MXS-BLK', quantity: 1, unitPrice: 139000 },
    ],
    totalAmount: 139000,
    paymentMethod: 'card',
    orderStatus: 'order_cancelled', paymentStatus: 'payment_cancelled', shippingStatus: 'shipping_on_hold',
    createdAt: _isoAt(3, 7, 20),
  },
  {
    id: 'ord-006',
    orderNumber: 'SO-2026-001279',
    customer: { name: '한소희', email: 'sohee@example.com', phone: '010-4444-6666', tier: 'VIP' },
    products: [
      { name: 'USB-C Hub 7-in-1', sku: 'HB-UC7-SLV', quantity: 2, unitPrice: 59000 },
      { name: 'MagSafe 충전 케이블', sku: 'CB-MAG-WHT', quantity: 1, unitPrice: 39000 },
    ],
    totalAmount: 157000,
    paymentMethod: 'card',
    orderStatus: 'order_waiting', paymentStatus: 'payment_pending', shippingStatus: 'shipping_ready',
    createdAt: _isoAt(4, 20, 10),
  },
  {
    id: 'ord-007',
    orderNumber: 'SO-2026-001280',
    customer: { name: '한소희', email: 'sohee@example.com', phone: '010-4444-6666', tier: 'VIP' },
    products: [
      { name: 'MX Keys S 키보드', sku: 'KB-MXS-BLK', quantity: 1, unitPrice: 139000 },
    ],
    totalAmount: 139000,
    paymentMethod: 'card',
    orderStatus: 'order_cancelled', paymentStatus: 'payment_cancelled', shippingStatus: 'shipping_on_hold',
    createdAt: _isoAt(3, 7, 20),
  },
];
