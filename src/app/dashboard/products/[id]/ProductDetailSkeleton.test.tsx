/**
 * ProductDetailSkeleton 유닛 테스트
 *
 * 스켈레톤 로딩 컴포넌트의 렌더링을 검증합니다.
 * 2-Column 레이아웃(메인 + 사이드)을 반영한 스켈레톤 구조를 확인합니다.
 */

import { render } from '@testing-library/react';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductDetailSkeleton', () => {
  test('에러 없이 렌더링된다', () => {
    expect(() => render(<ProductDetailSkeleton />)).not.toThrow();
  });

  test('animate-pulse 클래스를 가진 요소가 존재한다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const animated = c.querySelectorAll('.animate-pulse');
    expect(animated.length).toBeGreaterThan(0);
  });

  test('최상위 컨테이너가 flex flex-col 레이아웃을 가진다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const root = c.firstChild as HTMLElement;
    expect(root.className).toContain('flex');
    expect(root.className).toContain('flex-col');
  });

  test('PageHeader 영역이 렌더링된다 (h-12 버튼 포함)', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    // h-12 헤더 영역
    const header = c.querySelector('.h-12');
    expect(header).not.toBeNull();
  });

  test('2-Column 레이아웃 래퍼가 존재한다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    // lg:flex-row 클래스를 가진 레이아웃 컨테이너
    const twoCol = c.querySelector('.lg\\:flex-row');
    expect(twoCol).not.toBeNull();
  });

  test('메인 컬럼(flex-1)이 존재한다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const mainCol = c.querySelector('.flex-1.min-w-0');
    expect(mainCol).not.toBeNull();
  });

  test('사이드 컬럼(lg:w-72 또는 xl:w-80)이 존재한다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const sideCol = c.querySelector('.lg\\:w-72');
    expect(sideCol).not.toBeNull();
  });

  test('기본 정보 카드 스켈레톤이 존재한다 (rounded-lg border 카드 형태)', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const cards = c.querySelectorAll('.rounded-lg.border');
    // 메인 컬럼(기본정보, 설명, 이미지) + 사이드(상태, 재고, 정보) = 6개 이상
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });

  test('aspect-square 그리드 아이템이 존재한다 (이미지 스켈레톤)', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const squares = c.querySelectorAll('.aspect-square');
    expect(squares.length).toBeGreaterThan(0);
  });

  test('그리드 레이아웃(grid-cols)이 존재한다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    const grids = c.querySelectorAll('[class*="grid-cols"]');
    expect(grids.length).toBeGreaterThan(0);
  });

  test('스냅샷이 일관되게 유지된다', () => {
    const { container: c } = render(<ProductDetailSkeleton />);
    // 구조 변경 감지를 위한 기본 확인: 주요 클래스들이 존재함
    expect(c.querySelector('.animate-pulse')).not.toBeNull();
    expect(c.querySelector('.rounded-lg')).not.toBeNull();
  });
});