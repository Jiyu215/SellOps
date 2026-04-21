/**
 * ProductDetailContent 유닛 테스트
 *
 * 이 컴포넌트는 ProductDetailForm을 isNew=false로 감싸는 얇은 래퍼입니다.
 * product prop이 ProductDetailForm에 올바르게 전달됨을 검증합니다.
 */

import { render, screen } from '@testing-library/react';
import { ProductDetailContent } from './ProductDetailContent';
import type { ProductDetail } from '@/types/products';

// ── 의존 모킹 ─────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('@/services/productDetailService', () => ({
  checkProductCode: jest.fn().mockResolvedValue({ available: true }),
  adjustStock:      jest.fn().mockResolvedValue({ total: 200, sold: 1580, available: 142 }),
  getStockHistory:  jest.fn().mockResolvedValue({ items: [], total: 0 }),
}));

jest.mock('@/app/actions/products', () => ({
  saveProductAction: jest.fn().mockResolvedValue({ id: 'prod-001' }),
}));

// ── 목 상품 데이터 ────────────────────────────────────────────────────────────

const MOCK_PRODUCT: ProductDetail = {
  id:               'prod-001',
  productCode:      'KB-MXS-BLK',
  name:             'MX Keys S 키보드 블랙',
  category:         '키보드',
  price:            139000,
  summary:          '요약 설명',
  shortDescription: '간단 설명',
  description:      '<p>상세 설명</p>',
  status:           'active',
  stock:            { total: 200, sold: 1580, available: 142 },
  images:           [],
  createdAt:        '2024-01-15T00:00:00.000Z',
  updatedAt:        '2024-01-25T00:00:00.000Z',
  createdBy:        '김운영',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductDetailContent', () => {
  test('컴포넌트가 에러 없이 렌더링된다', () => {
    expect(() =>
      render(<ProductDetailContent product={MOCK_PRODUCT} />),
    ).not.toThrow();
  });

  test('상품명이 표시된다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByText('MX Keys S 키보드 블랙')).toBeInTheDocument();
  });

  test('상품 ID가 저장 정보 섹션에 표시된다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByText('prod-001')).toBeInTheDocument();
  });

  test('수정 모드이므로 "새 상품 등록" 타이틀이 표시되지 않는다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.queryByText('새 상품 등록')).not.toBeInTheDocument();
  });

  test('기존 상품명이 입력 필드에 채워진다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByDisplayValue('MX Keys S 키보드 블랙')).toBeInTheDocument();
  });

  test('기존 상품코드가 입력 필드에 채워진다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByDisplayValue('KB-MXS-BLK')).toBeInTheDocument();
  });

  test('기존 가격이 입력 필드에 채워진다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByDisplayValue('139000')).toBeInTheDocument();
  });

  test('저장 정보 섹션(정보)이 표시된다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByText('정보')).toBeInTheDocument();
  });

  test('등록자 정보가 표시된다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByText('김운영')).toBeInTheDocument();
  });

  test('재고 관리 섹션이 표시된다', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.getByText('재고 관리')).toBeInTheDocument();
  });

  test('자동 코드 생성 버튼이 표시되지 않는다 (수정 모드)', () => {
    render(<ProductDetailContent product={MOCK_PRODUCT} />);
    expect(screen.queryByText(/코드 자동 생성/)).not.toBeInTheDocument();
  });
});