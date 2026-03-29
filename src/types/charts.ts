// ============================================================
// 차트 렌더링 전용 TypeScript 타입 정의
//
// - 이 파일의 타입은 /types/dashboard.ts 의 원시 데이터 타입을
//   차트 컴포넌트에서 사용할 수 있도록 확장한 것입니다.
// - 원시 데이터 타입(DailyDataPoint, SalesDataPoint 등)은
//   /types/dashboard.ts 에서 관리합니다.
// ============================================================

import type { DailyDataPoint, SalesDataPoint } from './dashboard';

// ── Enriched 데이터 타입 ──────────────────────────────────────────────────────

/**
 * 단기(주간) 차트용 — DailyDataPoint에 전일 대비 변화율과 오늘 여부를 추가
 * SalesShortTermChart 에서 useMemo로 생성
 */
export type EnrichedDailyPoint = DailyDataPoint & {
  /** 전일 대비 매출 변화율(%), 첫 번째 데이터 포인트는 null */
  changeRevenue: number | null;
  /** 전일 대비 주문 변화율(%), 첫 번째 데이터 포인트는 null */
  changeOrders: number | null;
  /** 마지막 데이터 포인트(오늘) 여부 — KPI 카드 값과 연동 */
  isToday: boolean;
};

/**
 * 장기(월간) 차트용 — SalesDataPoint에 전월 대비(MoM), 전년 동월 대비(YoY) 변화율을 추가
 * SalesComboChart 에서 useMemo로 생성
 */
export type EnrichedSalesPoint = SalesDataPoint & {
  /** 전월 대비 매출 변화율(%), 첫 번째 데이터 포인트는 null */
  mom: number | null;
  /** 전년 동월 대비 매출 변화율(%), 12개월 이전 데이터가 없으면 null */
  yoy: number | null;
};

// ── Recharts 커스텀 툴팁 공통 타입 ────────────────────────────────────────────

/**
 * Recharts 커스텀 툴팁 payload 개별 항목
 * payload 타입을 제네릭으로 확장해 각 차트의 enriched 타입과 연결
 *
 * @example
 * // 단기 차트 툴팁
 * ChartTooltipEntry<EnrichedDailyPoint>
 * // 장기 차트 툴팁
 * ChartTooltipEntry<EnrichedSalesPoint>
 */
export interface ChartTooltipEntry<T> {
  name: string;
  value: number;
  color: string;
  payload: T;
}

/**
 * Recharts content prop에 전달하는 커스텀 툴팁 컴포넌트 공통 Props
 * ShortTermTooltip, LongTermTooltip 등 모든 커스텀 툴팁에 사용
 *
 * @example
 * const ShortTermTooltip = ({ active, payload, label }: ChartTooltipProps<EnrichedDailyPoint>) => { ... }
 */
export interface ChartTooltipProps<T> {
  active?: boolean;
  payload?: ChartTooltipEntry<T>[];
  label?: string;
}

// ── SalesComboChart 전용 ──────────────────────────────────────────────────────

/**
 * 콤보 차트 표시 기간 선택 (월 단위)
 * 기간 필터 버튼 [6개월] [12개월] 과 연동
 */
export type ChartPeriod = 6 | 12;

/**
 * 콤보 차트에서 막대 클릭 시 선택된 월의 상세 정보
 * fullIndex: enrichedAll 배열 기준 절대 인덱스 (기간 전환 후에도 동일 월 추적)
 */
export interface SelectedMonthDetail {
  fullIndex: number;
  point: EnrichedSalesPoint;
}
