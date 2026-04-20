import type { ProductListItem, ProductStatus } from '@/types/products';

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────────
const _now = new Date();

const _isoAt = (daysAgo: number, hour = 9, minute = 0): string => {
  const d = new Date(_now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ── 상품 생성 헬퍼 ────────────────────────────────────────────────────────────
let _id = 1;
const _make = (
  code: string,
  name: string,
  category: string,
  price: number,
  totalStock: number,
  availableStock: number,
  soldCount: number,
  status: ProductStatus,
  createdDaysAgo: number,
  updatedDaysAgo: number,
): ProductListItem => ({
  id:             `prod-${String(_id++).padStart(3, '0')}`,
  productCode:    code,
  name,
  category,
  price,
  totalStock,
  availableStock,
  soldCount,
  status,
  thumbnailUrl:   undefined,
  createdAt:      _isoAt(createdDaysAgo),
  updatedAt:      _isoAt(updatedDaysAgo),
});

// ── 목 데이터 (80개) ──────────────────────────────────────────────────────────
// 카테고리: 키보드(25), 마우스(20), 허브/케이블(20), 모니터 암(15)
// 상태: active(55), hidden(14), sold_out(11)

export const MOCK_PRODUCTS: ProductListItem[] = [
  // ── 키보드 ──────────────────────────────────────────────
  _make('KB-MXS-BLK', 'MX Keys S 키보드 블랙',           '키보드',     139000, 200, 142, 1580,  'active',   180, 10),
  _make('KB-MXS-WHT', 'MX Keys S 키보드 화이트',          '키보드',     139000, 150, 112, 1020,  'active',   178, 12),
  _make('KB-KCQ1-GRY', 'Keychron Q1 Pro 그레이',          '키보드',     249000, 80,  62,  450,   'active',   160, 8),
  _make('KB-KCQ1-BLK', 'Keychron Q1 Pro 블랙',            '키보드',     249000, 90,  75,  480,   'active',   158, 9),
  _make('KB-K8P-WHT',  'Keychron K8 Pro 화이트',           '키보드',     179000, 120, 98,  820,   'active',   155, 7),
  _make('KB-K8P-BLK',  'Keychron K8 Pro 블랙',             '키보드',     179000, 100, 82,  730,   'active',   153, 11),
  _make('KB-K3V2-WH',  'Keychron K3 V2 화이트',            '키보드',     129000, 60,  45,  380,   'active',   140, 15),
  _make('KB-K2P-BLK',  'Keychron K2 Pro 블랙',             '키보드',     169000, 70,  55,  420,   'active',   135, 14),
  _make('KB-HHKB-WH',  'HHKB Professional HYBRID 화이트', '키보드',     380000, 30,  18,  145,   'active',   120, 20),
  _make('KB-HHKB-BK',  'HHKB Professional HYBRID 블랙',   '키보드',     380000, 25,  12,  130,   'active',   118, 18),
  _make('KB-FC660-BK', 'Leopold FC660M 블랙',              '키보드',     149000, 40,  28,  210,   'active',   100, 25),
  _make('KB-FC750-WH', 'Leopold FC750R 화이트',            '키보드',     159000, 35,  22,  195,   'active',   98,  22),
  _make('KB-DUCK-BK',  'Ducky One 3 블랙',                 '키보드',     189000, 50,  38,  260,   'active',   95,  30),
  _make('KB-DUCK-WH',  'Ducky One 3 화이트',               '키보드',     189000, 45,  0,   285,   'sold_out', 93,  5),
  _make('KB-REAL-MID', 'Realforce R3S 텐키리스',           '키보드',     289000, 20,  14,  98,    'active',   88,  35),
  _make('KB-ANNE-BK',  'Anne Pro 2 블랙',                  '키보드',     119000, 0,   0,   450,   'sold_out', 85,  3),
  _make('KB-VARM-SIL', 'Varmilo MA87M 실버',               '키보드',     219000, 15,  8,   112,   'active',   80,  40),
  _make('KB-VARM-BLK', 'Varmilo MA87M 블랙',               '키보드',     219000, 18,  5,   108,   'hidden',   78,  45),
  _make('KB-MODE-SLT', 'Mode Envoy 슬레이트',              '키보드',     349000, 10,  7,   55,    'active',   75,  28),
  _make('KB-ZEAL-CLR', 'Zeal60 커스텀 클리어',             '키보드',     199000, 12,  3,   78,    'hidden',   72,  50),
  _make('KB-GMKN-GRN', 'GMK67 그린',                       '키보드',     99000,  55,  42,  320,   'active',   70,  16),
  _make('KB-GMKN-PNK', 'GMK67 핑크',                       '키보드',     99000,  48,  35,  298,   'active',   68,  17),
  _make('KB-KBDF-WHT', '키보드 팜레스트 우드 화이트',     '키보드',     49000,  100, 88,  540,   'active',   65,  20),
  _make('KB-WIRE-USB', '키보드 케이블 USB-C 꼬임',         '키보드',     29000,  200, 175, 850,   'active',   60,  12),
  _make('KB-TOPRE-45', 'Topre 45g 스위치 세트',            '키보드',     89000,  0,   0,   220,   'sold_out', 55,  2),

  // ── 마우스 ──────────────────────────────────────────────
  _make('MS-G502-BLK', 'Logitech G502 X Plus 블랙',       '마우스',     89000,  180, 145, 2100,  'active',   175, 8),
  _make('MS-G502-WHT', 'Logitech G502 X Plus 화이트',      '마우스',     89000,  120, 95,  1650,  'active',   173, 9),
  _make('MS-MXM-GRY',  'MX Master 3S 그래파이트',          '마우스',     129000, 150, 118, 1420,  'active',   170, 10),
  _make('MS-MXM-WHT',  'MX Master 3S 화이트',              '마우스',     129000, 130, 102, 1380,  'active',   168, 11),
  _make('MS-G304-BLK', 'Logitech G304 블랙',               '마우스',     49000,  250, 198, 3200,  'active',   165, 6),
  _make('MS-G304-WHT', 'Logitech G304 화이트',              '마우스',     49000,  220, 175, 2980,  'active',   162, 7),
  _make('MS-G903-BLK', 'Logitech G903 Hero 블랙',          '마우스',     159000, 60,  42,  520,   'active',   158, 15),
  _make('MS-RZER-VIP', 'Razer Viper V3 Pro',               '마우스',     189000, 80,  65,  680,   'active',   155, 12),
  _make('MS-RZER-DA',  'Razer DeathAdder V3',              '마우스',     99000,  100, 78,  890,   'active',   150, 14),
  _make('MS-FNAL-AIR', 'Finalmouse Starlight-12',          '마우스',     249000, 20,  0,   185,   'sold_out', 145, 4),
  _make('MS-ZOWI-SUP', 'Zowie EC2-C',                      '마우스',     89000,  70,  55,  420,   'active',   140, 18),
  _make('MS-ZOWI-FK',  'Zowie FK2-B',                      '마우스',     89000,  65,  48,  395,   'active',   138, 19),
  _make('MS-GLTS-ORX', 'Glorious Model O Wireless',        '마우스',     99000,  90,  72,  560,   'hidden',   135, 30),
  _make('MS-XTRFY-M8', 'Xtrfy M8 Wireless',               '마우스',     109000, 45,  6,   310,   'active',   130, 22),
  _make('MS-COOLER-MM', 'Cooler Master MM712',             '마우스',     69000,  110, 88,  720,   'active',   128, 16),
  _make('MS-ASUS-ROG',  'ASUS ROG Harpe Ace',              '마우스',     149000, 55,  40,  380,   'active',   125, 20),
  _make('MS-STEL-XM5',  'SteelSeries Aerox 5 Wireless',   '마우스',     139000, 40,  0,   290,   'sold_out', 120, 6),
  _make('MS-STEL-PRO',  'SteelSeries Prime Wireless',      '마우스',     119000, 50,  4,   340,   'hidden',   118, 55),
  _make('MS-HYP-PULSE', 'HyperX Pulsefire Haste 2',       '마우스',     79000,  80,  62,  480,   'active',   115, 18),
  _make('MS-NAGA-PRO',  'Razer Naga V2 Pro',               '마우스',     199000, 30,  22,  168,   'active',   110, 25),

  // ── 허브/케이블 ──────────────────────────────────────────
  _make('HB-UC7-SLV',  'USB-C Hub 7-in-1 실버',           '허브/케이블', 59000,  300, 242, 4200,  'active',   170, 7),
  _make('HB-UC7-BLK',  'USB-C Hub 7-in-1 블랙',           '허브/케이블', 59000,  280, 218, 3950,  'active',   168, 8),
  _make('HB-UC11-SLV', 'USB-C Hub 11-in-1 실버',          '허브/케이블', 89000,  200, 162, 2800,  'active',   165, 9),
  _make('HB-TB3-BLK',  'Thunderbolt 3 독 블랙',            '허브/케이블', 189000, 80,  58,  680,   'active',   160, 12),
  _make('HB-TB4-SLV',  'Thunderbolt 4 독 실버',            '허브/케이블', 229000, 60,  45,  520,   'active',   155, 14),
  _make('CB-MAG-WHT',  'MagSafe 충전 케이블 2m 화이트',   '허브/케이블', 39000,  500, 412, 6800,  'active',   150, 5),
  _make('CB-MAG-BLK',  'MagSafe 충전 케이블 2m 블랙',     '허브/케이블', 39000,  450, 378, 6200,  'active',   148, 6),
  _make('CB-USBC-BRD', 'USB-C 브레이드 케이블 1m',        '허브/케이블', 25000,  600, 525, 8500,  'active',   145, 4),
  _make('CB-USBC-2M',  'USB-C 케이블 2m 꼬임',            '허브/케이블', 29000,  400, 342, 5200,  'active',   140, 6),
  _make('CB-HDMI-4K',  'HDMI 4K 케이블 2m',               '허브/케이블', 19000,  800, 695, 12000, 'active',   138, 3),
  _make('CB-HDMI-8K',  'HDMI 8K 케이블 2m',               '허브/케이블', 35000,  200, 168, 1800,  'active',   135, 8),
  _make('CB-DP-4K',    'DisplayPort 4K 케이블 2m',         '허브/케이블', 29000,  300, 0,   2800,  'sold_out', 130, 2),
  _make('HB-KVM-4P',   'KVM 스위치 4포트',                 '허브/케이블', 79000,  100, 78,  820,   'active',   125, 15),
  _make('HB-KVM-2P',   'KVM 스위치 2포트',                 '허브/케이블', 49000,  150, 5,   1400,  'active',   122, 35),
  _make('CB-ETH-5M',   '기가비트 이더넷 케이블 5m',       '허브/케이블', 12000,  1000,875, 15000, 'active',   120, 2),
  _make('CB-ETH-10M',  '기가비트 이더넷 케이블 10m',      '허브/케이블', 18000,  500, 425, 7200,  'active',   118, 4),
  _make('HB-POW-6',    '전원 멀티탭 6구 화이트',           '허브/케이블', 45000,  200, 0,   2200,  'sold_out', 115, 1),
  _make('HB-POW-6B',   '전원 멀티탭 6구 블랙',             '허브/케이블', 45000,  180, 8,   1980,  'hidden',   112, 60),
  _make('CB-AUDIO-1M', '3.5mm 오디오 케이블 1m',          '허브/케이블', 9900,   800, 720, 9800,  'active',   110, 3),
  _make('CB-AUDIO-3M', '3.5mm 오디오 케이블 3m',          '허브/케이블', 14900,  600, 0,   7200,  'sold_out', 108, 1),

  // ── 모니터 암 ────────────────────────────────────────────
  _make('MA-DU-BLK',   '모니터 암 듀얼 블랙',              '모니터 암',  79000,  150, 118, 1420,  'active',   168, 10),
  _make('MA-DU-WHT',   '모니터 암 듀얼 화이트',             '모니터 암',  79000,  120, 92,  1280,  'active',   165, 11),
  _make('MA-SG-BLK',   '모니터 암 싱글 블랙',              '모니터 암',  49000,  200, 165, 2400,  'active',   160, 8),
  _make('MA-SG-WHT',   '모니터 암 싱글 화이트',             '모니터 암',  49000,  180, 148, 2200,  'active',   158, 9),
  _make('MA-ERGN-BLK', 'Ergotron LX 암 블랙',             '모니터 암',  159000, 80,  62,  680,   'active',   155, 12),
  _make('MA-ERGN-WHT', 'Ergotron LX 암 화이트',            '모니터 암',  159000, 70,  55,  620,   'active',   152, 13),
  _make('MA-ERGN-DU',  'Ergotron LX 듀얼 스택',            '모니터 암',  249000, 40,  28,  320,   'active',   148, 18),
  _make('MA-FLXN-DU',  'Flexispot F7L 듀얼',              '모니터 암',  89000,  100, 0,   980,   'sold_out', 145, 3),
  _make('MA-FLXN-SG',  'Flexispot F5 싱글',               '모니터 암',  59000,  120, 95,  1100,  'active',   140, 14),
  _make('MA-VIVO-DU',  'VIVO 듀얼 스크린 암',              '모니터 암',  69000,  90,  72,  850,   'active',   138, 12),
  _make('MA-VIVO-SG',  'VIVO 싱글 스크린 암',              '모니터 암',  39000,  150, 0,   1500,  'sold_out', 135, 2),
  _make('MA-DELL-SG',  'Dell MDA20 모니터 암',             '모니터 암',  99000,  60,  3,   580,   'hidden',   130, 65),
  _make('MA-GROM-MNT', 'Gromaxx 울트라와이드 암',          '모니터 암',  189000, 30,  22,  245,   'active',   125, 20),
  _make('MA-NBST-LAP', '노트북 스탠드 + 모니터 암 세트',  '모니터 암',  129000, 50,  38,  420,   'hidden',   120, 70),
  _make('MA-CBMG-CLM', '모니터 암 케이블 관리 클립 세트', '모니터 암',  15000,  500, 8,   4800,  'hidden',   118, 80),
];
