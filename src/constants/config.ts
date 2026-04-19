// ============================================================
// 애플리케이션 공통 설정 상수
//
// 사용 기준:
//   - 여러 컴포넌트에서 공유하거나, 한 곳에서 변경하면 전체에 반영되어야 할 값
//   - Tailwind className 내 arbitrary value([#hex])는 스타일링 영역으로 제외
//   - Recharts dot radius, margin, axis width 등 차트 렌더링 세부 수치는 제외
// ============================================================

// ── 검색 ──────────────────────────────────────────────────────────────────────

/** 주문 검색 입력 디바운스 지연 시간 (ms) */
export const SEARCH_DEBOUNCE_DELAY_MS = 300;

/**
 * 주문 목록 페이지당 표시 건수 — 화면 크기별 분리
 *
 * PC (≥1280px)     : 50행 — 충분한 화면 폭으로 전체 컬럼 + 많은 행 표시
 * 태블릿 (768~1279px): 30행 — 결제방식 컬럼 숨김, 적당한 밀도 유지
 * 모바일 (≤767px)   : 15행 — 카드형 표시, 스크롤 피로 최소화
 */
export const ORDER_PAGE_SIZE_PC      = 50;
export const ORDER_PAGE_SIZE_TABLET  = 30;
export const ORDER_PAGE_SIZE_MOBILE  = 15;

// ── 애니메이션 ────────────────────────────────────────────────────────────────

/**
 * 프로그레스바 진입 애니메이션 시작 지연 (ms)
 * 마운트 직후 0 → target 트랜지션을 위해 한 프레임 대기
 * KPICard, TopProductsCard 공통 사용
 */
export const PROGRESS_ANIMATION_DELAY_MS = 120;

/** KPI 카드 달성률 프로그레스바 CSS transition */
export const KPI_PROGRESS_TRANSITION = 'width 0.9s ease-out';

/** 인기 상품 상대 매출 프로그레스바 CSS transition */
export const BAR_PROGRESS_TRANSITION = 'width 0.8s ease-out';

// ── 차트 ──────────────────────────────────────────────────────────────────────

/**
 * 단기 추이 차트 이상치 임계값 (%)
 * 전일 대비 변화율이 ±이 값을 초과하면 강조 점(GROWTH/DROP)으로 표시
 */
export const CHART_ANOMALY_THRESHOLD = 20;

/**
 * 월간 매출 콤보 차트 기간 필터 옵션 (월 단위)
 * [6개월] [12개월] 버튼과 연동
 */
export const CHART_PERIOD_OPTIONS = [6, 12] as const;

// ── 브랜드 컬러 (JS/SVG 컨텍스트 전용) ───────────────────────────────────────
//
// Recharts stroke/fill prop, style={{ color }}, CustomerAvatar 팔레트 등
// JS 코드에서 직접 hex 문자열이 필요한 경우에만 사용.
// Tailwind 클래스(bg-light-primary, text-light-success 등)로 처리 가능한
// 경우에는 Tailwind 토큰을 우선 사용할 것.

/** Primary — Tailwind light.primary / dark.primary */
export const COLOR_PRIMARY = '#5D5FEF';

/** Success — Tailwind light.success / dark.success */
export const COLOR_SUCCESS = '#28A745';

/** Info — Tailwind light.info / dark.info */
export const COLOR_INFO = '#17A2B8';

/** Warning — Tailwind light.warning / dark.warning */
export const COLOR_WARNING = '#FFC107';

/** Error — Tailwind light.error / dark.error */
export const COLOR_ERROR = '#DC3545';

/** 차트 축 tick 및 보조 텍스트 hex (Tailwind light.textSecondary 대응) */
export const COLOR_TEXT_SECONDARY_HEX = '#666666';

/** 아바타 팔레트 보완 색상 (primary~error 외 추가 팔레트용) */
export const COLOR_PURPLE = '#6f42c1';

// ── 카테고리 색상 ─────────────────────────────────────────────────────────────

/**
 * 제품 카테고리별 고정 hex 색상
 * 차트 범례, 썸네일 배경, 인디케이터 점에 공통 사용
 * (TopProductsCard, LowStockTable, CategoryDoughnutChart mockData)
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '키보드':     COLOR_PRIMARY,
  '마우스':     COLOR_SUCCESS,
  '허브/케이블': COLOR_WARNING,
  '모니터 암':  COLOR_INFO,
};
