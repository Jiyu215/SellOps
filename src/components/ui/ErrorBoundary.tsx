'use client';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info); // 추후 logger 연동
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
