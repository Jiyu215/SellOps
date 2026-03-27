'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { KPICardData, KPIStatus } from '@/types/dashboard';

interface KPICardProps {
  data: KPICardData;
}

// 상태별 스타일 매핑
const STATUS_STYLES: Record<KPIStatus, {
  border: string;
  progressBar: string;
  icon: React.ReactNode;
  iconBg: string;
  statusTextColor: string; // 달성률 텍스트 색상 (dark 모드 클래스 포함)
}> = {
  success: {
    border: 'border-l-4 border-l-light-success dark:border-l-dark-success',
    progressBar: 'bg-light-success dark:bg-dark-success',
    icon: <CheckCircleOutlined />,
    iconBg: 'bg-green-100 dark:bg-green-900/30 text-light-success dark:text-dark-success',
    statusTextColor: 'text-light-success dark:text-dark-success',
  },
  warning: {
    border: 'border-l-4 border-l-light-warning dark:border-l-dark-warning',
    progressBar: 'bg-light-warning dark:bg-dark-warning',
    icon: <WarningOutlined />,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-light-warning dark:text-dark-warning',
    statusTextColor: 'text-light-warning dark:text-dark-warning',
  },
  critical: {
    border: 'border-l-4 border-l-light-error dark:border-l-dark-error',
    progressBar: 'bg-light-error dark:bg-dark-error',
    icon: <ExclamationCircleOutlined />,
    iconBg: 'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error',
    statusTextColor: 'text-light-error dark:text-dark-error',
  },
  info: {
    border: 'border-l-4 border-l-light-info dark:border-l-dark-info',
    progressBar: 'bg-light-info dark:bg-dark-info',
    icon: <InfoCircleOutlined />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-light-info dark:text-dark-info',
    statusTextColor: 'text-light-info dark:text-dark-info',
  },
};

/**
 * KPI 카드 컴포넌트
 * - 상단: 상태 아이콘(좌) + 변동률 뱃지(우)
 * - 중단: 주요 수치 (대형 폰트)
 * - 하단: 목표 달성 프로그레스바 + 달성률 텍스트
 * - Critical 카드: 우상단 CRITICAL pulse 뱃지, 테두리 강조
 */
export const KPICard = ({ data }: KPICardProps) => {
  const style = STATUS_STYLES[data.status];
  const isPositiveChange = (data.change ?? 0) >= 0;
  const clampedProgress = Math.min(data.progressPercent ?? 0, 100);

  // 프로그레스바 로드 애니메이션: 마운트 후 목표값으로 트랜지션
  const [progressWidth, setProgressWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setProgressWidth(clampedProgress), 120);
    return () => clearTimeout(timer);
  }, [clampedProgress]);

  return (
    <article
      className={[
        'relative bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-md',
        style.border,
        'flex flex-col gap-sm',
      ].join(' ')}
      aria-label={`${data.title}: ${data.value}${data.unit ?? ''}`}
    >
      {/* CRITICAL 뱃지 (우상단 절대 위치, pulse 애니메이션) */}
      {data.status === 'critical' && (
        <span className="absolute -top-2 -right-2 flex items-center gap-xs bg-light-error dark:bg-dark-error text-white text-overline font-bold px-xs py-xs rounded-sm shadow-sm animate-pulse z-10">
          CRITICAL
        </span>
      )}

      {/* 상단: 상태 아이콘(좌) + 변동률 뱃지(우) */}
      <div className="flex items-start justify-between">
        <span
          className={`w-9 h-9 rounded-md flex items-center justify-center text-bodyLg flex-shrink-0 ${style.iconBg}`}
          aria-hidden="true"
        >
          {style.icon}
        </span>

        {data.change !== undefined && (
          <span
            className={[
              'inline-flex items-center gap-xs text-caption font-semibold px-xs py-xs rounded-sm',
              isPositiveChange
                ? 'bg-green-100 dark:bg-green-900/30 text-light-success dark:text-dark-success'
                : 'bg-red-100 dark:bg-red-900/30 text-light-error dark:text-dark-error',
            ].join(' ')}
          >
            {isPositiveChange
              ? <ArrowUpOutlined aria-hidden="true" />
              : <ArrowDownOutlined aria-hidden="true" />
            }
            {Math.abs(data.change)}%
          </span>
        )}
      </div>

      {/* 중단: 주요 수치 */}
      <div>
        <h3 className="text-caption font-medium text-light-textSecondary dark:text-dark-textSecondary mb-xs">
          {data.title}
        </h3>
        <div className="flex items-baseline gap-xs">
          <span className="text-h3 font-bold text-light-textPrimary dark:text-dark-textPrimary leading-none">
            {data.value}
          </span>
          {data.unit && (
            <span className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary">
              {data.unit}
            </span>
          )}
        </div>
      </div>

      {/* 하단: 목표 대비 프로그레스바 + 달성률 텍스트 */}
      {data.progressPercent !== undefined && (
        <div className="mt-auto">
          <div
            className="w-full h-1.5 rounded-full bg-light-secondary dark:bg-dark-secondary overflow-hidden"
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full ${style.progressBar}`}
              style={{
                width: `${progressWidth}%`,
                transition: 'width 0.9s ease-out',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-xs">
            <span className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
              목표 달성률
            </span>
            <span className={`text-caption font-semibold ${style.statusTextColor}`}>
              {data.progressPercent}%
            </span>
          </div>
        </div>
      )}
    </article>
  );
};
