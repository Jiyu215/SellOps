import type { ProductDetail, StockHistory } from '@/types/products';

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────────
const _now  = new Date();
const _isoAt = (daysAgo: number, hour = 9, minute = 0): string => {
  const d = new Date(_now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ── 목 상품 상세 데이터 ──────────────────────────────────────────────────────

export const MOCK_PRODUCT_DETAIL: ProductDetail = {
  id:               'prod-001',
  productCode:      'KB-MXS-BLK',
  name:             'MX Keys S 키보드 블랙',
  category:         '키보드',
  price:            139000,
  summary:          '로지텍 MX Keys S 풀사이즈 멀티 디바이스 키보드 블랙 색상입니다.',
  shortDescription: '스마트 백라이트와 멀티 OS 지원을 갖춘 프리미엄 키보드. 최대 3대 기기 동시 연결 가능.',
  description:      '<h2>MX Keys S 키보드</h2><p>인체공학적 구형 키캡 디자인으로 편안한 타이핑 경험을 제공합니다.</p><ul><li>Easy-Switch 버튼으로 최대 3대 기기 전환</li><li>스마트 백라이트 — 손 감지 자동 조명</li><li>Logi Bolt USB, Bluetooth 연결 지원</li><li>Windows / macOS / Linux / Android / iOS 호환</li></ul>',
  status:           'active',
  stock: {
    total:     200,
    sold:      1580,
    available: 142,
  },
  images: [
    {
      id:        'img-001',
      type:      'main',
      url:       '',
      fileName:  'mx-keys-s-black-main.jpg',
      fileSize:  1_234_567,
      createdAt: _isoAt(180),
    },
    {
      id:        'img-002',
      type:      'list',
      url:       '',
      fileName:  'mx-keys-s-black-list.jpg',
      fileSize:  456_789,
      createdAt: _isoAt(180),
    },
  ],
  createdAt: _isoAt(180),
  updatedAt: _isoAt(10),
  createdBy: '김운영',
};

// ── 목 재고 이력 ──────────────────────────────────────────────────────────────

export const MOCK_STOCK_HISTORY: StockHistory[] = [
  { id: 'sh-001', productId: 'prod-001', type: 'in',  quantity: 100, reason: '초기 입고',       operator: '김운영', createdAt: _isoAt(180, 14, 30) },
  { id: 'sh-002', productId: 'prod-002', type: 'in',  quantity: 50,  reason: '추가 발주',       operator: '이운영', createdAt: _isoAt(120, 10, 0)  },
  { id: 'sh-003', productId: 'prod-003', type: 'out', quantity: 8,   reason: '파손 처리',       operator: '이운영', createdAt: _isoAt(90, 15, 0)   },
  { id: 'sh-004', productId: 'prod-004', type: 'in',  quantity: 60,  reason: '재고 보충',       operator: '김운영', createdAt: _isoAt(60, 9, 0)    },
  { id: 'sh-005', productId: 'prod-005', type: 'out', quantity: 3,   reason: '샘플 출고',       operator: '박운영', createdAt: _isoAt(45, 11, 30)  },
  { id: 'sh-006', productId: 'prod-006', type: 'in',  quantity: 40,  reason: '추가 입고',       operator: '김운영', createdAt: _isoAt(30, 14, 0)   },
  { id: 'sh-007', productId: 'prod-007', type: 'out', quantity: 5,   reason: '불량 반품 처리',  operator: '이운영', createdAt: _isoAt(15, 10, 0)   },
  { id: 'sh-008', productId: 'prod-008', type: 'in',  quantity: 20,  reason: '긴급 입고',       operator: '김운영', createdAt: _isoAt(10, 16, 0)   },
];

// ── Map (서비스 조회용) ───────────────────────────────────────────────────────

export const MOCK_PRODUCT_DETAIL_MAP: Map<string, ProductDetail> = new Map(
  [MOCK_PRODUCT_DETAIL].map((p) => [p.id, p]),
);
