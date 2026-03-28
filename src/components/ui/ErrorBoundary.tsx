'use client';

import { Component, type ReactNode } from 'react';
import {
  WarningOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

// ── Props / State ─────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 정적 fallback UI — reset 기능 불필요 시 사용 */
  fallback?: ReactNode;
  /**
   * 동적 fallback UI — reset 콜백이 필요한 경우 사용
   * @example fallbackRender={(reset) => <ChartErrorFallback onReset={reset} />}
   */
  fallbackRender?: (reset: () => void) => ReactNode;
  /** 에러 발생 시 외부 리포팅 콜백 (Sentry 등 연동용) */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── 메인 Error Boundary 클래스 ────────────────────────────────────────────────

/**
 * 범용 Error Boundary
 *
 * 사용 패턴:
 * ```tsx
 * // 1. 정적 fallback
 * <ErrorBoundary fallback={<p>오류 발생</p>}>
 *   <SomeComponent />
 * </ErrorBoundary>
 *
 * // 2. 동적 fallback (reset 포함)
 * <ErrorBoundary fallbackRender={(reset) => <ChartErrorFallback onReset={reset} />}>
 *   <SomeChart />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      '[ErrorBoundary] 렌더링 오류:',
      error.message,
      '\n컴포넌트 스택:',
      info.componentStack,
    );
    this.props.onError?.(error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallbackRender) {
      return this.props.fallbackRender(this.handleReset);
    }
    return this.props.fallback ?? <DefaultErrorFallback onReset={this.handleReset} />;
  }
}

// ── 공통 재시도 버튼 ──────────────────────────────────────────────────────────

interface RetryButtonProps {
  onClick: () => void;
}

const RetryButton = ({ onClick }: RetryButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'inline-flex items-center gap-xs',
      'px-sm py-xs rounded-md mt-sm',
      'text-caption font-semibold',
      'bg-light-secondary dark:bg-dark-secondary',
      'text-light-textSecondary dark:text-dark-textSecondary',
      'hover:opacity-70 transition-opacity',
    ].join(' ')}
  >
    <ReloadOutlined aria-hidden="true" />
    다시 시도
  </button>
);

// ── 기본 fallback (소형 인라인 오류용) ───────────────────────────────────────

interface DefaultErrorFallbackProps {
  onReset: () => void;
}

const DefaultErrorFallback = ({ onReset }: DefaultErrorFallbackProps) => (
  <div
    className={[
      'flex h-40 items-center justify-center',
      'rounded-lg border border-light-border dark:border-dark-border',
      'bg-light-surface dark:bg-dark-surface',
    ].join(' ')}
  >
    <div className="flex flex-col items-center text-center">
      <WarningOutlined
        className="text-h3 text-light-warning dark:text-dark-warning mb-sm"
        aria-hidden="true"
      />
      <p className="text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary">
        오류가 발생했습니다.
      </p>
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
        잠시 후 다시 시도해주세요.
      </p>
      <RetryButton onClick={onReset} />
    </div>
  </div>
);

// ── 차트 전용 fallback ────────────────────────────────────────────────────────

export interface ChartErrorFallbackProps {
  /** 차트 제목 (헤더에 표시) */
  title?: string;
  /** ErrorBoundary 의 reset 콜백 */
  onReset: () => void;
}

/**
 * Recharts 차트 컴포넌트 오류 시 fallback
 * - 원본 차트 카드(section + shadow-md)와 동일한 외형 유지
 * - 차트 높이(h-56 sm:h-72)에 맞춘 최소 내부 높이
 */
export const ChartErrorFallback = ({ title, onReset }: ChartErrorFallbackProps) => (
  <section
    className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md h-full"
    aria-label={title ? `${title} 오류` : '차트 오류'}
  >
    {/* 카드 헤더 자리 — 원본과 높이 맞춤 */}
    {title && (
      <p className="text-h6 font-bold text-light-textPrimary dark:text-dark-textPrimary mb-md">
        {title}
      </p>
    )}

    <div className="flex flex-col items-center justify-center h-56 sm:h-64 text-center gap-xs">
      {/* 아이콘 배경 원 */}
      <div
        className={[
          'w-14 h-14 rounded-full mb-xs',
          'flex items-center justify-center',
          'bg-light-secondary dark:bg-dark-secondary',
        ].join(' ')}
      >
        <BarChartOutlined
          className="text-h3 text-light-textSecondary dark:text-dark-textSecondary"
          aria-hidden="true"
        />
      </div>

      <p className="text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary">
        차트를 불러올 수 없습니다.
      </p>
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
        데이터 형식 오류 또는 렌더링 오류가 발생했습니다.
      </p>
      <RetryButton onClick={onReset} />
    </div>
  </section>
);

// ── 테이블 / 목록 전용 fallback ───────────────────────────────────────────────

export interface TableErrorFallbackProps {
  /** 테이블 제목 (헤더에 표시) */
  title?: string;
  /** ErrorBoundary 의 reset 콜백 */
  onReset: () => void;
}

/**
 * 테이블·재고 목록 컴포넌트 오류 시 fallback
 * - 원본 카드(section + shadow-md)와 동일한 외형 유지
 * - 세로 중앙 정렬 + 충분한 상하 패딩
 */
export const TableErrorFallback = ({ title, onReset }: TableErrorFallbackProps) => (
  <section
    className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md h-full"
    aria-label={title ? `${title} 오류` : '데이터 오류'}
  >
    {/* 카드 헤더 자리 */}
    {title && (
      <p className="text-h6 font-bold text-light-textPrimary dark:text-dark-textPrimary mb-md">
        {title}
      </p>
    )}

    <div className="flex flex-col items-center justify-center py-14 text-center gap-xs">
      {/* 아이콘 배경 원 */}
      <div
        className={[
          'w-14 h-14 rounded-full mb-xs',
          'flex items-center justify-center',
          'bg-light-secondary dark:bg-dark-secondary',
        ].join(' ')}
      >
        <UnorderedListOutlined
          className="text-h3 text-light-textSecondary dark:text-dark-textSecondary"
          aria-hidden="true"
        />
      </div>

      <p className="text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary">
        데이터를 불러올 수 없습니다.
      </p>
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
        렌더링 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <RetryButton onClick={onReset} />
    </div>
  </section>
);
